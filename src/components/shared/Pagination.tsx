import { ChevronLeft, ChevronRight } from 'lucide-preact'
import { IconButton } from '@/components/ui/IconButton'
import { pageInfo } from '@/lib/pagination'

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

/** "26–50 de 120" + anterior/siguiente. No se muestra si todo cabe en una página. */
export function Pagination({ page, pageSize, total, onPageChange, disabled }: PaginationProps) {
  const info = pageInfo(page, pageSize, total)
  if (total <= pageSize) return null
  return (
    <nav aria-label="Paginación" class="flex items-center justify-end gap-1 px-2 py-1 text-body-sm text-on-surface-variant">
      <span aria-live="polite" class="px-2">
        {info.from}–{info.to} de {total}
      </span>
      <IconButton label="Página anterior" disabled={disabled || !info.hasPrev} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={22} aria-hidden="true" />
      </IconButton>
      <IconButton label="Página siguiente" disabled={disabled || !info.hasNext} onClick={() => onPageChange(page + 1)}>
        <ChevronRight size={22} aria-hidden="true" />
      </IconButton>
    </nav>
  )
}
