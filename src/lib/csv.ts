import type { Cents } from './money'

/** Texto de celda seguro: comillas dobles y sin que Excel lo interprete como fórmula (`= + - @`). */
export function csvText(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return `"${safe.replace(/"/g, '""')}"`
}

/** Importe con coma decimal, sin separador de miles (Excel en español lo reconoce como número). */
export function csvMoney(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

/**
 * CSV para Excel en español: separador `;`, BOM UTF-8, saltos CRLF. Las celdas ya deben venir
 * formateadas (`csvText`/`csvMoney`) o ser texto simple sin `;`.
 */
export function toCsv(header: string[], rows: string[][]): string {
  return '﻿' + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n') + '\r\n'
}
