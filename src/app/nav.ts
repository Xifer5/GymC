import type { ComponentChildren } from 'preact'
import { Banknote, ArrowLeftRight, ChartColumn, LayoutDashboard, Settings, Tags, Users } from 'lucide-preact'
import type { LucideProps } from 'lucide-preact'
import type { Permission } from '@/lib/data/types'

export type IconType = (props: LucideProps) => ComponentChildren

export interface NavItem {
  path: string
  label: string
  icon: IconType
  /** Permisos necesarios (todos). Vacío = cualquier usuario autenticado. */
  perms: Permission[]
  /** Móvil: 'primary' va en la barra inferior, 'more' dentro de "Más". */
  slot: 'primary' | 'more'
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Inicio', icon: LayoutDashboard, perms: [], slot: 'primary' },
  { path: '/socios', label: 'Socios', icon: Users, perms: ['members.read'], slot: 'primary' },
  { path: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight, perms: ['movements.read'], slot: 'primary' },
  { path: '/reportes', label: 'Reportes', icon: ChartColumn, perms: ['reports.view'], slot: 'primary' },
  { path: '/planes', label: 'Planes', icon: Tags, perms: ['plans.manage'], slot: 'more' },
  { path: '/ajustes', label: 'Ajustes', icon: Settings, perms: ['settings.manage'], slot: 'more' },
]

/** Acción principal (FAB en móvil, botón destacado en desktop). */
export const COBRAR: NavItem = {
  path: '/cobrar',
  label: 'Cobrar',
  icon: Banknote,
  perms: ['payments.create', 'memberships.write'],
  slot: 'primary',
}

export const canSee = (item: NavItem, can: (p: Permission) => boolean) => item.perms.every(can)

export const visibleNav = (can: (p: Permission) => boolean) => NAV_ITEMS.filter((i) => canSee(i, can))

/** '/' solo coincide exacto; el resto por prefijo de segmento. */
export function isActive(itemPath: string, location: string): boolean {
  if (itemPath === '/') return location === '/'
  return location === itemPath || location.startsWith(`${itemPath}/`)
}
