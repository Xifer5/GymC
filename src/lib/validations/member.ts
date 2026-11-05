import type { MemberInput } from '../data/types'

export interface MemberFormValues {
  fullName: string
  ci: string
  phone: string
  email: string
  notes: string
}
export type MemberFormErrors = Partial<Record<keyof MemberFormValues, string>>

export const MEMBER_LIMITS = { nameMin: 2, nameMax: 80, ciMin: 5, ciMax: 20, notesMax: 500 } as const

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CI = /^[A-Za-z0-9-]+$/
const PHONE_CHARS = /^[\d+\s\-()]+$/

/** CI normalizado: sin espacios y en mayúsculas ("1234567 1a" → "12345671A"). */
export const normalizeCi = (ci: string) => ci.replace(/\s+/g, '').toUpperCase()

export function validateMember(
  v: MemberFormValues,
): { ok: true; value: MemberInput } | { ok: false; errors: MemberFormErrors } {
  const errors: MemberFormErrors = {}

  const fullName = v.fullName.trim().replace(/\s+/g, ' ')
  if (!fullName) errors.fullName = 'El nombre es obligatorio'
  else if (fullName.length < MEMBER_LIMITS.nameMin) errors.fullName = 'Escribe el nombre completo'
  else if (fullName.length > MEMBER_LIMITS.nameMax) errors.fullName = `Máximo ${MEMBER_LIMITS.nameMax} caracteres`

  const ci = normalizeCi(v.ci)
  if (!ci) errors.ci = 'El CI es obligatorio'
  else if (!CI.test(ci)) errors.ci = 'Solo letras, números y guion'
  else if (ci.length < MEMBER_LIMITS.ciMin || ci.length > MEMBER_LIMITS.ciMax) {
    errors.ci = `Debe tener entre ${MEMBER_LIMITS.ciMin} y ${MEMBER_LIMITS.ciMax} caracteres`
  }

  const phone = v.phone.trim()
  const digits = phone.replace(/\D/g, '').length
  if (!phone) errors.phone = 'El teléfono es obligatorio'
  else if (!PHONE_CHARS.test(phone) || digits < 7 || digits > 15) errors.phone = 'Teléfono inválido (ej. 70011223)'

  const email = v.email.trim()
  if (email && !EMAIL.test(email)) errors.email = 'Correo inválido'

  const notes = v.notes.trim()
  if (notes.length > MEMBER_LIMITS.notesMax) errors.notes = `Máximo ${MEMBER_LIMITS.notesMax} caracteres`

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { fullName, ci, phone, email: email || undefined, notes: notes || undefined } }
}
