/**
 * Exportación de todos los datos del gimnasio: Excel (.xlsx, una hoja por tabla), CSV por tabla y copia en JSON.
 * Pensado para trazabilidad y respaldo propio: lo anulado se incluye siempre, con su motivo.
 */
import { csvMoney, csvText, toCsv } from './csv'
import type { BackupData } from './data/types'
import { membershipState, timestampToISODate, formatTime } from './dates'
import { MEMBER_STATUS_LABEL, MOVEMENT_TYPE_LABEL, PAYMENT_METHOD_LABEL } from './labels'
import { buildXlsx } from './xlsx'
import type { Cell } from './xlsx'

export type ExportTable = 'socios' | 'membresias' | 'pagos' | 'movimientos'

export interface TableData {
  key: ExportTable
  /** Nombre de la hoja de Excel. */
  title: string
  header: string[]
  rows: Cell[][]
}

const STATE_LABEL = { active: 'Vigente', expiring: 'Por vencer', expired: 'Vencida' } as const
const RECORD_LABEL = { confirmed: 'Confirmado', voided: 'Anulado' } as const

export function backupTables(b: BackupData): TableData[] {
  const today = timestampToISODate(b.exportedAt)
  return [
    {
      key: 'socios',
      title: 'Socios',
      header: ['CI', 'Nombre', 'Teléfono', 'Correo', 'Estado', 'Fecha de alta', 'Observaciones'],
      rows: b.members.map((m) => [m.ci, m.fullName, m.phone, m.email, MEMBER_STATUS_LABEL[m.status], m.joinedOn, m.notes]),
    },
    {
      key: 'membresias',
      title: 'Membresías',
      header: ['Socio', 'CI', 'Plan', 'Inicio', 'Fin', 'Precio (Bs)', 'Descuento (Bs)', 'Total (Bs)', 'Pagado (Bs)', 'Saldo (Bs)', 'Estado'],
      rows: b.memberships.map((m) => [
        m.memberName, m.memberCi, m.planName, m.startDate, m.endDate,
        { cents: m.priceCents }, { cents: m.discountCents }, { cents: m.priceCents - m.discountCents },
        { cents: m.paidCents }, { cents: m.dueCents },
        m.status === 'cancelled' ? 'Cancelada' : STATE_LABEL[membershipState(m.endDate, today)],
      ]),
    },
    {
      key: 'pagos',
      title: 'Pagos',
      header: ['Recibo', 'Fecha', 'Hora', 'Socio', 'CI', 'Método', 'Monto (Bs)', 'Estado', 'Motivo de anulación'],
      rows: [...b.payments]
        .sort((x, y) => x.receiptNo - y.receiptNo)
        .map((p) => [
          p.receiptNo, timestampToISODate(p.paidAt), formatTime(p.paidAt), p.memberName, p.memberCi,
          PAYMENT_METHOD_LABEL[p.method], { cents: p.amountCents }, RECORD_LABEL[p.status], p.voidReason,
        ]),
    },
    {
      key: 'movimientos',
      title: 'Movimientos',
      header: ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Método', 'Monto (Bs)', 'Estado', 'Motivo de anulación', 'Registrado por'],
      rows: [...b.movements]
        .sort((x, y) => (x.occurredOn < y.occurredOn ? -1 : x.occurredOn > y.occurredOn ? 1 : 0))
        .map((m) => [
          m.occurredOn, MOVEMENT_TYPE_LABEL[m.type], m.categoryName, m.description, PAYMENT_METHOD_LABEL[m.method],
          { cents: m.type === 'expense' ? -m.amountCents : m.amountCents }, RECORD_LABEL[m.status], m.voidReason, m.createdByName,
        ]),
    },
  ]
}

/** Hoja de portada: de dónde y cuándo salió la copia, y cuántos registros trae. */
function infoSheet(b: BackupData) {
  const voided = (xs: { status: string }[]) => xs.filter((x) => x.status === 'voided').length
  const when = `${timestampToISODate(b.exportedAt)} ${formatTime(b.exportedAt)}`
  return {
    name: 'Resumen',
    header: ['Dato', 'Valor'],
    rows: [
      ['Gimnasio', b.gym.name],
      ['Dirección', b.gym.address],
      ['Teléfono', b.gym.phone],
      ['Copia generada', when],
      ['Socios', b.members.length],
      ['Membresías', b.memberships.length],
      ['Pagos', `${b.payments.length} (${voided(b.payments)} anulados)`],
      ['Movimientos', `${b.movements.length} (${voided(b.movements)} anulados)`],
      ['Nota', 'Los pagos y movimientos anulados se conservan con su motivo. Los egresos figuran en negativo.'],
    ] as Cell[][],
  }
}

export function backupXlsx(b: BackupData): Uint8Array {
  const sheets = [infoSheet(b), ...backupTables(b).map(({ title, header, rows }) => ({ name: title, header, rows }))]
  return buildXlsx(sheets)
}

const csvCell = (c: Cell): string => {
  if (c === null || c === undefined) return ''
  if (typeof c === 'number') return String(c)
  if (typeof c === 'object') return csvMoney(c.cents)
  if (/^\d{4}-\d{2}-\d{2}$/.test(c) || /^\d{2}:\d{2}$/.test(c)) return c // fecha/hora ISO: sin comillas, igual que en reportes
  return csvText(c)
}

export function backupCsv(b: BackupData, table: ExportTable): string {
  const t = backupTables(b).find((x) => x.key === table)
  if (!t) throw new Error(`Tabla desconocida: ${table}`)
  return toCsv(t.header, t.rows.map((r) => r.map(csvCell)))
}

export const backupJson = (b: BackupData): string => JSON.stringify(b, null, 2)

/** `fit-center-sucre_datos_2026-11-06.xlsx` — nombre del gimnasio sin tildes ni símbolos. */
export function backupFileName(b: BackupData, kind: 'datos' | ExportTable, ext: 'xlsx' | 'csv' | 'json'): string {
  const slug =
    b.gym.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gimnasio'
  return `${slug}_${kind}_${timestampToISODate(b.exportedAt)}.${ext}`
}
