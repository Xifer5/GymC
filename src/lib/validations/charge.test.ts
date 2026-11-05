import { describe, expect, it } from 'vitest'
import type { Plan } from '../data/types'
import { chargeTotals, validateBalancePayment, validatePlanCharge } from './charge'

const mensual: Plan = { id: 'p1', name: 'Mensual', durationDays: 30, priceCents: 15000, active: true }
const base = { planId: 'p1', startDate: '2026-03-05', discount: '', paid: '150' }

describe('chargeTotals', () => {
  it('sin descuento', () => expect(chargeTotals(mensual, '')).toEqual({ priceCents: 15000, discountCents: 0, totalCents: 15000 }))
  it('con descuento', () => expect(chargeTotals(mensual, '20,50')).toMatchObject({ discountCents: 2050, totalCents: 12950 }))
  it('sin plan todo es 0', () => expect(chargeTotals(undefined, '').totalCents).toBe(0))
  it('descuento inválido o mayor al precio se ignora y marca error', () => {
    expect(chargeTotals(mensual, 'abc')).toMatchObject({ discountCents: 0, totalCents: 15000 })
    expect(chargeTotals(mensual, 'abc').discountError).toBeTruthy()
    expect(chargeTotals(mensual, '150,01').discountError).toBe('El descuento no puede superar el precio')
  })
  it('descuento igual al precio es válido (total 0)', () => {
    expect(chargeTotals(mensual, '150')).toMatchObject({ discountCents: 15000, totalCents: 0 })
  })
})

describe('validatePlanCharge', () => {
  it('cobro completo', () => {
    expect(validatePlanCharge(base, mensual)).toEqual({
      ok: true,
      value: { planId: 'p1', startDate: '2026-03-05', discountCents: 0, paidCents: 15000 },
    })
  })
  it('pago parcial con descuento', () => {
    const r = validatePlanCharge({ ...base, discount: '30', paid: '50' }, mensual)
    expect(r).toMatchObject({ ok: true, value: { discountCents: 3000, paidCents: 5000 } })
  })
  it('no permite cobrar más que el total (considera el descuento)', () => {
    const r = validatePlanCharge({ ...base, discount: '30', paid: '150' }, mensual)
    expect(!r.ok && r.errors.paid).toContain('Bs 120,00')
  })
  it('sin plan, fecha imposible y monto vacío', () => {
    const r = validatePlanCharge({ planId: '', startDate: '2026-02-30', discount: '', paid: '' }, undefined)
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['paid', 'planId', 'startDate'])
  })
  it.each(['0', '-5', 'abc', '0,00'])('monto inválido "%s"', (paid) => {
    const r = validatePlanCharge({ ...base, paid }, mensual)
    expect(!r.ok && r.errors.paid).toBeTruthy()
  })
  it('total 0 (descuento = precio): no se puede registrar pago', () => {
    const r = validatePlanCharge({ ...base, discount: '150', paid: '10' }, mensual)
    expect(!r.ok && r.errors.paid).toContain('Bs 0,00')
  })
  it('propaga el error del descuento', () => {
    const r = validatePlanCharge({ ...base, discount: 'xx' }, mensual)
    expect(!r.ok && r.errors.discount).toBeTruthy()
  })
})

describe('validateBalancePayment', () => {
  it('paga todo o parte del saldo', () => {
    expect(validateBalancePayment('100', 10000)).toEqual({ ok: true, paidCents: 10000 })
    expect(validateBalancePayment('30,5', 10000)).toEqual({ ok: true, paidCents: 3050 })
  })
  it('rechaza exceso, cero y texto', () => {
    expect(validateBalancePayment('100,01', 10000)).toMatchObject({ ok: false })
    expect(validateBalancePayment('0', 10000)).toMatchObject({ ok: false })
    expect(validateBalancePayment('', 10000)).toMatchObject({ ok: false })
    expect(validateBalancePayment('x', 10000)).toMatchObject({ ok: false })
  })
})
