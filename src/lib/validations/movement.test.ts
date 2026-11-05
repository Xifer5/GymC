import { describe, expect, it } from 'vitest'
import { validateMovement } from './movement'

const ok = { categoryId: 'c1', description: 'Luz', amount: '150,50', date: '2026-11-05' }
const TODAY = '2026-11-05'

describe('validateMovement', () => {
  it('acepta datos válidos', () => {
    const r = validateMovement(ok, TODAY)
    expect(r).toEqual({
      ok: true,
      value: { categoryId: 'c1', description: 'Luz', amountCents: 15050, occurredOn: '2026-11-05' },
    })
  })
  it('recorta la descripción', () => {
    const r = validateMovement({ ...ok, description: '  Luz  ' }, TODAY)
    expect(r.ok && r.value.description).toBe('Luz')
  })
  it('exige categoría y descripción', () => {
    const r = validateMovement({ ...ok, categoryId: '', description: '  ' }, TODAY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['categoryId', 'description'])
  })
  it('rechaza montos vacíos, inválidos, cero y excesivos', () => {
    for (const amount of ['', 'abc', '0', '0,00', '99999999999']) {
      expect(validateMovement({ ...ok, amount }, TODAY).ok).toBe(false)
    }
  })
  it('rechaza fechas inválidas o futuras, acepta pasadas', () => {
    expect(validateMovement({ ...ok, date: '' }, TODAY).ok).toBe(false)
    expect(validateMovement({ ...ok, date: '2026-02-30' }, TODAY).ok).toBe(false)
    expect(validateMovement({ ...ok, date: '2026-11-06' }, TODAY).ok).toBe(false)
    expect(validateMovement({ ...ok, date: '2026-10-01' }, TODAY).ok).toBe(true)
  })
  it('limita la descripción a 120 caracteres', () => {
    expect(validateMovement({ ...ok, description: 'x'.repeat(121) }, TODAY).ok).toBe(false)
    expect(validateMovement({ ...ok, description: 'x'.repeat(120) }, TODAY).ok).toBe(true)
  })
})
