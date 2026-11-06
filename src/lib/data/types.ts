/**
 * Contrato de la capa de datos. La UI SOLO habla con `DataApi`.
 * Adaptadores: mock local (hoy) y Supabase (después). Ambos deben pasar `contract.ts`.
 * Importes: centavos enteros. Fechas: ISO `YYYY-MM-DD` (zona del gimnasio).
 */
import type { Cents } from '../money'
import type { ISODate, MembershipState } from '../dates'

export const PERMISSIONS = [
  'members.read',
  'members.write',
  'plans.manage',
  'memberships.write',
  'payments.create',
  'payments.void',
  'movements.read',
  'movements.write',
  'reports.view',
  'settings.manage',
  'staff.manage',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export type Role = 'admin' | 'receptionist'
export type PaymentMethod = 'cash' | 'transfer' | 'qr'
export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'archived'
export type MovementType = 'income' | 'expense'
export type RecordStatus = 'confirmed' | 'voided'

export interface Profile {
  id: string
  fullName: string
  email: string
  role: Role
  permissions: Permission[]
  active: boolean
}

export interface Plan {
  id: string
  name: string
  durationDays: number
  priceCents: Cents
  description?: string
  active: boolean
}
export type PlanInput = Omit<Plan, 'id' | 'active'> & { active?: boolean }

export interface Member {
  id: string
  fullName: string
  ci: string
  phone: string
  email?: string
  notes?: string
  status: MemberStatus
  joinedOn: ISODate
}
/** Membresía vigente (la de fecha fin más reciente) con su estado calculado. */
export interface CurrentMembership {
  planName: string
  endDate: ISODate
  state: MembershipState
  dueCents: Cents
}
/** Socio tal como se muestra en listados. */
export interface MemberListItem extends Member {
  current: CurrentMembership | null
}
export type MemberInput = Pick<Member, 'fullName' | 'ci' | 'phone'> &
  Partial<Pick<Member, 'email' | 'notes' | 'status'>>

export interface Membership {
  id: string
  memberId: string
  planId: string | null
  planName: string
  priceCents: Cents
  discountCents: Cents
  startDate: ISODate
  endDate: ISODate
  status: 'active' | 'cancelled'
  /** Derivado: suma de pagos confirmados. */
  paidCents: Cents
  /** Derivado: neto − pagado (nunca negativo). */
  dueCents: Cents
}

export interface MembershipWithMember extends Membership {
  memberName: string
  memberPhone: string
}

export interface Payment {
  id: string
  memberId: string
  membershipId: string
  receiptNo: number
  amountCents: Cents
  method: PaymentMethod
  paidAt: string
  note?: string
  status: RecordStatus
  voidReason?: string
}

export interface GymInfo {
  name: string
  address?: string
  phone?: string
}

export interface StaffInput {
  fullName: string
  email: string
  /** Contraseña inicial (mín. 8). */
  password: string
  permissions: Permission[]
}

/** Permisos que el admin puede asignar a recepción. `staff.manage` es solo de admin (evita escalar privilegios). */
export const GRANTABLE_PERMISSIONS = PERMISSIONS.filter((p) => p !== 'staff.manage')

export interface PaymentWithMember extends Payment {
  memberName: string
}

export interface Category {
  id: string
  type: MovementType
  name: string
  active: boolean
}

export interface Movement {
  id: string
  type: MovementType
  categoryId: string
  description: string
  amountCents: Cents
  method: PaymentMethod
  occurredOn: ISODate
  status: RecordStatus
  voidReason?: string
  createdBy: string
}

export interface Page<T> {
  items: T[]
  total: number
}
export interface PageQuery {
  page?: number
  pageSize?: number
}
export interface DateRange {
  from?: ISODate
  to?: ISODate
}

export interface Summary {
  /** Pagos de socios + otros ingresos confirmados. */
  incomeCents: Cents
  paymentsCents: Cents
  otherIncomeCents: Cents
  expenseCents: Cents
  /** incomeCents − expenseCents */
  balanceCents: Cents
  incomeByMethod: Record<PaymentMethod, Cents>
}

/** Una línea del libro de caja (pagos de socios + ingresos + egresos confirmados). Importe siempre positivo. */
export interface LedgerEntry {
  id: string
  date: ISODate
  kind: 'payment' | 'income' | 'expense'
  category: string
  description: string
  method: PaymentMethod
  amountCents: Cents
}

/** Copia completa de los datos del gimnasio para exportar (nunca incluye contraseñas). Incluye lo anulado, con su motivo. */
export interface BackupData {
  exportedAt: string
  gym: GymInfo
  plans: Plan[]
  categories: Category[]
  members: Member[]
  memberships: (Membership & { memberName: string; memberCi: string })[]
  payments: (Payment & { memberName: string; memberCi: string })[]
  movements: (Movement & { categoryName: string; createdByName: string })[]
  staff: Pick<Profile, 'fullName' | 'email' | 'role' | 'permissions' | 'active'>[]
}

export interface DashboardData {
  totalMembers: number
  /** Socios con membresía vigente (activa o por vencer). */
  activeMembers: number
  expiringMembers: number
  expiredMembers: number
  /** null si el usuario no tiene `reports.view`. */
  finance: { today: Summary; month: Summary } | null
  /** Últimos pagos confirmados (vacío sin permiso de cobros/reportes). */
  recentPayments: PaymentWithMember[]
}

export interface SellMembershipInput {
  memberId: string
  planId: string
  startDate?: ISODate
  discountCents?: Cents
  paidCents: Cents
  method: PaymentMethod
}

export interface DataApi {
  auth: {
    currentUser(): Promise<Profile | null>
    signIn(email: string, password: string): Promise<Profile>
    signOut(): Promise<void>
  }
  plans: {
    list(opts?: { includeInactive?: boolean }): Promise<Plan[]>
    create(input: PlanInput): Promise<Plan>
    update(id: string, patch: Partial<PlanInput>): Promise<Plan>
  }
  members: {
    list(opts?: PageQuery & { search?: string; status?: MemberStatus }): Promise<Page<MemberListItem>>
    get(id: string): Promise<Member>
    create(input: MemberInput): Promise<Member>
    update(id: string, patch: Partial<MemberInput>): Promise<Member>
  }
  memberships: {
    listForMember(memberId: string): Promise<Membership[]>
    /** Última membresía de cada socio filtrada por estado. */
    listByState(state: 'expired' | 'expiring', soonDays?: number): Promise<MembershipWithMember[]>
    create(input: {
      memberId: string
      planId: string
      startDate?: ISODate
      discountCents?: Cents
    }): Promise<Membership>
  }
  payments: {
    /** Membresía + primer pago en una sola operación atómica. */
    sell(input: SellMembershipInput): Promise<Payment>
    register(input: {
      membershipId: string
      amountCents: Cents
      method: PaymentMethod
      note?: string
    }): Promise<Payment>
    void(id: string, reason: string): Promise<void>
    listForMember(memberId: string): Promise<Payment[]>
    list(opts?: PageQuery & DateRange): Promise<Page<Payment>>
  }
  categories: {
    /** Por defecto solo activas (para elegir al registrar); `includeInactive` para administrarlas o resolver nombres. */
    list(type?: MovementType, opts?: { includeInactive?: boolean }): Promise<Category[]>
    create(input: { type: MovementType; name: string }): Promise<Category>
    /** Renombrar o activar/desactivar (nunca se borran: hay movimientos que las usan). */
    update(id: string, patch: { name?: string; active?: boolean }): Promise<Category>
  }
  gym: {
    /** Cualquier usuario autenticado (se usa en recibos). */
    get(): Promise<GymInfo>
    update(patch: Partial<GymInfo>): Promise<GymInfo>
  }
  staff: {
    list(): Promise<Profile[]>
    /** Crea una recepcionista. En Supabase lo hace la Edge Function `create-staff` (nunca el navegador). */
    create(input: StaffInput): Promise<Profile>
    update(id: string, patch: Partial<Pick<StaffInput, 'fullName' | 'permissions'>> & { active?: boolean }): Promise<Profile>
  }
  movements: {
    register(input: {
      type: MovementType
      categoryId: string
      description: string
      amountCents: Cents
      method: PaymentMethod
      occurredOn?: ISODate
    }): Promise<Movement>
    void(id: string, reason: string): Promise<void>
    list(
      opts?: PageQuery & DateRange & { type?: MovementType; categoryId?: string },
    ): Promise<Page<Movement>>
  }
  reports: {
    summary(range: DateRange): Promise<Summary>
    /** Movimientos confirmados del rango, por fecha ascendente (equivale a `v_ledger`). */
    ledger(range: DateRange): Promise<LedgerEntry[]>
  }
  dashboard: {
    get(): Promise<DashboardData>
  }
  backup: {
    /** Todos los datos del gimnasio, para descargar. Requiere `settings.manage`. */
    get(): Promise<BackupData>
  }
}

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'conflict'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
