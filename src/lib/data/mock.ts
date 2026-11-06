/**
 * Adaptador MOCK (local). Replica las reglas de `supabase/migrations/0001_init.sql`:
 * permisos, anti-sobrepago, snapshot de precio, anulación con motivo, recibos correlativos.
 * Persiste en localStorage. Toda mutación es atómica (rollback si falla).
 * Al cambiar una regla en el SQL, cambiarla aquí y en `contract.ts`.
 */
import {
  GYM_TZ, membershipEnd, membershipState, monthRange, renewalStart, timestampToISODate, todayISO,
} from '../dates'
import type { ISODate } from '../dates'
import { formatMoney, sumCents } from '../money'
import { hasPermission } from '../permissions'
import type { Cents } from '../money'
import { buildDemoState, clearData } from './demo'
import { AppError, GRANTABLE_PERMISSIONS } from './types'
import type {
  Category, DashboardData, DataApi, DateRange, LedgerEntry, Member, MemberInput, Membership,
  MemberListItem, MembershipWithMember, Movement, Page, PageQuery, Payment, PaymentMethod, Permission, Plan,
  PlanInput, Profile, StaffInput, Summary,
  BackupData, GymInfo, AuditEntry,
} from './types'

type StoredUser = Profile & { password: string }
export type StoredMembership = Omit<Membership, 'paidCents' | 'dueCents'>

export interface DbState {
  users: StoredUser[]
  sessionUserId: string | null
  plans: Plan[]
  members: Member[]
  memberships: StoredMembership[]
  payments: Payment[]
  categories: Category[]
  movements: Movement[]
  receiptSeq: number
  gym: GymInfo
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface MockOptions {
  storage?: StorageLike
  now?: () => Date
  /** Latencia simulada (ms) para probar estados de carga. */
  latencyMs?: number
  storageKey?: string
}

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'qr']
const uid = () => crypto.randomUUID()

function seed(): DbState {
  const cat = (type: Category['type'], name: string): Category => ({ id: uid(), type, name, active: true })
  const plan = (name: string, durationDays: number, priceCents: Cents): Plan => ({
    id: uid(), name, durationDays, priceCents, active: true,
  })
  return {
    users: [
      {
        id: uid(), fullName: 'Admin Demo', email: 'admin@gym.local', password: 'admin123',
        role: 'admin', permissions: [], active: true,
      },
      {
        id: uid(), fullName: 'Carla Rojas', email: 'recep@gym.local', password: 'recep123',
        role: 'receptionist', active: true,
        permissions: ['members.read', 'members.write', 'memberships.write', 'payments.create'],
      },
    ],
    sessionUserId: null,
    gym: { name: 'Gym Manager' },
    plans: [
      plan('Diario', 1, 1000), plan('Semanal', 7, 5000),
      plan('Quincenal', 15, 8000), plan('Mensual', 30, 15000),
    ],
    members: [], memberships: [], payments: [], movements: [], receiptSeq: 0,
    categories: [
      cat('income', 'Venta de productos'), cat('income', 'Otros ingresos'),
      cat('expense', 'Alquiler'), cat('expense', 'Servicios'), cat('expense', 'Sueldos'),
      cat('expense', 'Mantenimiento'), cat('expense', 'Equipos'), cat('expense', 'Otros egresos'),
    ],
  }
}

function toProfile(u: StoredUser): Profile {
  return {
    id: u.id, fullName: u.fullName, email: u.email, role: u.role,
    permissions: u.permissions, active: u.active,
  }
}

