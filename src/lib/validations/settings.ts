import type { GymInfo, StaffInput } from '../data/types'

export const SETTINGS_LIMITS = { gymNameMax: 60, addressMax: 120, phoneMax: 30, categoryMax: 40, personMax: 60, passwordMin: 8 } as const

export interface GymFormValues {
  name: string
  address: string
  phone: string
}
export type GymFormErrors = Partial<Record<keyof GymFormValues, string>>

export function validateGym(v: GymFormValues): { ok: true; value: GymInfo & { address: string; phone: string } } | { ok: false; errors: GymFormErrors } {
  const errors: GymFormErrors = {}
  const name = v.name.trim()
  const address = v.address.trim()
  const phone = v.phone.trim()
  if (!name) errors.name = 'El nombre es obligatorio'
  else if (name.length > SETTINGS_LIMITS.gymNameMax) errors.name = `Máximo ${SETTINGS_LIMITS.gymNameMax} caracteres`
  if (address.length > SETTINGS_LIMITS.addressMax) errors.address = `Máximo ${SETTINGS_LIMITS.addressMax} caracteres`
  if (phone.length > SETTINGS_LIMITS.phoneMax) errors.phone = `Máximo ${SETTINGS_LIMITS.phoneMax} caracteres`
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { name, address, phone } }
}

/** Nombre de categoría: obligatorio y corto. Devuelve el texto limpio o un error. */
export function validateCategoryName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim()
  if (!name) return { ok: false, error: 'El nombre es obligatorio' }
  if (name.length > SETTINGS_LIMITS.categoryMax) return { ok: false, error: `Máximo ${SETTINGS_LIMITS.categoryMax} caracteres` }
  return { ok: true, name }
}

export interface StaffFormValues {
  fullName: string
  email: string
  password: string
}
export type StaffFormErrors = Partial<Record<keyof StaffFormValues, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Alta de personal (`withCredentials`) o edición (solo nombre). */
export function validateStaff(
  v: StaffFormValues,
  withCredentials: boolean,
): { ok: true; value: Pick<StaffInput, 'fullName' | 'email' | 'password'> } | { ok: false; errors: StaffFormErrors } {
  const errors: StaffFormErrors = {}
  const fullName = v.fullName.trim()
  const email = v.email.trim().toLowerCase()
  if (!fullName) errors.fullName = 'El nombre es obligatorio'
  else if (fullName.length > SETTINGS_LIMITS.personMax) errors.fullName = `Máximo ${SETTINGS_LIMITS.personMax} caracteres`
  if (withCredentials) {
    if (!email) errors.email = 'El correo es obligatorio'
    else if (!EMAIL.test(email)) errors.email = 'Correo inválido'
    if (!v.password) errors.password = 'La contraseña es obligatoria'
    else if (v.password.length < SETTINGS_LIMITS.passwordMin) errors.password = `Mínimo ${SETTINGS_LIMITS.passwordMin} caracteres`
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { fullName, email, password: v.password } }
}
