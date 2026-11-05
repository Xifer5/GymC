import { describe, expect, it } from 'vitest'
import { validateCategoryName, validateGym, validateStaff } from './settings'

describe('validateGym', () => {
  it('recorta y acepta opcionales vacíos', () => {
    expect(validateGym({ name: ' Fit ', address: '', phone: ' ' })).toEqual({ ok: true, value: { name: 'Fit', address: '', phone: '' } })
  })
  it('exige nombre y limita longitudes', () => {
    const r = validateGym({ name: ' ', address: 'x'.repeat(121), phone: 'y'.repeat(31) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['address', 'name', 'phone'])
  })
})

describe('validateCategoryName', () => {
  it('limpia, exige y limita', () => {
    expect(validateCategoryName('  Limpieza ')).toEqual({ ok: true, name: 'Limpieza' })
    expect(validateCategoryName(' ').ok).toBe(false)
    expect(validateCategoryName('x'.repeat(41)).ok).toBe(false)
    expect(validateCategoryName('x'.repeat(40)).ok).toBe(true)
  })
})

describe('validateStaff', () => {
  const ok = { fullName: ' Rosa Q. ', email: ' Rosa@Gym.local ', password: 'clave1234' }
  it('alta válida normaliza correo y nombre', () => {
    expect(validateStaff(ok, true)).toEqual({ ok: true, value: { fullName: 'Rosa Q.', email: 'rosa@gym.local', password: 'clave1234' } })
  })
  it('alta: correo y contraseña', () => {
    expect(validateStaff({ ...ok, email: 'mal' }, true).ok).toBe(false)
    expect(validateStaff({ ...ok, email: '' }, true).ok).toBe(false)
    expect(validateStaff({ ...ok, password: '1234567' }, true).ok).toBe(false)
    expect(validateStaff({ ...ok, password: '' }, true).ok).toBe(false)
  })
  it('edición: solo valida el nombre', () => {
    expect(validateStaff({ fullName: 'Rosa', email: '', password: '' }, false).ok).toBe(true)
    expect(validateStaff({ fullName: ' ', email: '', password: '' }, false).ok).toBe(false)
  })
})
