import type { Permission, Profile } from './data/types'

/** Admin tiene todo; el resto, solo lo que el admin le asignó. Misma regla que `has_perm()` en SQL. */
export function hasPermission(user: Pick<Profile, 'role' | 'permissions'> | null, p: Permission): boolean {
  if (!user) return false
  return user.role === 'admin' || user.permissions.includes(p)
}