function cleanPermissions(list: Permission[]): Permission[] {
  const allowed = new Set<Permission>(GRANTABLE_PERMISSIONS)
  if (list.some((p) => !allowed.has(p))) throw new AppError('invalid', 'Permiso no válido')
  return [...new Set(list)]
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const byNewest = <T extends { id: string }>(arr: T[]) => [...arr].reverse()

function paginate<T>(items: T[], q: PageQuery = {}): Page<T> {
  const size = Math.max(1, q.pageSize ?? 25)
  const page = Math.max(1, q.page ?? 1)
  return { items: items.slice((page - 1) * size, page * size), total: items.length }
}

function inRange(date: ISODate, r: DateRange) {
  return (!r.from || date >= r.from) && (!r.to || date <= r.to)
}

function requireText(v: string | undefined, label: string): string {
  const t = (v ?? '').trim()
  if (!t) throw new AppError('invalid', `${label} es obligatorio`)
  return t
}

function requirePositiveCents(v: number, label = 'El monto') {
  if (!Number.isSafeInteger(v) || v <= 0) throw new AppError('invalid', `${label} debe ser mayor a 0`)
}

/** Extras solo del mock: demo y reinicio. No forman parte de `DataApi`. */
export interface MockExtras {
  reset(): void
  demo: { load(opts?: { replace?: boolean }): Promise<void>; clear(): Promise<void> }
}

export function createMockApi(opts: MockOptions = {}): DataApi & MockExtras {
  const key = opts.storageKey ?? 'gm-mock-db'
  const now = opts.now ?? (() => new Date())
  const today = () => todayISO(GYM_TZ, now())
  const lag = () => (opts.latencyMs ? new Promise((r) => setTimeout(r, opts.latencyMs)) : Promise.resolve())

  let state: DbState = load()

  function load(): DbState {
    try {
      const raw = opts.storage?.getItem(key)
      if (raw) return { ...seed(), ...(JSON.parse(raw) as Partial<DbState>) } // completa campos añadidos en versiones nuevas
    } catch { /* datos corruptos: se reinicia */ }
    return seed()
  }
  const save = () => {
    try { opts.storage?.setItem(key, JSON.stringify(state)) } catch { /* sin espacio */ }
  }
  /** Ejecuta y persiste; si algo falla restaura el estado anterior (atomicidad). */
  function tx<T>(fn: () => T): T {
    const snapshot = structuredClone(state)
    try {
      const r = fn()
      save()
      return r
    } catch (e) {
      state = snapshot
      throw e
    }
  }

  // ── Seguridad (equivalente a auth_gym_id / has_perm) ──
  function me(): StoredUser {
    const u = state.users.find((x) => x.id === state.sessionUserId && x.active)
    if (!u) throw new AppError('unauthenticated', 'Inicia sesión para continuar')
    return u
  }
  const can = (u: Profile, p: Permission) => hasPermission(u, p)
  function need(...perms: Permission[]): StoredUser {
    const u = me()
    if (!perms.every((p) => can(u, p))) throw new AppError('forbidden', 'No tienes permiso para esta acción')
    return u
  }
  function needAny(...perms: Permission[]): StoredUser {
    const u = me()
    if (!perms.some((p) => can(u, p))) throw new AppError('forbidden', 'No tienes permiso para esta acción')
    return u
  }

  // ── Vistas derivadas ──
  function paidFor(membershipId: string): Cents {
    return sumCents(
      state.payments.filter((p) => p.membershipId === membershipId && p.status === 'confirmed').map((p) => p.amountCents),
    )
  }
  function view(m: StoredMembership): Membership {
    const paid = paidFor(m.id)
    return { ...m, paidCents: paid, dueCents: Math.max(0, m.priceCents - m.discountCents - paid) }
  }
  function currentMembership(memberId: string): StoredMembership | undefined {
    return state.memberships
      .filter((m) => m.memberId === memberId && m.status === 'active')
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]
  }
  function getMember(id: string): Member {
    const m = state.members.find((x) => x.id === id)
    if (!m) throw new AppError('not_found', 'Socio no encontrado')
    return m
  }

  // ── Operaciones internas (llamar dentro de tx) ──
  function createMembershipInternal(i: {
    memberId: string; planId: string; startDate?: ISODate; discountCents?: Cents
  }): StoredMembership {
    need('memberships.write')
    getMember(i.memberId)
    const plan = state.plans.find((p) => p.id === i.planId && p.active)
    if (!plan) throw new AppError('invalid', 'Plan inválido')
    const discount = i.discountCents ?? 0
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > plan.priceCents) {
      throw new AppError('invalid', 'Descuento inválido')
    }
    const start = i.startDate ?? renewalStart(currentMembership(i.memberId)?.endDate ?? null, today())
    const m: StoredMembership = {
      id: uid(), memberId: i.memberId, planId: plan.id, planName: plan.name,
      priceCents: plan.priceCents, discountCents: discount, startDate: start,
      endDate: membershipEnd(start, plan.durationDays), status: 'active',
    }
    state.memberships.push(m)
    return m
  }

  function registerPaymentInternal(i: {
    membershipId: string; amountCents: Cents; method: PaymentMethod; note?: string
  }): Payment {
    const u = need('payments.create')
    const ms = state.memberships.find((m) => m.id === i.membershipId)
    if (!ms) throw new AppError('not_found', 'Membresía no encontrada')
    if (ms.status !== 'active') throw new AppError('invalid', 'La membresía está cancelada')
    requirePositiveCents(i.amountCents)
    if (!METHODS.includes(i.method)) throw new AppError('invalid', 'Método de pago inválido')
    if (paidFor(ms.id) + i.amountCents > ms.priceCents - ms.discountCents) {
      throw new AppError('invalid', 'El monto excede el saldo pendiente')
    }
    const p: Payment = {
      id: uid(), memberId: ms.memberId, membershipId: ms.id, receiptNo: ++state.receiptSeq,
      amountCents: i.amountCents, method: i.method, paidAt: now().toISOString(),
      note: i.note, status: 'confirmed', createdBy: u.id,
    }
    state.payments.push(p)
    return p
  }

  function voidRecord(
    rec: { status: 'confirmed' | 'voided'; voidReason?: string; voidedBy?: string; voidedAt?: string },
    reason: string,
    by: string,
  ) {
    const r = reason.trim()
    if (!r) throw new AppError('invalid', 'El motivo es obligatorio')
    if (rec.status === 'voided') throw new AppError('conflict', 'El registro ya está anulado')
    rec.status = 'voided'
    rec.voidReason = r
    rec.voidedBy = by
    rec.voidedAt = now().toISOString()
  }

  /** Agrega los nombres de quién registró/anuló (equivale a un join con perfiles). */
  function named<T extends { createdBy?: string; voidedBy?: string }>(rec: T): T & { createdByName?: string; voidedByName?: string } {
    const name = (id?: string) => (id ? state.users.find((u) => u.id === id)?.fullName ?? '—' : undefined)
    return { ...rec, createdByName: name(rec.createdBy), voidedByName: name(rec.voidedBy) }
  }

  function summarize(range: DateRange): Summary {
    const pays = state.payments.filter(
      (p) => p.status === 'confirmed' && inRange(timestampToISODate(p.paidAt), range),
    )
    const movs = state.movements.filter((m) => m.status === 'confirmed' && inRange(m.occurredOn, range))
    const otherIncome = movs.filter((m) => m.type === 'income')
    const expenses = movs.filter((m) => m.type === 'expense')
    const incomeByMethod: Summary['incomeByMethod'] = { cash: 0, transfer: 0, qr: 0 }
    for (const x of [...pays, ...otherIncome]) incomeByMethod[x.method] += x.amountCents
    const paymentsCents = sumCents(pays.map((p) => p.amountCents))
    const otherIncomeCents = sumCents(otherIncome.map((m) => m.amountCents))
    const expenseCents = sumCents(expenses.map((m) => m.amountCents))
    const incomeCents = paymentsCents + otherIncomeCents
    return {
      incomeCents, paymentsCents, otherIncomeCents, expenseCents,
      balanceCents: incomeCents - expenseCents, incomeByMethod,
    }
  }

  const api: DataApi & MockExtras = {
    demo: {
      async load(o) {
        await lag(); need('settings.manage')
        tx(() => {
          if (state.members.length > 0 && !o?.replace) throw new AppError('conflict', 'Ya hay datos. Bórralos o elige reemplazarlos.')
          state = buildDemoState(clearData(state), today())
        })
      },
      async clear() {
        await lag(); need('settings.manage')
        tx(() => { state = clearData(state) })
      },
    },
    reset() {
      state = seed()
      opts.storage?.removeItem(key)
    },

    auth: {
      async currentUser() {
        await lag()
        const u = state.users.find((x) => x.id === state.sessionUserId && x.active)
        if (!u) return null
        return toProfile(u)
      },
      async signIn(email, password) {
        await lag()
        const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.active)
        if (!u || u.password !== password) throw new AppError('unauthenticated', 'Correo o contraseña incorrectos')
        state.sessionUserId = u.id
        save()
        return toProfile(u)
      },
      async signOut() {
        await lag()
        state.sessionUserId = null
        save()
      },
    },

    plans: {
      async list(o) {
        await lag(); me()
        return state.plans.filter((p) => o?.includeInactive || p.active)
      },
      async create(input: PlanInput) {
        await lag(); need('plans.manage')
        if (!Number.isSafeInteger(input.durationDays) || input.durationDays < 1) throw new AppError('invalid', 'Duración inválida')
        if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0) throw new AppError('invalid', 'Precio inválido')
        return tx(() => {
          const p: Plan = { id: uid(), active: true, ...input, name: requireText(input.name, 'El nombre') }
          state.plans.push(p)
          return p
        })
      },
      async update(id, patch) {
        await lag(); need('plans.manage')
        return tx(() => {
          const p = state.plans.find((x) => x.id === id)
          if (!p) throw new AppError('not_found', 'Plan no encontrado')
          if (patch.durationDays !== undefined && (!Number.isSafeInteger(patch.durationDays) || patch.durationDays < 1)) throw new AppError('invalid', 'Duración inválida')
          if (patch.priceCents !== undefined && (!Number.isSafeInteger(patch.priceCents) || patch.priceCents < 0)) throw new AppError('invalid', 'Precio inválido')
          Object.assign(p, patch)
          return p
        })
      },
    },

    members: {
      async list(o) {
        await lag(); need('members.read')
        const q = o?.search ? norm(o.search.trim()) : ''
        const items = byNewest(state.members).filter((m) => {
          if (o?.status ? m.status !== o.status : m.status === 'archived') return false
          return !q || [m.fullName, m.ci, m.phone].some((f) => norm(f).includes(q))
        })
        const t = today()
        const page = paginate(items, o)
        return {
          total: page.total,
          items: page.items.map((m): MemberListItem => {
            const cur = currentMembership(m.id)
            return {
              ...m,
              current: cur
                ? { planName: cur.planName, endDate: cur.endDate, state: membershipState(cur.endDate, t), dueCents: view(cur).dueCents }
                : null,
            }
          }),
        }
      },
      async get(id) {
        await lag(); need('members.read')
        return getMember(id)
      },
      async create(input: MemberInput) {
        await lag(); need('members.write')
        return tx(() => {
          const ci = requireText(input.ci, 'El CI')
          if (state.members.some((m) => m.ci === ci)) throw new AppError('conflict', 'Ya existe un socio con ese CI')
          const m: Member = {
            id: uid(), fullName: requireText(input.fullName, 'El nombre'), ci,
            phone: requireText(input.phone, 'El teléfono'), email: input.email?.trim() || undefined,
            notes: input.notes, status: input.status ?? 'active', joinedOn: today(),
          }
          state.members.push(m)
          return m
        })
      },
      async update(id, patch) {
        await lag(); need('members.write')
        return tx(() => {
          const m = getMember(id)
          if (patch.ci !== undefined) {
            const ci = requireText(patch.ci, 'El CI')
            if (state.members.some((x) => x.id !== id && x.ci === ci)) throw new AppError('conflict', 'Ya existe un socio con ese CI')
            patch = { ...patch, ci }
          }
          if (patch.fullName !== undefined) requireText(patch.fullName, 'El nombre')
          if (patch.phone !== undefined) requireText(patch.phone, 'El teléfono')
          Object.assign(m, patch)
          return m
        })
      },
    },

    memberships: {
      async listForMember(memberId) {
        await lag(); need('members.read')
        return byNewest(state.memberships.filter((m) => m.memberId === memberId)).map(view)
      },
      async listByState(st, soonDays = 7) {
        await lag(); need('members.read')
        const t = today()
        const out: MembershipWithMember[] = []
        for (const mem of state.members) {
          if (mem.status === 'archived') continue
          const cur = currentMembership(mem.id)
          if (cur && membershipState(cur.endDate, t, soonDays) === st) {
            out.push({ ...view(cur), memberName: mem.fullName, memberPhone: mem.phone })
          }
        }
        return out.sort((a, b) => (a.endDate < b.endDate ? -1 : 1))
      },
      async create(input) {
        await lag()
        return view(tx(() => createMembershipInternal(input)))
      },
    },

    payments: {
      async sell(input) {
        await lag(); need('memberships.write', 'payments.create')
        return tx(() => {
          const ms = createMembershipInternal(input)
          return registerPaymentInternal({ membershipId: ms.id, amountCents: input.paidCents, method: input.method })
        })
      },
      async register(input) {
        await lag()
        return tx(() => registerPaymentInternal(input))
      },
      async void(id, reason) {
        await lag(); const u = need('payments.void')
        tx(() => {
          const p = state.payments.find((x) => x.id === id)
          if (!p) throw new AppError('not_found', 'Pago no encontrado')
          voidRecord(p, reason, u.id)
        })
      },
      async listForMember(memberId) {
        await lag(); needAny('payments.create', 'reports.view')
        return byNewest(state.payments.filter((p) => p.memberId === memberId)).map(named)
      },
      async list(o) {
        await lag(); needAny('payments.create', 'reports.view')
        const items = byNewest(state.payments).filter((p) => inRange(timestampToISODate(p.paidAt), o ?? {}))
        return paginate(items.map(named), o)
      },
    },

    categories: {
      async list(type, o) {
        await lag(); me()
        return state.categories.filter((c) => (o?.includeInactive || c.active) && (!type || c.type === type))
      },
      async update(id, patch) {
        await lag(); need('settings.manage')
        return tx(() => {
          const c = state.categories.find((x) => x.id === id)
          if (!c) throw new AppError('not_found', 'Categoría no encontrada')
          if (patch.name !== undefined) {
            const name = requireText(patch.name, 'El nombre')
            if (state.categories.some((x) => x.id !== c.id && x.type === c.type && norm(x.name) === norm(name))) {
              throw new AppError('conflict', 'La categoría ya existe')
            }
            c.name = name
          }
          if (patch.active !== undefined) c.active = patch.active
          return { ...c }
        })
      },
      async create(input) {
        await lag(); need('settings.manage')
        return tx(() => {
          const name = requireText(input.name, 'El nombre')
          if (state.categories.some((c) => c.type === input.type && norm(c.name) === norm(name))) {
            throw new AppError('conflict', 'La categoría ya existe')
          }
          const c: Category = { id: uid(), type: input.type, name, active: true }
          state.categories.push(c)
          return c
        })
      },
    },

    gym: {
      async get() {
        await lag(); me()
        return { ...state.gym }
      },
      async update(patch) {
        await lag(); need('settings.manage')
        return tx(() => {
          const next = { ...state.gym }
          if (patch.name !== undefined) next.name = requireText(patch.name, 'El nombre')
          if (patch.address !== undefined) next.address = patch.address.trim() || undefined
          if (patch.phone !== undefined) next.phone = patch.phone.trim() || undefined
          state.gym = next
          return { ...next }
        })
      },
    },

    staff: {
      async list() {
        await lag(); need('staff.manage')
        return state.users.map(toProfile)
      },
      async create(input: StaffInput) {
        await lag(); need('staff.manage')
        return tx(() => {
          const email = input.email.trim().toLowerCase()
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('invalid', 'Correo inválido')
          if (input.password.length < 8) throw new AppError('invalid', 'La contraseña debe tener al menos 8 caracteres')
          if (state.users.some((u) => u.email.toLowerCase() === email)) throw new AppError('conflict', 'Ya existe un usuario con ese correo')
          const u: StoredUser = {
            id: uid(), fullName: requireText(input.fullName, 'El nombre'), email, password: input.password,
            role: 'receptionist', permissions: cleanPermissions(input.permissions), active: true,
          }
          state.users.push(u)
          return toProfile(u)
        })
      },
      async update(id, patch) {
        await lag(); const admin = need('staff.manage')
        return tx(() => {
          const u = state.users.find((x) => x.id === id)
          if (!u) throw new AppError('not_found', 'Usuario no encontrado')
          if (u.role === 'admin' || u.id === admin.id) throw new AppError('forbidden', 'No se puede modificar a un administrador')
          if (patch.fullName !== undefined) u.fullName = requireText(patch.fullName, 'El nombre')
          if (patch.permissions !== undefined) u.permissions = cleanPermissions(patch.permissions)
          if (patch.active !== undefined) u.active = patch.active
          return toProfile(u)
        })
      },
    },

    movements: {
      async register(input) {
        await lag(); const u = need('movements.write')
        return tx(() => {
          const cat = state.categories.find((c) => c.id === input.categoryId && c.active && c.type === input.type)
          if (!cat) throw new AppError('invalid', 'Categoría inválida')
          requirePositiveCents(input.amountCents)
          if (!METHODS.includes(input.method)) throw new AppError('invalid', 'Método de pago inválido')
          const m: Movement = {
            id: uid(), type: input.type, categoryId: cat.id,
            description: requireText(input.description, 'La descripción'),
            amountCents: input.amountCents, method: input.method,
            occurredOn: input.occurredOn ?? today(), status: 'confirmed', createdBy: u.id, createdAt: now().toISOString(),
          }
          state.movements.push(m)
          return m
        })
      },
      async void(id, reason) {
        await lag(); const u = need('movements.write')
        tx(() => {
          const m = state.movements.find((x) => x.id === id)
          if (!m) throw new AppError('not_found', 'Movimiento no encontrado')
          voidRecord(m, reason, u.id)
        })
      },
      async list(o) {
        await lag(); need('movements.read')
        const items = byNewest(state.movements).filter(
          (m) =>
            inRange(m.occurredOn, o ?? {}) && (!o?.type || m.type === o.type) &&
            (!o?.categoryId || m.categoryId === o.categoryId),
        )
        return paginate(items.map(named), o)
      },
    },

    reports: {
      async summary(range) {
        await lag(); need('reports.view')
        return summarize(range)
      },
      async ledger(range) {
        await lag(); need('reports.view')
        const names = new Map(state.members.map((m) => [m.id, m.fullName]))
        const cats = new Map(state.categories.map((c) => [c.id, c.name]))
        const rows: LedgerEntry[] = [
          ...state.payments
            .filter((p) => p.status === 'confirmed' && inRange(timestampToISODate(p.paidAt), range))
            .map((p): LedgerEntry => ({
              id: p.id, date: timestampToISODate(p.paidAt), kind: 'payment', category: 'Membresías',
              description: `Recibo #${p.receiptNo} · ${names.get(p.memberId) ?? '—'}`,
              method: p.method, amountCents: p.amountCents,
            })),
          ...state.movements
            .filter((m) => m.status === 'confirmed' && inRange(m.occurredOn, range))
            .map((m): LedgerEntry => ({
              id: m.id, date: m.occurredOn, kind: m.type, category: cats.get(m.categoryId) ?? '—',
              description: m.description, method: m.method, amountCents: m.amountCents,
            })),
        ]
        return rows.sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1))
      },
    },

    audit: {
      async list(o) {
        await lag(); need('settings.manage')
        const who = (id?: string) => (id ? state.users.find((u) => u.id === id)?.fullName ?? '—' : '—')
        const member = new Map(state.members.map((m) => [m.id, m.fullName]))
        const entries: AuditEntry[] = []
        for (const p of state.payments) {
          const label = `Recibo #${p.receiptNo} · ${member.get(p.memberId) ?? '—'} · ${formatMoney(p.amountCents)}`
          entries.push({ id: `${p.id}:c`, at: p.paidAt, userName: who(p.createdBy), action: 'payment.create', description: label })
          if (p.status === 'voided') {
            entries.push({ id: `${p.id}:v`, at: p.voidedAt ?? p.paidAt, userName: who(p.voidedBy), action: 'payment.void', description: label, reason: p.voidReason })
          }
        }
        for (const m of state.movements) {
          const label = `${m.description} · ${formatMoney(m.amountCents)}`
          const at = m.createdAt ?? `${m.occurredOn}T12:00:00.000Z`
          entries.push({ id: `${m.id}:c`, at, userName: who(m.createdBy), action: 'movement.create', description: label })
          if (m.status === 'voided') {
            entries.push({ id: `${m.id}:v`, at: m.voidedAt ?? at, userName: who(m.voidedBy), action: 'movement.void', description: label, reason: m.voidReason })
          }
        }
        entries.sort((a, b) => (a.at === b.at ? (a.id < b.id ? 1 : -1) : a.at < b.at ? 1 : -1))
        return paginate(entries, o)
      },
    },

    backup: {
      async get(): Promise<BackupData> {
        await lag(); need('settings.manage')
        const member = new Map(state.members.map((m) => [m.id, m]))
        const cat = new Map(state.categories.map((c) => [c.id, c.name]))
        const user = new Map(state.users.map((u) => [u.id, u.fullName]))
        const who = (id: string) => ({ memberName: member.get(id)?.fullName ?? '—', memberCi: member.get(id)?.ci ?? '' })
        return structuredClone({
          exportedAt: now().toISOString(),
          gym: state.gym,
          plans: state.plans,
          categories: state.categories,
          members: state.members,
          memberships: state.memberships.map((m) => ({ ...view(m), ...who(m.memberId) })),
          payments: state.payments.map((p) => ({ ...named(p), ...who(p.memberId) })),
          movements: state.movements.map((m) => ({ ...named(m), categoryName: cat.get(m.categoryId) ?? '—', createdByName: user.get(m.createdBy) ?? '—' })),
          staff: state.users.map(({ fullName, email, role, permissions, active }) => ({ fullName, email, role, permissions, active })),
        })
      },
    },

    dashboard: {
      async get(): Promise<DashboardData> {
        await lag()
        const u = me()
        const t = today()
        const live = state.members.filter((m) => m.status !== 'archived')
        let active = 0, expiring = 0, expired = 0
        for (const m of live) {
          const cur = currentMembership(m.id)
          if (!cur) continue
          const st = membershipState(cur.endDate, t)
          if (st === 'expired') expired++
          else { active++; if (st === 'expiring') expiring++ }
        }
        const finance = can(u, 'reports.view')
          ? {
              today: summarize({ from: t, to: t }),
              month: summarize(monthRange(t)),
            }
          : null
        const recentPayments = can(u, 'payments.create') || can(u, 'reports.view')
          ? byNewest(state.payments)
              .filter((p) => p.status === 'confirmed')
              .slice(0, 5)
              .map((p) => ({ ...p, memberName: state.members.find((m) => m.id === p.memberId)?.fullName ?? '—' }))
          : []
        return {
          totalMembers: live.length, activeMembers: active, expiringMembers: expiring,
          expiredMembers: expired, finance, recentPayments,
        }
      },
    },
  }
  return api
}
