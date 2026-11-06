import { describe, expect, it } from 'vitest'
import { runDataApiContract } from './contract'
import { createMockApi } from './mock'
import type { StorageLike } from './mock'

const memoryStorage = (): StorageLike => {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

runDataApiContract('mock', () => createMockApi({ storage: memoryStorage() }))

describe('persistencia del mock', () => {
  it('los datos sobreviven a recargar (misma storage)', async () => {
    const storage = memoryStorage()
    const a = createMockApi({ storage })
    await a.auth.signIn('admin@gym.local', 'admin123')
    await a.members.create({ fullName: 'Luis', ci: '55', phone: '1' })
    const b = createMockApi({ storage })
    expect((await b.auth.currentUser())?.email).toBe('admin@gym.local')
    expect((await b.members.list()).total).toBe(1)
  })
  it('storage corrupto → arranca limpio', async () => {
    const storage = memoryStorage()
    storage.setItem('gm-mock-db', '{no es json')
    const a = createMockApi({ storage })
    await a.auth.signIn('admin@gym.local', 'admin123')
    expect((await a.members.list()).total).toBe(0)
  })
})

describe('datos de demostración', () => {
  const setup = async () => {
    const a = createMockApi({ storage: memoryStorage() })
    await a.auth.signIn('admin@gym.local', 'admin123')
    await a.demo.load()
    return a
  }

  it('crea un gimnasio con socios en todos los estados', async () => {
    const a = await setup()
    const d = await a.dashboard.get()
    expect(d.totalMembers).toBe(25)
    expect(d.expiringMembers).toBeGreaterThanOrEqual(4)
    expect(d.expiredMembers).toBeGreaterThanOrEqual(4)
    expect(d.activeMembers - d.expiringMembers).toBeGreaterThanOrEqual(10) // vigentes “tranquilos”
    expect(d.recentPayments.length).toBe(5)
    expect(d.finance?.month.balanceCents).not.toBe(0)
  })

  it('hay saldos pendientes y un pago anulado, pero ningún sobrepago', async () => {
    const a = await setup()
    const all = (await a.members.list({ pageSize: 100 })).items
    expect(all.filter((m) => (m.current?.dueCents ?? 0) > 0).length).toBeGreaterThanOrEqual(2)
    let voided = 0
    for (const m of all) {
      for (const ms of await a.memberships.listForMember(m.id)) {
        expect(ms.paidCents).toBeLessThanOrEqual(ms.priceCents - ms.discountCents)
      }
      voided += (await a.payments.listForMember(m.id)).filter((p) => p.status === 'voided').length
    }
    expect(voided).toBe(1)
  })

  it('recibos correlativos sin repetir y el libro de caja cuadra con el resumen', async () => {
    const a = await setup()
    const pays = (await a.payments.list({ pageSize: 500 })).items
    const nos = pays.map((p) => p.receiptNo).sort((x, y) => x - y)
    expect(new Set(nos).size).toBe(nos.length)
    expect(nos[0]).toBe(1)
    expect(nos[nos.length - 1]).toBe(nos.length)
    const s = await a.reports.summary({})
    const led = await a.reports.ledger({})
    expect(led.reduce((n, e) => n + (e.kind === 'expense' ? -e.amountCents : e.amountCents), 0)).toBe(s.balanceCents)
    expect(s.expenseCents).toBeGreaterThan(0)
    expect(s.otherIncomeCents).toBeGreaterThan(0)
  })

  it('sigue funcionando después: se puede cobrar y el siguiente recibo continúa la serie', async () => {
    const a = await setup()
    const total = (await a.payments.list({ pageSize: 500 })).total
    const m = await a.members.create({ fullName: 'Nuevo', ci: '1', phone: '1' })
    const plan = (await a.plans.list())[0]
    const p = await a.payments.sell({ memberId: m.id, planId: plan.id, paidCents: plan.priceCents, method: 'cash' })
    expect(p.receiptNo).toBe(total + 1)
  })

  it('no pisa datos existentes', async () => {
    const a = await setup()
    await expect(a.demo.load()).rejects.toMatchObject({ code: 'conflict' })
    expect((await a.members.list()).total).toBe(25)
  })

  it('replace sustituye lo que hubiera por el ejemplo', async () => {
    const a = createMockApi({ storage: memoryStorage() })
    await a.auth.signIn('admin@gym.local', 'admin123')
    await a.members.create({ fullName: 'Mío', ci: '1', phone: '1' })
    await a.demo.load({ replace: true })
    const list = (await a.members.list({ pageSize: 100 })).items
    expect(list).toHaveLength(25)
    expect(list.some((m) => m.fullName === 'Mío')).toBe(false)
  })

  it('solo con settings.manage', async () => {
    const a = createMockApi({ storage: memoryStorage() })
    await a.auth.signIn('recep@gym.local', 'recep123')
    await expect(a.demo.load()).rejects.toMatchObject({ code: 'forbidden' })
    await expect(a.demo.clear()).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('clear deja todo vacío y conserva usuarios, planes y categorías', async () => {
    const a = await setup()
    await a.demo.clear()
    expect((await a.members.list()).total).toBe(0)
    expect((await a.payments.list()).total).toBe(0)
    expect((await a.movements.list()).total).toBe(0)
    expect((await a.plans.list()).length).toBeGreaterThan(0)
    expect((await a.categories.list()).length).toBeGreaterThan(0)
    const m = await a.members.create({ fullName: 'X', ci: '9', phone: '1' })
    const plan = (await a.plans.list())[0]
    expect((await a.payments.sell({ memberId: m.id, planId: plan.id, paidCents: plan.priceCents, method: 'cash' })).receiptNo).toBe(1)
  })
})
