import { describe, expect, it } from 'vitest'
import {
  addDays, diffDays, expiryText, formatDate, formatTime, isValidISODate, membershipEnd, membershipState, monthRange, renewalStart,
  timestampToISODate, todayISO,
} from './dates'

describe('todayISO (zona La Paz, UTC-4)', () => {
  it('a las 02:00 UTC todavía es el día anterior en La Paz', () => {
    expect(todayISO('America/La_Paz', new Date('2026-03-05T02:00:00Z'))).toBe('2026-03-04')
  })
  it('a las 04:00 UTC ya es el día nuevo', () => {
    expect(todayISO('America/La_Paz', new Date('2026-03-05T04:00:00Z'))).toBe('2026-03-05')
  })
  it('timestampToISODate', () => {
    expect(timestampToISODate('2026-12-31T23:30:00-04:00')).toBe('2026-12-31')
  })
})

describe('aritmética de fechas', () => {
  it('addDays cruza mes y año', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('diffDays', () => {
    expect(diffDays('2026-03-01', '2026-03-08')).toBe(7)
    expect(diffDays('2026-03-08', '2026-03-01')).toBe(-7)
  })
  it('membershipEnd cuenta el día de inicio', () => {
    expect(membershipEnd('2026-01-01', 30)).toBe('2026-01-30')
    expect(membershipEnd('2026-01-01', 1)).toBe('2026-01-01')
    expect(() => membershipEnd('2026-01-01', 0)).toThrow()
  })
})

describe('renovación y estado', () => {
  const today = '2026-03-10'
  it('renewalStart', () => {
    expect(renewalStart(null, today)).toBe(today)
    expect(renewalStart('2026-03-20', today)).toBe('2026-03-21')
    expect(renewalStart('2026-03-01', today)).toBe(today)
    expect(renewalStart('2026-03-10', today)).toBe('2026-03-11')
  })
  it('membershipState', () => {
    expect(membershipState('2026-03-09', today)).toBe('expired')
    expect(membershipState('2026-03-10', today)).toBe('expiring')
    expect(membershipState('2026-03-17', today)).toBe('expiring')
    expect(membershipState('2026-03-18', today)).toBe('active')
    expect(membershipState('2026-03-18', today, 10)).toBe('expiring')
  })
})

describe('isValidISODate', () => {
  it('acepta fechas reales', () => {
    for (const d of ['2026-03-05', '2024-02-29', '2026-12-31']) expect(isValidISODate(d)).toBe(true)
  })
  it('rechaza formatos y fechas imposibles', () => {
    for (const d of ['', '5/3/2026', '2026-3-5', '2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', 'abcd-ef-gh']) {
      expect(isValidISODate(d)).toBe(false)
    }
  })
})

describe('formatTime', () => {
  it('usa la zona La Paz (UTC-4)', () => {
    expect(formatTime('2026-03-05T18:30:00Z')).toBe('14:30')
    expect(formatTime('2026-03-05T02:05:00Z')).toBe('22:05')
  })
})

describe('rangos y formato', () => {
  it('monthRange', () => {
    expect(monthRange('2026-02-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2024-02-10').to).toBe('2024-02-29')
    expect(monthRange('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
  it('formatDate', () => expect(formatDate('2026-03-05')).toBe('05/03/2026'))
})

describe('expiryText', () => {
  it('describe el vencimiento en días', () => {
    expect(expiryText('2026-11-05', '2026-11-05')).toBe('vence hoy')
    expect(expiryText('2026-11-06', '2026-11-05')).toBe('vence en 1 día')
    expect(expiryText('2026-11-08', '2026-11-05')).toBe('vence en 3 días')
    expect(expiryText('2026-11-04', '2026-11-05')).toBe('venció hace 1 día')
    expect(expiryText('2026-10-24', '2026-11-05')).toBe('venció hace 12 días')
  })
})
