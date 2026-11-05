import { describe, expect, it } from 'vitest'
import { validatePlan } from './plan'

const ok = { name: 'Mensual', days: '30', price: '150', description: '' }

describe('validatePlan', () => {
  it('plan válido: convierte a centavos y recorta texto', () => {
    const r = validatePlan({ name: '  Mensual ', days: '30', price: '1.234,50', description: ' todo incluido ' })
    expect(r).toEqual({
      ok: true,
      value: { name: 'Mensual', durationDays: 30, priceCents: 123450, description: 'todo incluido' },
    })
  })
  it('descripción vacía → undefined', () => {
    const r = validatePlan(ok)
    expect(r.ok && r.value.description).toBeUndefined()
  })
  it('precio 0 es válido (plan gratuito/cortesía)', () => {
    const r = validatePlan({ ...ok, price: '0' })
    expect(r.ok && r.value.priceCents).toBe(0)
  })
  it('campos vacíos', () => {
    const r = validatePlan({ name: ' ', days: '', price: '', description: '' })
    expect(r).toEqual({
      ok: false,
      errors: { name: 'El nombre es obligatorio', days: 'Ingresa la duración en días', price: 'Ingresa el precio' },
    })
  })
  it.each(['0', '-5', '1.5', 'abc', '3651', '1e3'])('duración inválida "%s"', (days) => {
    const r = validatePlan({ ...ok, days })
    expect(!r.ok && r.errors.days).toBeTruthy()
  })
  it.each(['abc', '-10', '12,345,6', '99999999999'])('precio inválido "%s"', (price) => {
    const r = validatePlan({ ...ok, price })
    expect(!r.ok && r.errors.price).toBeTruthy()
  })
  it('límites de longitud', () => {
    const r = validatePlan({ ...ok, name: 'x'.repeat(41), description: 'y'.repeat(201) })
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['description', 'name'])
  })
})
