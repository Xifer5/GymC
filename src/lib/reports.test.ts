import { describe, expect, it } from 'vitest'
import type { LedgerEntry } from './data/types'
import { buildReport, ledgerToCsv } from './reports'

let n = 0
const e = (p: Partial<LedgerEntry> & Pick<LedgerEntry, 'date' | 'kind' | 'amountCents'>): LedgerEntry => ({
  id: String(++n), category: 'Membresías', description: 'x', method: 'cash', ...p,
})

const entries: LedgerEntry[] = [
  e({ date: '2026-11-01', kind: 'payment', amountCents: 15000, method: 'cash' }),
  e({ date: '2026-11-01', kind: 'payment', amountCents: 5000, method: 'qr' }),
  e({ date: '2026-11-03', kind: 'income', amountCents: 3000, category: 'Venta de productos', method: 'cash' }),
  e({ date: '2026-11-03', kind: 'expense', amountCents: 12000, category: 'Servicios', method: 'transfer' }),
  e({ date: '2026-11-03', kind: 'expense', amountCents: 2000, category: 'Servicios', method: 'cash' }),
]

describe('buildReport', () => {
  const r = buildReport(entries, '2026-11-01', '2026-11-04')
  it('totales y balance', () => {
    expect(r.incomeCents).toBe(23000)
    expect(r.expenseCents).toBe(14000)
    expect(r.balanceCents).toBe(9000)
  })
  it('por método', () => {
    expect(r.incomeByMethod).toEqual({ cash: 18000, transfer: 0, qr: 5000 })
    expect(r.expenseByMethod).toEqual({ cash: 2000, transfer: 12000, qr: 0 })
  })
  it('por categoría, de mayor a menor', () => {
    expect(r.incomeByCategory).toEqual([
      { category: 'Membresías', cents: 20000 },
      { category: 'Venta de productos', cents: 3000 },
    ])
    expect(r.expenseByCategory).toEqual([{ category: 'Servicios', cents: 14000 }])
  })
  it('serie diaria con días vacíos', () => {
    expect(r.byDay.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'])
    expect(r.byDay.map((d) => d.incomeCents)).toEqual([20000, 0, 3000, 0])
    expect(r.byDay.map((d) => d.expenseCents)).toEqual([0, 0, 14000, 0])
  })
  it('rango vacío no falla', () => {
    const empty = buildReport([], '2026-11-01', '2026-11-01')
    expect(empty.balanceCents).toBe(0)
    expect(empty.byDay).toHaveLength(1)
  })
})

describe('ledgerToCsv', () => {
  const csv = ledgerToCsv(entries)
  const lines = csv.trimEnd().split('\r\n')
  it('BOM, separador ; y fila de balance', () => {
    expect(csv.startsWith('﻿Fecha;Tipo;')).toBe(true)
    expect(lines).toHaveLength(entries.length + 2)
    expect(lines[lines.length - 1]).toBe(';;;"BALANCE";;90,00')
  })
  it('egresos en negativo y coma decimal', () => {
    expect(lines[1]).toBe('2026-11-01;"Pago de socio";"Membresías";"x";"Efectivo";150,00')
    expect(lines[4]).toBe('2026-11-03;"Egreso";"Servicios";"x";"Transferencia";-120,00')
  })
  it('escapa comillas y neutraliza fórmulas', () => {
    const out = ledgerToCsv([
      e({ date: '2026-11-01', kind: 'expense', amountCents: 5, description: '=HYPERLINK("http://x")' }),
      e({ date: '2026-11-01', kind: 'income', amountCents: 5, description: 'Agua "grande"; fría' }),
    ])
    expect(out).toContain(`"'=HYPERLINK(""http://x"")"`)
    expect(out).toContain('"Agua ""grande""; fría"')
    expect(out).toContain('-0,05')
  })
})
