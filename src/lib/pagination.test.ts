import { describe, expect, it } from 'vitest'
import { pageInfo } from './pagination'

describe('pageInfo', () => {
  it('sin datos', () => {
    expect(pageInfo(1, 25, 0)).toEqual({ from: 0, to: 0, totalPages: 1, hasPrev: false, hasNext: false })
  })
  it('una sola página', () => {
    expect(pageInfo(1, 25, 10)).toMatchObject({ from: 1, to: 10, totalPages: 1, hasNext: false })
  })
  it('página intermedia', () => {
    expect(pageInfo(2, 25, 60)).toMatchObject({ from: 26, to: 50, totalPages: 3, hasPrev: true, hasNext: true })
  })
  it('última página parcial', () => {
    expect(pageInfo(3, 25, 60)).toMatchObject({ from: 51, to: 60, hasNext: false })
  })
  it('exacto en el límite', () => {
    expect(pageInfo(2, 25, 50)).toMatchObject({ from: 26, to: 50, totalPages: 2, hasNext: false })
  })
  it('página fuera de rango se ajusta', () => {
    expect(pageInfo(99, 25, 60)).toMatchObject({ from: 51, to: 60 })
    expect(pageInfo(0, 25, 60)).toMatchObject({ from: 1, to: 25 })
  })
})
