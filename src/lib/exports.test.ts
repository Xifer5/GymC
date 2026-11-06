import { describe, expect, it } from 'vitest'
import type { BackupData } from './data/types'
import { backupCsv, backupFileName, backupJson, backupTables, backupXlsx } from './exports'

const base: BackupData = {
  exportedAt: '2026-11-06T16:30:00.000Z', // 12:30 en La Paz
  gym: { name: 'Fit Center Sucre', address: 'Calle Bolívar 123' },
  plans: [],
  categories: [],
  members: [
    { id: 'm1', fullName: 'Ana Vega', ci: '6100000', phone: '70011223', status: 'active', joinedOn: '2026-10-01', notes: '=cmd|x' },
    { id: 'm2', fullName: 'Beto "El Toro" Ríos', ci: '6100001', phone: '71122334', status: 'archived', joinedOn: '2026-09-01' },
  ],
  memberships: [
    { id: 'ms1', memberId: 'm1', memberName: 'Ana Vega', memberCi: '6100000', planId: 'p', planName: 'Mensual', priceCents: 15000, discountCents: 2000, startDate: '2026-10-20', endDate: '2026-11-18', status: 'active', paidCents: 8000, dueCents: 5000 },
    { id: 'ms2', memberId: 'm2', memberName: 'Beto "El Toro" Ríos', memberCi: '6100001', planId: 'p', planName: 'Mensual', priceCents: 15000, discountCents: 0, startDate: '2026-09-01', endDate: '2026-09-30', status: 'active', paidCents: 15000, dueCents: 0 },
  ],
  payments: [
    { id: 'p2', memberId: 'm2', memberName: 'Beto "El Toro" Ríos', memberCi: '6100001', membershipId: 'ms2', receiptNo: 2, amountCents: 15000, method: 'cash', paidAt: '2026-11-05T14:00:00.000Z', status: 'voided', voidReason: 'Cobro duplicado; error', createdByName: 'Carla Rojas', voidedByName: 'Admin Demo', voidedAt: '2026-11-05T15:30:00.000Z' },
    { id: 'p1', memberId: 'm1', memberName: 'Ana Vega', memberCi: '6100000', membershipId: 'ms1', receiptNo: 1, amountCents: 8000, method: 'qr', paidAt: '2026-11-04T03:00:00.000Z', status: 'confirmed' },
  ],
  movements: [
    { id: 'x1', type: 'expense', categoryId: 'c', categoryName: 'Servicios', description: 'Luz', amountCents: 12050, method: 'transfer', occurredOn: '2026-11-03', status: 'confirmed', createdBy: 'u', createdByName: 'Admin Demo', createdAt: '2026-11-03T14:00:00.000Z' },
    { id: 'x0', type: 'income', categoryId: 'c', categoryName: 'Venta de productos', description: 'Agua', amountCents: 600, method: 'cash', occurredOn: '2026-11-01', status: 'confirmed', createdBy: 'u', createdByName: 'Admin Demo' },
  ],
  staff: [{ fullName: 'Admin Demo', email: 'admin@gym.local', role: 'admin', permissions: [], active: true }],
}

describe('exportación de datos', () => {
  const t = Object.fromEntries(backupTables(base).map((x) => [x.key, x]))

  it('una tabla por área con todas las filas, incluso archivados y anulados', () => {
    expect(Object.keys(t)).toEqual(['socios', 'membresias', 'pagos', 'movimientos'])
    expect(t.socios.rows).toHaveLength(2)
    expect(t.socios.rows[1][4]).toBe('Archivado')
    expect(t.pagos.rows).toHaveLength(2)
  })

  it('pagos ordenados por recibo, con hora local y motivo de anulación', () => {
    expect(t.pagos.rows.map((r) => r[0])).toEqual([1, 2])
    // 2026-11-04T03:00Z = 2026-11-03 23:00 en La Paz (UTC-4): la fecha es la del gimnasio, no la UTC
    expect(t.pagos.rows[0].slice(1, 3)).toEqual(['2026-11-03', '23:00'])
    expect(t.pagos.rows[1][7]).toBe('Anulado')
    expect(t.pagos.rows[1][8]).toBe('Cobro duplicado; error')
  })

  it('membresías con total, saldo y estado calculado a la fecha de la copia', () => {
    const [ana, beto] = t.membresias.rows
    expect(ana.slice(5, 11)).toEqual([{ cents: 15000 }, { cents: 2000 }, { cents: 13000 }, { cents: 8000 }, { cents: 5000 }, 'Vigente'])
    expect(beto[10]).toBe('Vencida')
  })

  it('trazabilidad: quién registró y quién anuló, con fecha y hora del gimnasio', () => {
    expect(t.pagos.header.slice(-3)).toEqual(['Registrado por', 'Anulado por', 'Anulado el'])
    expect(t.pagos.rows[1].slice(9)).toEqual(['Carla Rojas', 'Admin Demo', '2026-11-05 11:30'])
    expect(t.movimientos.rows[1].slice(8, 10)).toEqual(['Admin Demo', '2026-11-03 10:00'])
    expect(t.movimientos.rows[1][10]).toBeFalsy()
  })

  it('movimientos por fecha, egresos en negativo', () => {
    expect(t.movimientos.rows.map((r) => r[0])).toEqual(['2026-11-01', '2026-11-03'])
    expect(t.movimientos.rows[1][5]).toEqual({ cents: -12050 })
  })

  it('CSV: BOM, separador ;, comillas escapadas y fórmulas neutralizadas', () => {
    const csv = backupCsv(base, 'socios')
    expect(csv.startsWith('﻿CI;Nombre;')).toBe(true)
    expect(csv).toContain('"Beto ""El Toro"" Ríos"')
    expect(csv).toContain(`"'=cmd|x"`)
    const pagos = backupCsv(base, 'pagos').split('\r\n')
    expect(pagos[1]).toBe('1;2026-11-03;23:00;"Ana Vega";"6100000";"QR";80,00;"Confirmado";;;;')
    expect(pagos[2]).toContain('"Cobro duplicado; error"') // el ; dentro de comillas no rompe la fila
  })

  it('JSON es la copia completa y no trae contraseñas', () => {
    const j = JSON.parse(backupJson(base)) as BackupData
    expect(j.members).toHaveLength(2)
    expect(j.payments.find((p) => p.status === 'voided')?.voidReason).toBe('Cobro duplicado; error')
    expect(backupJson(base)).not.toMatch(/password/i)
  })

  it('Excel: es un ZIP válido (PK) con la portada y las cuatro hojas', () => {
    const x = backupXlsx(base)
    expect(String.fromCharCode(x[0], x[1])).toBe('PK')
    const text = new TextDecoder().decode(x)
    for (const sheet of ['Resumen', 'Socios', 'Membresías', 'Pagos', 'Movimientos']) expect(text).toContain(`<sheet name="${sheet}"`)
  })

  it('nombre de archivo sin tildes ni símbolos y con la fecha del gimnasio', () => {
    expect(backupFileName(base, 'datos', 'xlsx')).toBe('fit-center-sucre_datos_2026-11-06.xlsx')
    expect(backupFileName({ ...base, gym: { name: 'Gimnasio Ñandú & Co.' } }, 'pagos', 'csv')).toBe('gimnasio-nandu-co_pagos_2026-11-06.csv')
    expect(backupFileName({ ...base, gym: { name: '***' } }, 'datos', 'json')).toBe('gimnasio_datos_2026-11-06.json')
  })
})
