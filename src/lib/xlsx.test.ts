import { describe, expect, it } from 'vitest'
import { buildXlsx, crc32, safeSheetName } from './xlsx'

/** Lector mínimo de ZIP (solo "store") para verificar lo que escribimos. */
function readZip(buf: Uint8Array) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const dec = new TextDecoder()
  const files = new Map<string, { text: string; crcOk: boolean }>()
  const eocd = buf.length - 22
  expect(v.getUint32(eocd, true)).toBe(0x06054b50)
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50)
    const crc = v.getUint32(p + 16, true)
    const size = v.getUint32(p + 24, true)
    const nameLen = v.getUint16(p + 28, true)
    const lho = v.getUint32(p + 42, true)
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen))
    expect(v.getUint32(lho, true)).toBe(0x04034b50)
    const dataStart = lho + 30 + v.getUint16(lho + 26, true) + v.getUint16(lho + 28, true)
    const data = buf.subarray(dataStart, dataStart + size)
    files.set(name, { text: dec.decode(data), crcOk: crc32(data) === crc })
    p += 46 + nameLen
  }
  return files
}

const sheets = [
  { name: 'Pagos', header: ['Recibo', 'Socio', 'Monto (Bs)'], rows: [[1, 'Ana & "Luz" <b>', { cents: 15050 }], [2, '=HYPERLINK("x")', { cents: -500 }], [3, null, 0]] },
  { name: 'Socios', header: ['CI'], rows: [['6100000']] },
]

describe('xlsx', () => {
  it('crc32 coincide con el vector estándar', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  const zip = readZip(buildXlsx(sheets, new Date(2026, 10, 6, 12, 0, 0)))

  it('contiene las partes obligatorias y todos los CRC son válidos', () => {
    expect([...zip.keys()]).toEqual([
      '[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml',
      'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml',
    ])
    for (const [name, f] of zip) expect(f.crcOk, name).toBe(true)
    expect(zip.get('xl/workbook.xml')!.text).toContain('<sheet name="Pagos" sheetId="1" r:id="rId1"/>')
    expect(zip.get('xl/workbook.xml')!.text).toContain('<sheet name="Socios" sheetId="2" r:id="rId2"/>')
  })

  it('escapa XML, mantiene los textos como texto y los importes como número', () => {
    const x = zip.get('xl/worksheets/sheet1.xml')!.text
    expect(x).toContain('Ana &amp; &quot;Luz&quot; &lt;b&gt;')
    expect(x).toContain('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK(&quot;x&quot;)</t>') // texto, nunca fórmula
    expect(x).not.toContain('<f>')
    expect(x).toContain('<v>150.50</v>')
    expect(x).toContain('<v>-5.00</v>')
    expect(x).toContain('<c r="A1" s="1" t="inlineStr">') // encabezado en negrita
    expect(x).toContain('state="frozen"')
  })

  it('nombres de hoja válidos y únicos', () => {
    const used = new Set<string>()
    expect(safeSheetName('Pagos/2026: [resumen]?', used)).toBe('Pagos 2026   resumen')
    expect(safeSheetName('PAGOS 2026   resumen', used)).toBe('PAGOS 2026   resumen 2') // sin distinguir mayúsculas
    expect(safeSheetName('x'.repeat(50), new Set()).length).toBe(31)
    expect(safeSheetName('  ', new Set())).toBe('Hoja')
  })
})
