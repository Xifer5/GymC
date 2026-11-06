import { History } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/lib/data'
import type { AuditEntry } from '@/lib/data'
import { formatDate, formatTime, timestampToISODate } from '@/lib/dates'
import { AUDIT_ACTION_LABEL } from '@/lib/labels'
import { usePagedList } from '@/lib/usePagedList'

const columns: Column<AuditEntry>[] = [
  { id: 'when', header: 'Cuándo', primary: true, cell: (e) => <span class="font-medium">{`${formatDate(timestampToISODate(e.at))} ${formatTime(e.at)}`}</span> },
  { id: 'who', header: 'Quién', cell: (e) => e.userName },
  {
    id: 'action',
    header: 'Acción',
    cell: (e) => <Badge tone={e.action.endsWith('void') ? 'error' : 'success'}>{AUDIT_ACTION_LABEL[e.action]}</Badge>,
  },
  {
    id: 'detail',
    header: 'Detalle',
    cell: (e) => (
      <span class="inline-flex flex-col items-start">
        <span>{e.description}</span>
        {e.reason && <span class="text-body-sm text-on-surface-variant">Motivo: {e.reason}</span>}
      </span>
    ),
  },
]

/** Bitácora de solo lectura: quién registró o anuló cada cobro y movimiento, y cuándo. No se puede editar ni borrar. */
export function AuditSettings() {
  const list = usePagedList<AuditEntry>((q) => api.audit.list({ page: q.page, pageSize: q.pageSize }), { pageSize: 25 })
  return (
    <div class="space-y-4">
      <p class="max-w-2xl text-body-md text-on-surface-variant">
        Registro de lo que hizo cada persona. Es de solo lectura: nada se edita ni se borra, y lo anulado queda con su motivo.
      </p>
      <DataTable
        caption="Bitácora de movimientos"
        columns={columns}
        rows={list.items}
        rowKey={(e) => e.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        empty={<EmptyState icon={History} title="Sin actividad" description="Aquí aparecerán los cobros y movimientos que se registren o anulen." />}
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} disabled={list.loading} />
    </div>
  )
}
