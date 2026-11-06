/**
 * Contrato de comportamiento: lo debe cumplir CUALQUIER adaptador de DataApi
 * (mock hoy, Supabase mañana). Asume los usuarios sembrados:
 *   admin@gym.local / admin123 · recep@gym.local / recep123
 *   (recepción: members.read/write, memberships.write, payments.create)
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, membershipEnd, todayISO } from '../dates'
import { AppError } from './types'
import type { DataApi, Plan } from './types'

const ADMIN = ['admin@gym.local', 'admin123'] as const
const RECEP = ['recep@gym.local', 'recep123'] as const

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return e instanceof AppError ? e.code : `otro:${String(e)}`
  }
  return 'sin-error'
}

export function runDataApiContract(name: string, factory: () => DataApi) {
  describe(`contrato DataApi · ${name}`, () => {
    let api: DataApi
    let mensual: Plan
    beforeEach(async () => {
      api = factory()
      await api.auth.signIn(...ADMIN)
      mensual = (await api.plans.list()).find((p) => p.name === 'Mensual')!
    })

    const newMember = (ci = '1234567', name = 'Ana Pérez') =>
      api.members.create({ fullName: name, ci, phone: '70011223' })

    describe('sesión y permisos', () => {
      it('sin sesión nada funciona', async () => {
        await api.auth.signOut()
        expect(await code(api.members.list())).toBe('unauthenticated')
        expect(await api.auth.currentUser()).toBeNull()
      })
      it('credenciales incorrectas', async () => {
        expect(await code(api.auth.signIn('admin@gym.local', 'x'))).toBe('unauthenticated')
      })
      it('recepción no gestiona planes ni anula pagos ni ve reportes ni movimientos', async () => {
        const m = await newMember()
        const pay = await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'cash' })
        await api.auth.signIn(...RECEP)
        expect(await code(api.plans.create({ name: 'X', durationDays: 5, priceCents: 100 }))).toBe('forbidden')
        expect(await code(api.payments.void(pay.id, 'error'))).toBe('forbidden')
        expect(await code(api.reports.summary({}))).toBe('forbidden')
        expect(await code(api.reports.ledger({}))).toBe('forbidden')
        expect(await code(api.movements.list())).toBe('forbidden')
      })
      it('recepción sí registra socios y cobra', async () => {
        await api.auth.signIn(...RECEP)
        const m = await newMember('999')
        const p = await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'qr' })
        expect(p.receiptNo).toBeGreaterThan(0)
      })
      it('dashboard oculta finanzas sin reports.view', async () => {
        await api.auth.signIn(...RECEP)
        expect((await api.dashboard.get()).finance).toBeNull()
        await api.auth.signIn(...ADMIN)
        expect((await api.dashboard.get()).finance).not.toBeNull()
      })
    })

    describe('socios', () => {
      it('CI único', async () => {
        await newMember('111')
        expect(await code(newMember('111', 'Otro'))).toBe('conflict')
      })
      it('campos obligatorios', async () => {
        expect(await code(api.members.create({ fullName: ' ', ci: '1', phone: '1' }))).toBe('invalid')
      })
      it('búsqueda por nombre (sin tildes), CI y teléfono', async () => {
        await newMember('111', 'José Núñez')
        await newMember('222', 'María Rojas')
        expect((await api.members.list({ search: 'jose' })).total).toBe(1)
        expect((await api.members.list({ search: '222' })).items[0].fullName).toBe('María Rojas')
        expect((await api.members.list({ search: '70011223' })).total).toBe(2)
      })
      it('paginación', async () => {
        for (let i = 0; i < 5; i++) await newMember(String(i))
        const p = await api.members.list({ page: 2, pageSize: 2 })
        expect(p.items).toHaveLength(2)
        expect(p.total).toBe(5)
      })
      it('la lista trae la membresía vigente, su estado y el saldo', async () => {
        const sin = await newMember('1', 'Sin membresía')
        const vencida = await newMember('2', 'Vencida')
        const parcial = await newMember('3', 'Parcial')
        const t = todayISO()
        await api.payments.sell({ memberId: vencida.id, planId: mensual.id, startDate: addDays(t, -40), paidCents: 15000, method: 'cash' })
        await api.payments.sell({ memberId: parcial.id, planId: mensual.id, startDate: t, paidCents: 5000, method: 'cash' })
        const byId = Object.fromEntries((await api.members.list()).items.map((m) => [m.id, m]))
        expect(byId[sin.id].current).toBeNull()
        expect(byId[vencida.id].current).toMatchObject({ state: 'expired', dueCents: 0, planName: 'Mensual' })
        expect(byId[parcial.id].current).toMatchObject({ state: 'active', dueCents: 10000, endDate: membershipEnd(t, 30) })
      })
      it('filtra por estado del socio', async () => {
        const a = await newMember('1', 'Activo')
        const b = await newMember('2', 'Suspendido')
        await api.members.update(b.id, { status: 'suspended' })
        expect((await api.members.list({ status: 'suspended' })).items.map((m) => m.id)).toEqual([b.id])
        expect((await api.members.list()).items.map((m) => m.id).sort()).toEqual([a.id, b.id].sort())
      })
      it('archivar y restaurar conserva el historial', async () => {
        const m = await newMember()
        await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'cash' })
        await api.members.update(m.id, { status: 'archived' })
        expect((await api.members.list()).total).toBe(0)
        await api.members.update(m.id, { status: 'active' })
        expect((await api.members.list()).total).toBe(1)
        expect(await api.memberships.listForMember(m.id)).toHaveLength(1)
        expect(await api.payments.listForMember(m.id)).toHaveLength(1)
      })
      it('archivados no aparecen salvo que se filtren', async () => {
        const m = await newMember()
        await api.members.update(m.id, { status: 'archived' })
        expect((await api.members.list()).total).toBe(0)
        expect((await api.members.list({ status: 'archived' })).total).toBe(1)
      })
    })

    describe('membresías y pagos', () => {
      it('venta: fin = inicio + duración − 1, precio congelado, recibo, saldo 0', async () => {
        const m = await newMember()
        const start = todayISO()
        const pay = await api.payments.sell({
          memberId: m.id, planId: mensual.id, startDate: start, paidCents: 15000, method: 'cash',
        })
        const [ms] = await api.memberships.listForMember(m.id)
        expect(ms.endDate).toBe(membershipEnd(start, 30))
        expect(ms.priceCents).toBe(15000)
        expect(ms.paidCents).toBe(15000)
        expect(ms.dueCents).toBe(0)
        expect(pay.status).toBe('confirmed')
      })
      it('cambiar el precio del plan no altera membresías existentes', async () => {
        const m = await newMember()
        await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'cash' })
        await api.plans.update(mensual.id, { priceCents: 20000 })
        const [ms] = await api.memberships.listForMember(m.id)
        expect(ms.priceCents).toBe(15000)
      })
      it('recibos correlativos', async () => {
        const a = await newMember('1')
        const b = await newMember('2')
        const p1 = await api.payments.sell({ memberId: a.id, planId: mensual.id, paidCents: 100, method: 'cash' })
        const p2 = await api.payments.sell({ memberId: b.id, planId: mensual.id, paidCents: 100, method: 'cash' })
        expect(p2.receiptNo).toBe(p1.receiptNo + 1)
      })
      it('descuento reduce el saldo y no puede superar el precio', async () => {
        const m = await newMember()
        await api.payments.sell({ memberId: m.id, planId: mensual.id, discountCents: 3000, paidCents: 12000, method: 'cash' })
        expect((await api.memberships.listForMember(m.id))[0].dueCents).toBe(0)
        expect(await code(api.memberships.create({ memberId: m.id, planId: mensual.id, discountCents: 99999 }))).toBe('invalid')
      })
      it('pagos parciales y bloqueo de sobrepago', async () => {
        const m = await newMember()
        await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 5000, method: 'cash' })
        const [ms] = await api.memberships.listForMember(m.id)
        expect(ms.dueCents).toBe(10000)
        expect(await code(api.payments.register({ membershipId: ms.id, amountCents: 10001, method: 'cash' }))).toBe('invalid')
        await api.payments.register({ membershipId: ms.id, amountCents: 10000, method: 'transfer' })
        expect((await api.memberships.listForMember(m.id))[0].dueCents).toBe(0)
        expect(await code(api.payments.register({ membershipId: ms.id, amountCents: 1, method: 'cash' }))).toBe('invalid')
      })
      it('importes inválidos', async () => {
        const m = await newMember()
        for (const bad of [0, -5, 10.5]) {
          expect(await code(api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: bad, method: 'cash' }))).toBe('invalid')
        }
      })
      it('la venta es atómica: si el pago falla no queda membresía', async () => {
        const m = await newMember()
        await code(api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 999999, method: 'cash' }))
        expect(await api.memberships.listForMember(m.id)).toHaveLength(0)
      })
      it('renovar empieza el día siguiente al vencimiento', async () => {
        const m = await newMember()
        const start = todayISO()
        await api.payments.sell({ memberId: m.id, planId: mensual.id, startDate: start, paidCents: 15000, method: 'cash' })
        const renewed = await api.memberships.create({ memberId: m.id, planId: mensual.id })
        expect(renewed.startDate).toBe(addDays(membershipEnd(start, 30), 1))
      })
      it('anular: exige motivo, libera saldo, excluye del resumen, no se repite', async () => {
        const m = await newMember()
        const pay = await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'cash' })
        expect(await code(api.payments.void(pay.id, '  '))).toBe('invalid')
        await api.payments.void(pay.id, 'cobro duplicado')
        expect((await api.memberships.listForMember(m.id))[0].dueCents).toBe(15000)
        expect((await api.reports.summary({})).incomeCents).toBe(0)
        expect(await code(api.payments.void(pay.id, 'otra vez'))).toBe('conflict')
        const [stored] = await api.payments.listForMember(m.id)
        expect(stored.status).toBe('voided')
        expect(stored.voidReason).toBe('cobro duplicado')
      })
    })

    describe('vencimientos', () => {
      it('vencida y por vencer', async () => {
        const a = await newMember('1', 'Vencida')
        const b = await newMember('2', 'Por vencer')
        const c = await newMember('3', 'Vigente')
        const t = todayISO()
        await api.payments.sell({ memberId: a.id, planId: mensual.id, startDate: addDays(t, -40), paidCents: 100, method: 'cash' })
        await api.payments.sell({ memberId: b.id, planId: mensual.id, startDate: addDays(t, -25), paidCents: 100, method: 'cash' })
        await api.payments.sell({ memberId: c.id, planId: mensual.id, startDate: t, paidCents: 100, method: 'cash' })
        expect((await api.memberships.listByState('expired')).map((x) => x.memberName)).toEqual(['Vencida'])
        expect((await api.memberships.listByState('expired'))[0].memberPhone).toBe(a.phone)
        expect((await api.memberships.listByState('expiring')).map((x) => x.memberName)).toEqual(['Por vencer'])
        const d = await api.dashboard.get()
        expect([d.totalMembers, d.activeMembers, d.expiringMembers, d.expiredMembers]).toEqual([3, 2, 1, 1])
        expect(d.recentPayments).toHaveLength(3)
        expect(d.recentPayments[0].memberName).toBe('Vigente') // el más reciente primero
        expect(d.finance?.today.paymentsCents).toBe(300)
      })
      it('renovar saca al socio de vencidos', async () => {
        const a = await newMember()
        await api.payments.sell({ memberId: a.id, planId: mensual.id, startDate: addDays(todayISO(), -60), paidCents: 100, method: 'cash' })
        expect(await api.memberships.listByState('expired')).toHaveLength(1)
        await api.memberships.create({ memberId: a.id, planId: mensual.id, startDate: todayISO() })
        expect(await api.memberships.listByState('expired')).toHaveLength(0)
      })
    })

    describe('ingresos, egresos y balance', () => {
      it('categoría debe coincidir con el tipo', async () => {
        const [inc] = await api.categories.list('income')
        expect(await code(api.movements.register({
          type: 'expense', categoryId: inc.id, description: 'x', amountCents: 100, method: 'cash',
        }))).toBe('invalid')
      })
      it('balance = pagos + otros ingresos − egresos, sin anulados', async () => {
        const m = await newMember()
        await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'cash' })
        const [inc] = await api.categories.list('income')
        const [exp] = await api.categories.list('expense')
        await api.movements.register({ type: 'income', categoryId: inc.id, description: 'Agua', amountCents: 2000, method: 'qr' })
        const gasto = await api.movements.register({ type: 'expense', categoryId: exp.id, description: 'Luz', amountCents: 4500, method: 'transfer' })
        const anulado = await api.movements.register({ type: 'expense', categoryId: exp.id, description: 'Error', amountCents: 9999, method: 'cash' })
        await api.movements.void(anulado.id, 'mal registrado')

        const s = await api.reports.summary({})
        expect(s.paymentsCents).toBe(15000)
        expect(s.otherIncomeCents).toBe(2000)
        expect(s.incomeCents).toBe(17000)
        expect(s.expenseCents).toBe(4500)
        expect(s.balanceCents).toBe(12500)
        expect(s.incomeByMethod).toEqual({ cash: 15000, transfer: 0, qr: 2000 })

        const led = await api.reports.ledger({})
        expect(led.map((e) => e.kind).sort()).toEqual(['expense', 'income', 'payment'])
        expect(led.find((e) => e.kind === 'payment')?.description).toContain('Recibo #')
        expect(led.reduce((n, e) => n + (e.kind === 'expense' ? -e.amountCents : e.amountCents), 0)).toBe(s.balanceCents)

        expect(await code(api.movements.void(gasto.id, ''))).toBe('invalid')
        expect(await code(api.movements.void(anulado.id, 'otra'))).toBe('conflict')
      })
      it('filtros por fecha, tipo y categoría', async () => {
        const [exp] = await api.categories.list('expense')
        const t = todayISO()
        await api.movements.register({ type: 'expense', categoryId: exp.id, description: 'a', amountCents: 100, method: 'cash', occurredOn: addDays(t, -10) })
        await api.movements.register({ type: 'expense', categoryId: exp.id, description: 'b', amountCents: 100, method: 'cash', occurredOn: t })
        expect((await api.movements.list({ from: addDays(t, -1) })).total).toBe(1)
        expect((await api.movements.list({ type: 'income' })).total).toBe(0)
        expect((await api.movements.list({ categoryId: exp.id })).total).toBe(2)
        expect((await api.reports.summary({ from: addDays(t, -1), to: t })).expenseCents).toBe(100)
      })
      it('categorías: solo admin crea y no se duplican', async () => {
        await api.categories.create({ type: 'expense', name: 'Limpieza' })
        expect(await code(api.categories.create({ type: 'expense', name: 'limpieza' }))).toBe('conflict')
        await api.auth.signIn(...RECEP)
        expect(await code(api.categories.create({ type: 'expense', name: 'Otra' }))).toBe('forbidden')
        expect(await code(api.categories.update('x', { name: 'Otra' }))).toBe('forbidden')
      })
      it('categorías: renombrar, desactivar y reactivar sin borrar', async () => {
        const c = await api.categories.create({ type: 'expense', name: 'Limpieza' })
        expect((await api.categories.update(c.id, { name: 'Aseo' })).name).toBe('Aseo')
        expect(await code(api.categories.update(c.id, { name: 'alquiler' }))).toBe('conflict')
        await api.categories.update(c.id, { active: false })
        expect((await api.categories.list('expense')).some((x) => x.id === c.id)).toBe(false)
        expect((await api.categories.list('expense', { includeInactive: true })).some((x) => x.id === c.id)).toBe(true)
        expect(await code(api.movements.register({ type: 'expense', categoryId: c.id, description: 'x', amountCents: 100, method: 'cash' }))).toBe('invalid')
        await api.categories.update(c.id, { active: true })
        expect((await api.categories.list('expense')).some((x) => x.id === c.id)).toBe(true)
      })
    })

    describe('ajustes y personal', () => {
      it('datos del gimnasio: todos leen, solo settings.manage edita', async () => {
        await api.gym.update({ name: ' Fit Center ', address: 'Av. Siempre Viva 123', phone: '70000000' })
        expect(await api.gym.get()).toEqual({ name: 'Fit Center', address: 'Av. Siempre Viva 123', phone: '70000000' })
        expect(await code(api.gym.update({ name: ' ' }))).toBe('invalid')
        await api.gym.update({ address: '' })
        expect((await api.gym.get()).address).toBeUndefined()
        await api.auth.signIn(...RECEP)
        expect((await api.gym.get()).name).toBe('Fit Center')
        expect(await code(api.gym.update({ name: 'X' }))).toBe('forbidden')
      })
      it('personal: solo admin; correo único; contraseña mínima; permisos válidos', async () => {
        const ok = { fullName: 'Rosa Q.', email: 'Rosa@Gym.local', password: 'clave1234', permissions: ['members.read' as const] }
        const rosa = await api.staff.create(ok)
        expect(rosa).toMatchObject({ email: 'rosa@gym.local', role: 'receptionist', active: true, permissions: ['members.read'] })
        expect(await code(api.staff.create({ ...ok, email: 'rosa@gym.local' }))).toBe('conflict')
        expect(await code(api.staff.create({ ...ok, email: 'otra@gym.local', password: 'corta' }))).toBe('invalid')
        expect(await code(api.staff.create({ ...ok, email: 'mal-correo' }))).toBe('invalid')
        expect(await code(api.staff.create({ ...ok, email: 'x@gym.local', permissions: ['staff.manage'] }))).toBe('invalid')
        expect((await api.staff.list()).map((u) => u.email)).toContain('rosa@gym.local')
        await api.auth.signIn(...RECEP)
        expect(await code(api.staff.list())).toBe('forbidden')
        expect(await code(api.staff.create({ ...ok, email: 'z@gym.local' }))).toBe('forbidden')
      })
      it('personal: el nuevo usuario entra con sus permisos; al desactivarlo ya no entra', async () => {
        const rosa = await api.staff.create({ fullName: 'Rosa', email: 'rosa@gym.local', password: 'clave1234', permissions: [] })
        await api.auth.signIn('rosa@gym.local', 'clave1234')
        expect(await code(api.members.list())).toBe('forbidden')
        await api.auth.signIn(...ADMIN)
        await api.staff.update(rosa.id, { permissions: ['members.read'] })
        await api.auth.signIn('rosa@gym.local', 'clave1234')
        expect((await api.members.list()).total).toBe(0)
        await api.auth.signIn(...ADMIN)
        await api.staff.update(rosa.id, { active: false })
        expect(await code(api.auth.signIn('rosa@gym.local', 'clave1234'))).toBe('unauthenticated')
      })
      it('copia de datos: solo admin, incluye lo anulado con su motivo y nunca contraseñas', async () => {
        const m = await newMember('777', 'Copia Uno')
        const pay = await api.payments.sell({ memberId: m.id, planId: mensual.id, paidCents: 15000, method: 'qr' })
        await api.payments.void(pay.id, 'cobro duplicado')
        const [exp] = await api.categories.list('expense')
        const mov = await api.movements.register({ type: 'expense', categoryId: exp.id, description: 'Luz', amountCents: 500, method: 'cash' })
        await api.movements.void(mov.id, 'error')
        const b = await api.backup.get()
        expect(b.members.map((x) => x.fullName)).toContain('Copia Uno')
        expect(b.payments[0]).toMatchObject({ status: 'voided', voidReason: 'cobro duplicado', memberName: 'Copia Uno', memberCi: '777' })
        expect(b.memberships[0]).toMatchObject({ memberName: 'Copia Uno', planName: 'Mensual', dueCents: 15000 })
        expect(b.movements[0]).toMatchObject({ status: 'voided', categoryName: exp.name, createdByName: 'Admin Demo' })
        expect(b.staff.length).toBeGreaterThanOrEqual(2)
        expect(JSON.stringify(b)).not.toMatch(/password|admin123|recep123/i)
        await api.auth.signIn(...RECEP)
        expect(await code(api.backup.get())).toBe('forbidden')
      })
      it('personal: no se modifica a un administrador', async () => {
        const admin = (await api.staff.list()).find((u) => u.role === 'admin')!
        expect(await code(api.staff.update(admin.id, { active: false }))).toBe('forbidden')
      })
    })
  })
}
