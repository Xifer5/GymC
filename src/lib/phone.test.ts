import { describe, expect, it } from 'vitest'
import { telUrl, whatsappNumber, whatsappUrl } from './phone'

describe('phone', () => {
  it('añade 591 a números locales de 8 dígitos', () => {
    expect(whatsappNumber('7001 1223')).toBe('59170011223')
    expect(whatsappNumber('70-011-223')).toBe('59170011223')
  })
  it('respeta números que ya traen código', () => {
    expect(whatsappNumber('+591 70011223')).toBe('59170011223')
    expect(whatsappNumber('+54 9 11 5555 1234')).toBe('5491155551234')
  })
  it('rechaza números inválidos', () => {
    expect(whatsappNumber('123')).toBeNull()
    expect(whatsappNumber('')).toBeNull()
    expect(whatsappUrl('abc')).toBeNull()
  })
  it('arma el enlace con texto codificado', () => {
    expect(whatsappUrl('70011223', 'Hola Ana')).toBe('https://wa.me/59170011223?text=Hola%20Ana')
    expect(whatsappUrl('70011223')).toBe('https://wa.me/59170011223')
  })
  it('telUrl deja solo dígitos y +', () => {
    expect(telUrl('+591 7001-1223')).toBe('tel:+59170011223')
  })
})
