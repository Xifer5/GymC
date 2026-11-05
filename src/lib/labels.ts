import type { MemberStatus, MovementType, PaymentMethod, Permission } from './data/types'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  qr: 'QR',
}

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = (
  Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]
).map(([value, label]) => ({ value, label }))

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
}

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  archived: 'Archivado',
}

/** Texto para el admin al asignar permisos (agrupados por área). */
export const PERMISSION_GROUPS: { title: string; items: { permission: Permission; label: string; hint?: string }[] }[] = [
  {
    title: 'Socios y cobros',
    items: [
      { permission: 'members.read', label: 'Ver socios' },
      { permission: 'members.write', label: 'Registrar y editar socios' },
      { permission: 'memberships.write', label: 'Vender membresías' },
      { permission: 'payments.create', label: 'Cobrar y registrar pagos' },
      { permission: 'payments.void', label: 'Anular pagos', hint: 'Operación sensible' },
    ],
  },
  {
    title: 'Dinero del gimnasio',
    items: [
      { permission: 'movements.read', label: 'Ver ingresos y egresos' },
      { permission: 'movements.write', label: 'Registrar y anular ingresos/egresos' },
      { permission: 'reports.view', label: 'Ver reportes y finanzas del Inicio' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { permission: 'plans.manage', label: 'Gestionar planes y precios' },
      { permission: 'settings.manage', label: 'Ajustes (datos del gimnasio y categorías)' },
    ],
  },
]

export const PERMISSION_LABEL: Partial<Record<Permission, string>> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.permission, i.label])),
) as Partial<Record<Permission, string>>
