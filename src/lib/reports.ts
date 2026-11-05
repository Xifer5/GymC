import type { ISODate } from './dates'
import { addDays, diffDays } from './dates'
import type { LedgerEntry, PaymentMethod } from './data/types'
import type { Cents } from './money'

export interface CategoryTotal {
  category: string
  cents: Cents
}
export interface DayTotal {
  date: ISODate
  incomeCents: Cents
  expenseCents: Cents
}
export interface Report {
  incomeCents: Cents
  expenseCents: Cents
  balanceCents: Cents
  incomeByMethod: Record<PaymentMethod, Cents>
  expenseByMethod: Record<PaymentMethod, Cents>
  /** Ingresos agrupados por categoría (los pagos de socios van como "Membresías"), de mayor a menor. */
  incomeByCategory: CategoryTotal[]
  expenseByCategory: CategoryTotal[]
  /** Un elemento por día del rango (días sin movimiento en 0). */
  byDay: DayTotal[]
}

const zeroMethods = (): Record<PaymentMethod, Cents> => ({ cash: 0, transfer: 0, qr: 0 })

function group(entries: LedgerEntry[]): CategoryTotal[] {
  const m = new Map<string, Cents>()
  for (const e of entries) m.set(e.category, (m.get(e.category) ?? 0) + e.amountCents)
  return [...m]
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents || a.category.localeCompare(b.category))
}

/** Agrega el libro de caja de un rango. `from`/`to` definen los días de la serie diaria. */
export function buildReport(entries: LedgerEntry[], from: ISODate, to: ISODate): Report {
  const incomes = entries.filter((e) => e.kind !== 'expense')
  const expenses = entries.filter((e) => e.kind === 'expense')
  const incomeByMethod = zeroMethods()
  const expenseByMethod = zeroMethods()
  for (const e of incomes) incomeByMethod[e.method] += e.amountCents
  for (const e of expenses) expenseByMethod[e.method] += e.amountCents

  const days = Math.max(0, diffDays(from, to)) + 1
  const byDay: DayTotal[] = Array.from({ length: days }, (_, i) => ({ date: addDays(from, i), incomeCents: 0, expenseCents: 0 }))
  for (const e of entries) {
    const i = diffDays(from, e.date)
    if (i < 0 || i >= days) continue
    if (e.kind === 'expense') byDay[i].expenseCents += e.amountCents
    else byDay[i].incomeCents += e.amountCents
  }

  const incomeCents = incomes.reduce((n, e) => n + e.amountCents, 0)
  const expenseCents = expenses.reduce((n, e) => n + e.amountCents, 0)
  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    incomeByMethod,
    expenseByMethod,
    incomeByCategory: group(incomes),
    expenseByCategory: group(expenses),
    byDay,
  }
}

const KIND_LABEL: Record<LedgerEntry['kind'], string> = { payment: 'Pago de socio', income: 'Ingreso', expense: 'Egreso' }
const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Efectivo', transfer: 'Transferencia', qr: 'QR' }

/** Texto de celda seguro: comillas dobles y sin que Excel lo interprete como fórmula (`= + - @`). */
function textCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return `"${safe.replace(/"/g, '""')}"`
}

/** Importe con coma decimal, sin separador de miles (Excel en español lo reconoce como número). */
function numberCell(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

const signed = (e: LedgerEntry): Cents => (e.kind === 'expense' ? -e.amountCents : e.amountCents)

/**
 * CSV para Excel en español: separador `;`, BOM UTF-8, importe con signo (egresos negativos).
 * Termina con una fila de total (el balance).
 */
export function ledgerToCsv(entries: LedgerEntry[]): string {
  const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Método', 'Importe (Bs)'].join(';')
  const rows = entries.map((e) =>
    [
      e.date,
      textCell(KIND_LABEL[e.kind]),
      textCell(e.category),
      textCell(e.description),
      textCell(METHOD_LABEL[e.method]),
      numberCell(signed(e)),
    ].join(';'),
  )
  const balance = entries.reduce((n, e) => n + signed(e), 0)
  const total = ['', '', '', textCell('BALANCE'), '', numberCell(balance)].join(';')
  return '﻿' + [header, ...rows, total].join('\r\n') + '\r\n'
}

export const csvFileName = (from: ISODate, to: ISODate) => `reporte_${from}_${to}.csv`
