import { describe, expect, it } from 'vitest'
import { normalizeCi, validateMember } from './member'

const ok = { fullName: 'Ana Pérez', ci: '1234567', phone: '70011223', email: '', notes: '' }

describe('validateMember', () => {
  it('socio válido: normaliza texto y campos opcionales vacíos → undefined', () => {
    expect(validateMember({ ...ok, fullName: '  Ana   Pérez ', ci: ' 1234567 1a ' })).toEqual({
      ok: true,
      value: { fullName: 'Ana Pérez', ci: '12345671A', phone: '70011223', email: undefined, notes: undefined },
    })
  })
  it('acepta teléfonos con formato', () => {
    for (const phone of ['70011223', '+591 70011223', '(2) 244-5566', '7001-1223']) {
      expect(validateMember({ ...ok, phone }).ok).toBe(true)
    }
  })
  it('solo los 3 campos esenciales son obligatorios', () => {
    expect(validateMember({ fullName: '', ci: '', phone: '', email: '', notes: '' })).toEqual({
      ok: false,
      errors: { fullName: 'El nombre es obligatorio', ci: 'El CI es obligatorio', phone: 'El teléfono es obligatorio' },
    })
  })
  it.each(['123', 'abc def!', '12'])('CI inválido "%s"', (ci) => {
    const r = validateMember({ ...ok, ci })
    expect(!r.ok && r.errors.ci).toBeTruthy()
  })
  it('CI con guion y letra es válido', () => {
    expect(validateMember({ ...ok, ci: '1234567-1A' }).ok).toBe(true)
  })
  it.each(['abc', '123', '1234567890123456', '7001@1223'])('teléfono inválido "%s"', (phone) => {
    const r = validateMember({ ...ok, phone })
    expect(!r.ok && r.errors.phone).toBeTruthy()
  })
  it('correo: opcional pero con formato', () => {
    expect(validateMember({ ...ok, email: 'ana@mail.com' }).ok).toBe(true)
    const r = validateMember({ ...ok, email: 'ana@' })
    expect(!r.ok && r.errors.email).toBe('Correo inválido')
  })
  it('nombre de una letra y notas largas', () => {
    const r = validateMember({ ...ok, fullName: 'A', notes: 'x'.repeat(501) })
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['fullName', 'notes'])
  })
  it('normalizeCi', () => expect(normalizeCi(' 12 34a ')).toBe('1234A'))
})
