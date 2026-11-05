import { parseMoney } from '../money'
import type { PlanInput } from '../data/types'

/** Valores tal como los escribe el usuario (todo texto). */
export interface PlanFormValues {
  name: string
  days: string
  price: string
  description: string
}
export type PlanFormErrors = Partial<Record<keyof PlanFormValues, string>>

export const PLAN_LIMITS = { nameMax: 40, descriptionMax: 200, daysMax: 3650, priceMaxCents: 100_000_000 } as const

export function validatePlan(v: PlanFormValues): { ok: true; value: PlanInput } | { ok: false; errors: PlanFormErrors } {
  const errors: PlanFormErrors = {}

  const name = v.name.trim()
  if (!name) errors.name = 'El nombre es obligatorio'
  else if (name.length > PLAN_LIMITS.nameMax) errors.name = `Máximo ${PLAN_LIMITS.nameMax} caracteres`

  const daysText = v.days.trim()
  const days = /^\d+$/.test(daysText) ? Number(daysText) : NaN
  if (!daysText) errors.days = 'Ingresa la duración en días'
  else if (!Number.isInteger(days) || days < 1 || days > PLAN_LIMITS.daysMax) {
    errors.days = `Debe ser un número entero entre 1 y ${PLAN_LIMITS.daysMax}`
  }

  const priceText = v.price.trim()
  const priceCents = parseMoney(priceText)
  if (!priceText) errors.price = 'Ingresa el precio'
  else if (priceCents === null) errors.price = 'Precio inválido (ej. 150 o 150,50)'
  else if (priceCents > PLAN_LIMITS.priceMaxCents) errors.price = 'El precio es demasiado alto'

  const description = v.description.trim()
  if (description.length > PLAN_LIMITS.descriptionMax) {
    errors.description = `Máximo ${PLAN_LIMITS.descriptionMax} caracteres`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { name, durationDays: days, priceCents: priceCents!, description: description || undefined },
  }
}
