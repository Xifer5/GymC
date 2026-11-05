import { isValidISODate } from '../dates'
import type { ISODate } from '../dates'
import type { Plan } from '../data/types'
import { formatMoney, parseMoney } from '../money'
import type { Cents } from '../money'

export interface ChargeTotals {
  priceCents: Cents
  discountCents: Cents
  /** Precio − descuento. */
  totalCents: Cents
  discountError?: string
}

/** Totales del plan elegido con el descuento escrito por el usuario (texto libre, opcional). */
export function chargeTotals(plan: Plan | undefined, discountText: string): ChargeTotals {
  const priceCents = plan?.priceCents ?? 0
  const text = discountText.trim()
  if (!text) return { priceCents, discountCents: 0, totalCents: priceCents }
  const discount = parseMoney(text)
  if (discount === null) {
    return { priceCents, discountCents: 0, totalCents: priceCents, discountError: 'Descuento inválido (ej. 20 o 20,50)' }
  }
  if (discount > priceCents) {
    return { priceCents, discountCents: 0, totalCents: priceCents, discountError: 'El descuento no puede superar el precio' }
  }
  return { priceCents, discountCents: discount, totalCents: priceCents - discount }
}

export interface PlanChargeValues {
  planId: string
  startDate: string
  discount: string
  paid: string
}
export type PlanChargeErrors = Partial<Record<keyof PlanChargeValues, string>>

/** Valida el monto a cobrar: > 0 y sin superar `maxCents` (lo que todavía se puede pagar). */
function validatePaid(
  text: string,
  maxCents: Cents,
  maxLabel: string,
): { ok: true; cents: Cents } | { ok: false; error: string } {
  const t = text.trim()
  if (!t) return { ok: false, error: 'Ingresa el monto a cobrar' }
  const cents = parseMoney(t)
  if (cents === null) return { ok: false, error: 'Monto inválido (ej. 150 o 150,50)' }
  if (cents <= 0) return { ok: false, error: 'El monto debe ser mayor a 0' }
  if (cents > maxCents) return { ok: false, error: `No puede superar ${maxLabel} ${formatMoney(maxCents)}` }
  return { ok: true, cents }
}

/** Nueva membresía + primer pago (puede ser parcial). */
export function validatePlanCharge(
  v: PlanChargeValues,
  plan: Plan | undefined,
):
  | { ok: true; value: { planId: string; startDate: ISODate; discountCents: Cents; paidCents: Cents } }
  | { ok: false; errors: PlanChargeErrors } {
  const errors: PlanChargeErrors = {}
  if (!plan || !v.planId) errors.planId = 'Selecciona un plan'

  if (!isValidISODate(v.startDate)) errors.startDate = 'Fecha inválida'

  const totals = chargeTotals(plan, v.discount)
  if (totals.discountError) errors.discount = totals.discountError

  let paidCents = 0
  if (plan) {
    if (totals.totalCents <= 0) {
      errors.paid = 'El total a cobrar es Bs 0,00: no se puede registrar un pago. Revisa el precio o el descuento.'
    } else {
      const paid = validatePaid(v.paid, totals.totalCents, 'el total de')
      if (paid.ok) paidCents = paid.cents
      else errors.paid = paid.error
    }
  } else if (!v.paid.trim()) {
    errors.paid = 'Ingresa el monto a cobrar'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { planId: v.planId, startDate: v.startDate, discountCents: totals.discountCents, paidCents } }
}

/** Pago de saldo pendiente de una membresía existente. */
export function validateBalancePayment(
  paidText: string,
  dueCents: Cents,
): { ok: true; paidCents: Cents } | { ok: false; error: string } {
  const r = validatePaid(paidText, dueCents, 'el saldo de')
  return r.ok ? { ok: true, paidCents: r.cents } : { ok: false, error: r.error }
}
