/**
 * Dinero: SIEMPRE centavos enteros (number entero, seguro hasta 2^53).
 * Nunca hacer aritmética con decimales. Formato boliviano: 1.234,50
 */
export type Cents = number

export function assertCents(v: number): Cents {
  if (!Number.isSafeInteger(v)) throw new Error(`Importe inválido: ${v}`)
  return v
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => acc + assertCents(v), 0)
}

/** Precio − descuento. */
export function netPrice(priceCents: Cents, discountCents: Cents): Cents {
  if (discountCents < 0 || discountCents > priceCents) throw new Error('Descuento inválido')
  return priceCents - discountCents
}

/** Saldo pendiente = neto − pagos confirmados. Nunca negativo. */
export function balanceDue(priceCents: Cents, discountCents: Cents, paidCents: Cents): Cents {
  return Math.max(0, netPrice(priceCents, discountCents) - paidCents)
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function split(cents: Cents) {
  assertCents(cents)
  const abs = Math.abs(cents)
  return {
    neg: cents < 0,
    int: String(Math.floor(abs / 100)),
    frac: String(abs % 100).padStart(2, '0'),
  }
}

/** 123450 → "Bs 1.234,50" · -500 → "-Bs 5,00" */
export function formatMoney(cents: Cents): string {
  const { neg, int, frac } = split(cents)
  return `${neg ? '-' : ''}Bs ${groupThousands(int)},${frac}`
}

/** Para inputs editables: 123450 → "1234,50" (sin separador de miles ni símbolo). */
export function formatMoneyInput(cents: Cents): string {
  const { neg, int, frac } = split(cents)
  return `${neg ? '-' : ''}${int},${frac}`
}

/**
 * Texto del usuario → centavos, o null si no es válido.
 * Acepta: "50", "50,5", "50.5", "1.234,50", "1,234.50", "Bs 1.500".
 * Un único separador seguido de exactamente 3 dígitos se toma como miles ("1.500" = 1500).
 */
export function parseMoney(input: string): Cents | null {
  const s = input.replace(/bs\.?/i, '').replace(/\s/g, '')
  if (!/^\d[\d.,]*$/.test(s)) return null

  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  let thousandsSep: string | null = null
  let decimalSep: string | null = null

  if (hasDot && hasComma) {
    decimalSep = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ','
    thousandsSep = decimalSep === '.' ? ',' : '.'
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ','
    const count = s.split(sep).length - 1
    const after = s.slice(s.lastIndexOf(sep) + 1)
    if (count > 1 || after.length === 3) thousandsSep = sep
    else decimalSep = sep
  }

  let intPart = s
  let fracPart = ''
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep)
    intPart = s.slice(0, idx)
    fracPart = s.slice(idx + 1)
    if (fracPart.length < 1 || fracPart.length > 2 || !/^\d+$/.test(fracPart)) return null
  }
  if (thousandsSep) {
    const groups = intPart.split(thousandsSep)
    const [first, ...rest] = groups
    if (!/^\d{1,3}$/.test(first) || rest.some((g) => !/^\d{3}$/.test(g))) return null
    intPart = groups.join('')
  } else if (!/^\d+$/.test(intPart)) {
    return null
  }

  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}
