import { describe, expect, it } from 'vitest'
import { balanceDue, formatMoney, formatMoneyInput, netPrice, parseMoney, sumCents } from './money'

describe('formatMoney', () => {
  it('formatea con miles y coma decimal', () => {
    expect(formatMoney(0)).toBe('Bs 0,00')
    expect(formatMoney(5)).toBe('Bs 0,05')
    expect(formatMoney(15000)).toBe('Bs 150,00')
    expect(formatMoney(123450)).toBe('Bs 1.234,50')
    expect(formatMoney(100000000)).toBe('Bs 1.000.000,00')
  })
  it('negativos', () => expect(formatMoney(-500)).toBe('-Bs 5,00'))
  it('rechaza no enteros', () => expect(() => formatMoney(10.5)).toThrow())
  it('formato para input', () => expect(formatMoneyInput(123450)).toBe('1234,50'))
})

describe('parseMoney', () => {
  it.each([
    ['50', 5000],
    ['50,5', 5050],
    ['50.5', 5050],
    ['50,05', 5005],
    ['1.234,50', 123450],
    ['1,234.50', 123450],
    ['1.500', 150000],
    ['1,500', 150000],
    ['1.234.567', 123456700],
    ['Bs 120', 12000],
    ['bs. 99,90', 9990],
    ['0,10', 10],
    ['10,555', 1055500],
  ])('"%s" → %i', (input, expected) => expect(parseMoney(input)).toBe(expected))

  it.each(['', 'abc', '-5', '12,345,6', '1.23.4', '50,', ',50', '1.2345', '1..5'])(
    '"%s" → null',
    (input) => expect(parseMoney(input)).toBeNull(),
  )

  it('es inverso de formatMoneyInput', () => {
    for (const c of [0, 1, 99, 100, 12345, 999999, 123456789]) {
      expect(parseMoney(formatMoneyInput(c))).toBe(c)
    }
  })
})

describe('cálculos', () => {
  it('sumCents evita errores de float', () => {
    expect(sumCents([10, 20])).toBe(30) // 0,10 + 0,20 = 0,30 exacto
  })
  it('netPrice y balanceDue', () => {
    expect(netPrice(15000, 2000)).toBe(13000)
    expect(balanceDue(15000, 2000, 5000)).toBe(8000)
    expect(balanceDue(15000, 0, 15000)).toBe(0)
    expect(balanceDue(15000, 0, 20000)).toBe(0)
  })
  it('descuento inválido', () => {
    expect(() => netPrice(1000, 2000)).toThrow()
    expect(() => netPrice(1000, -1)).toThrow()
  })
})
