import type { ComponentChildren } from 'preact'
import { Inbox, TriangleAlert } from 'lucide-preact'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { cx } from '@/lib/cx'
import { useIsWide } from '@/lib/useMediaQuery'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ComponentChildren
  /** Importes y números: alinear a la derecha. */
  align?: 'left' | 'right'
  /** Móvil: esta columna es el título de la tarjeta. */
  primary?: boolean
  /** Móvil: no mostrar en la tarjeta. */
  hideOnCard?: boolean
  /** Columna de acciones (botones). En móvil va a la derecha del título, sin etiqueta. */
  actions?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Cargando: con filas previas las atenúa; sin filas muestra esqueletos. */
  loading?: boolean
  error?: string
  onRetry?: () => void
  /** Contenido cuando no hay filas (usar <EmptyState>). */
  empty?: ComponentChildren
  onRowClick?: (row: T) => void
  /** Texto accesible de la tabla. */
  caption: string
}

const SKELETON_ROWS = 5

function Skeleton({ wide }: { wide: boolean }) {
  return (
    <div role="status" aria-label="Cargando" class="divide-y divide-outline-variant">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} class={cx('flex animate-pulse items-center gap-4 px-4', wide ? 'h-14' : 'h-20')}>
          <div class="h-4 w-1/3 rounded-sm bg-surface-highest" />
          <div class="h-4 w-1/4 rounded-sm bg-surface-highest" />
          <div class="ml-auto h-4 w-16 rounded-sm bg-surface-highest" />
        </div>
      ))}
    </div>
  )
}

/**
 * Tabla en ≥600 px; tarjetas en móvil. Una sola definición de columnas para ambas vistas.
 * Incluye estados: loading, error (con reintento), vacío y filas clicables accesibles por teclado.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, empty, onRowClick, caption,
}: DataTableProps<T>) {
  const wide = useIsWide()

  if (error && rows.length === 0) {
    return (
      <Card variant="outlined" padded={false}>
        <EmptyState
          icon={TriangleAlert}
          title="No se pudo cargar"
          description={error}
          action={onRetry && <Button variant="tonal" onClick={onRetry}>Reintentar</Button>}
        />
      </Card>
    )
  }
  if (loading && rows.length === 0) {
    return (
      <Card variant="outlined" padded={false}>
        <Skeleton wide={wide} />
      </Card>
    )
  }
  if (rows.length === 0) {
    return (
      <Card variant="outlined" padded={false}>
        {empty ?? <EmptyState icon={Inbox} title="Sin resultados" />}
      </Card>
    )
  }

  const clickable = (row: T) =>
    onRowClick
      ? {
          tabIndex: 0,
          onClick: () => onRowClick(row),
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onRowClick(row)
            }
          },
        }
      : {}
  // <tr> no admite el pseudo-elemento de state-layer (crea una celda anónima): hover propio en tabla.
  const trClass = onRowClick ? 'cursor-pointer hover:bg-on-surface/8 focus-visible:bg-on-surface/10' : ''
  const cardClass = onRowClick ? 'state-layer cursor-pointer' : ''

  return (
    <Card variant="outlined" padded={false} class={cx('overflow-hidden', loading && 'opacity-60 transition-opacity')} aria-busy={loading || undefined}>
      {error && (
        <p role="alert" class="flex items-center gap-2 bg-error-container px-4 py-2 text-body-sm text-on-error-container">
          <TriangleAlert size={16} aria-hidden="true" />
          {error}
          {onRetry && (
            <button type="button" class="ml-auto underline" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </p>
      )}

      {wide ? (
        <table class="w-full text-body-md">
          <caption class="sr-only">{caption}</caption>
          <thead class="bg-surface-low text-label-lg text-on-surface-variant">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  class={cx('h-12 px-4 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}
                >
                  {c.actions ? <span class="sr-only">{c.header}</span> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} class={cx('h-14 border-t border-outline-variant', trClass)} {...clickable(row)}>
                {columns.map((c) => (
                  <td key={c.id} class={cx('px-4', c.align === 'right' && 'text-right tabular-nums', c.actions && 'text-right')}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul aria-label={caption} class="divide-y divide-outline-variant">
          {rows.map((row) => {
            const primary = columns.find((c) => c.primary) ?? columns[0]
            const actions = columns.find((c) => c.actions)
            const details = columns.filter((c) => c !== primary && c !== actions && !c.hideOnCard)
            return (
              <li key={rowKey(row)} class={cx('flex flex-col gap-2 p-4', cardClass)} {...clickable(row)}>
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0 text-title-md text-on-surface">{primary.cell(row)}</div>
                  {actions && <div class="shrink-0">{actions.cell(row)}</div>}
                </div>
                <dl class="flex flex-col gap-1">
                  {details.map((c) => (
                    <div key={c.id} class="flex items-baseline justify-between gap-4 text-body-md">
                      <dt class="text-on-surface-variant">{c.header}</dt>
                      <dd class={cx('text-on-surface', c.align === 'right' && 'tabular-nums')}>{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
