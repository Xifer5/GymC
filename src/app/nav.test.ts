import { describe, expect, it } from 'vitest'
import { hasPermission } from '@/lib/permissions'
import type { Permission, Profile } from '@/lib/data/types'
import { COBRAR, canSee, isActive, visibleNav } from './nav'

const admin: Profile = { id: '1', fullName: 'A', email: 'a', role: 'admin', permissions: [], active: true }
const recep: Profile = {
  id: '2', fullName: 'R', email: 'r', role: 'receptionist', active: true,
  permissions: ['members.read', 'members.write', 'memberships.write', 'payments.create'],
}
const canOf = (u: Profile) => (p: Permission) => hasPermission(u, p)

describe('navegación por permisos', () => {
  it('admin ve todo', () => {
    expect(visibleNav(canOf(admin)).map((i) => i.label)).toEqual([
      'Inicio', 'Socios', 'Movimientos', 'Reportes', 'Planes', 'Ajustes',
    ])
    expect(canSee(COBRAR, canOf(admin))).toBe(true)
  })
  it('recepción solo ve lo asignado', () => {
    expect(visibleNav(canOf(recep)).map((i) => i.label)).toEqual(['Inicio', 'Socios'])
    expect(canSee(COBRAR, canOf(recep))).toBe(true)
  })
  it('recepción sin permiso de cobro no ve "Cobrar"', () => {
    const sin = { ...recep, permissions: ['members.read'] as Permission[] }
    expect(canSee(COBRAR, canOf(sin))).toBe(false)
  })
  it('sin usuario no tiene permisos', () => {
    expect(hasPermission(null, 'members.read')).toBe(false)
  })
})

describe('isActive', () => {
  it('inicio solo exacto', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/', '/socios')).toBe(false)
  })
  it('subrutas activan su sección, sin falsos prefijos', () => {
    expect(isActive('/socios', '/socios/123')).toBe(true)
    expect(isActive('/socios', '/sociosX')).toBe(false)
  })
})
