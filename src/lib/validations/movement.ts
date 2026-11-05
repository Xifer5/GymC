import { isValidISODate } from '../dates'
import type { ISODate } from '../dates'
import { parseMoney } from '../money'
import type { Cents } from '../money'

export interface MovementFormValues {
  categoryId: string
  description: string
  amount: string
  date: string
}
export type MovementFormErrors = Partial<Record<keyof MovementFormValues, string>>

export const MOVEMENT_LIMITS = { descriptionMax: 120, amountMaxCents: 1_000_000_000 } as const

export interface MovementValue {
  categoryId: string
  description: string
  amountCents: Cents
  occurredOn: ISODate
}

/** Valida un ingreso/egreso. `today` evita fechas futuras. */
export function validateMovement(
  v: MovementFormValues,
  today: ISODate,
): { ok: true; value: MovementValue } | { ok: false; errors: MovementFormErrors } {
  const errors: MovementFormErrors = {}

  if (!v.categoryId) errors.categoryId = 'Selecciona una categoría'

  const description = v.description.trim()
  if (!description) errors.description = 'La descripción es obligatoria'
  else if (description.length > MOVEMENT_LIMITS.descriptionMax) {
    errors.description = `Máximo ${MOVEMENT_LIMITS.descriptionMax} caracteres`
  }

  const amountText = v.amount.trim()
  const amountCents = parseMoney(amountText)
  if (!amountText) errors.amount = 'Ingresa el monto'
  else if (amountCents === null) errors.amount = 'Monto inválido (ej. 150 o 150,50)'
  else if (amountCents <= 0) errors.amount = 'El monto debe ser mayor a 0'
  else if (amountCents > MOVEMENT_LIMITS.amountMaxCents) errors.amount = 'El monto es demasiado alto'

  if (!isValidISODate(v.date)) errors.date = 'Fecha inválida'
  else if (v.date > today) errors.date = 'La fecha no puede ser futura'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { categoryId: v.categoryId, description, amountCents: amountCents!, occurredOn: v.date } }
}
