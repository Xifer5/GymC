export interface PageInfo {
  /** Primer registro mostrado (1-based); 0 si no hay datos. */
  from: number
  to: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

export function pageInfo(page: number, pageSize: number, total: number): PageInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  return {
    from: total === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, total),
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  }
}
