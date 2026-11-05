/**
 * Fechas "de calendario" como string ISO `YYYY-MM-DD` en la zona horaria del gimnasio.
 * Evita desfases por UTC: "hoy" y "mes" se calculan con la zona del gimnasio, no la del navegador.
 */
export const GYM_TZ = 'America/La_Paz'

export type ISODate = string
export type MembershipState = 'active' | 'expiring' | 'expired'

const MS_DAY = 86_400_000

function toUTC(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Fecha de hoy en la zona del gimnasio. `now` inyectable para tests. */
export function todayISO(tz: string = GYM_TZ, now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTC(toUTC(iso) + days * MS_DAY)
}

/** Días de a → b (positivo si b es posterior). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / MS_DAY)
}

/** Fin de membresía: el día de inicio cuenta. Mensual 30 días desde 01-ene → 30-ene. */
export function membershipEnd(start: ISODate, durationDays: number): ISODate {
  if (durationDays < 1) throw new Error('Duración inválida')
  return addDays(start, durationDays - 1)
}

/** Inicio sugerido al renovar: día siguiente al último vencimiento, o hoy si ya venció. */
export function renewalStart(lastEnd: ISODate | null, today: ISODate): ISODate {
  if (!lastEnd) return today
  const next = addDays(lastEnd, 1)
  return next > today ? next : today
}

/** active · expiring (vence en ≤ soonDays) · expired (fin anterior a hoy). */
export function membershipState(end: ISODate, today: ISODate, soonDays = 7): MembershipState {
  if (end < today) return 'expired'
  return diffDays(today, end) <= soonDays ? 'expiring' : 'active'
}

/** Primer y último día del mes de `iso`. */
export function monthRange(iso: ISODate): { from: ISODate; to: ISODate } {
  const [y, m] = iso.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const to = fromUTC(Date.UTC(y, m, 0))
  return { from, to }
}

/** "2026-03-05" → "05/03/2026" */
export function formatDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Timestamp (ej. paid_at) → fecha ISO en la zona del gimnasio. */
export function timestampToISODate(ts: string | Date, tz: string = GYM_TZ): ISODate {
  return todayISO(tz, typeof ts === 'string' ? new Date(ts) : ts)
}

/** true si `s` es una fecha de calendario real con formato YYYY-MM-DD (rechaza 2026-02-30). */
export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Hora (HH:mm) de un timestamp en la zona del gimnasio. */
export function formatTime(ts: string | Date, tz: string = GYM_TZ): string {
  return new Intl.DateTimeFormat('es-BO', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    typeof ts === 'string' ? new Date(ts) : ts,
  )
}

/** Texto relativo al vencimiento: "vence hoy", "vence en 3 días", "venció hace 12 días". */
export function expiryText(end: ISODate, today: ISODate): string {
  const d = diffDays(today, end)
  if (d === 0) return 'vence hoy'
  const n = Math.abs(d)
  const unit = n === 1 ? 'día' : 'días'
  return d > 0 ? `vence en ${n} ${unit}` : `venció hace ${n} ${unit}`
}
