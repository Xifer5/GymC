import { useState } from 'preact/hooks'
import { useLocation } from 'wouter'
import { CalendarClock, Plus, Users } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { SearchBar } from '@/components/shared/SearchBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { useSnackbar } from '@/components/ui/Snackbar'
import { MembershipStateBadge } from '@/features/memberships/MembershipStateBadge'
import { useAuth } from '@/features/auth/AuthProvider'
import { api } from '@/lib/data'
import type { MemberListItem, MemberStatus } from '@/lib/data'
import { formatDate } from '@/lib/dates'
import { MEMBER_STATUS_LABEL } from '@/lib/labels'
import { usePagedList } from '@/lib/usePagedList'
import { MemberFormDialog } from './MemberFormDialog'

type StatusFilter = MemberStatus | ''

export function MembersPage() {
  const { can } = useAuth()
  const snack = useSnackbar()
  const [, navigate] = useLocation()
  const [status, setStatus] = useState<StatusFilter>('')
  const [formOpen, setFormOpen] = useState(false)
  const list = usePagedList<MemberListItem>(
    (q) => api.members.list({ ...q, status: status || undefined }),
    { deps: [status] },
  )

  const columns: Column<MemberListItem>[] = [
    { id: 'name', header: 'Socio', primary: true, cell: (m) => <span class="font-medium">{m.fullName}</span> },
    { id: 'ci', header: 'CI', cell: (m) => m.ci },
    { id: 'phone', header: 'Teléfono', cell: (m) => m.phone },
    {
      id: 'membership',
      header: 'Membresía',
      cell: (m) =>
        m.status !== 'active' ? (
          <Badge>{MEMBER_STATUS_LABEL[m.status]}</Badge>
        ) : m.current ? (
          <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <MembershipStateBadge state={m.current.state} />
            <span class="text-body-sm text-on-surface-variant">hasta {formatDate(m.current.endDate)}</span>
          </span>
        ) : (
          <span class="text-on-surface-variant">Sin membresía</span>
        ),
    },
    {
      id: 'due',
      header: 'Saldo',
      align: 'right',
      cell: (m) => (m.current && m.current.dueCents > 0 ? <MoneyDisplay cents={m.current.dueCents} /> : <span class="text-on-surface-variant">—</span>),
    },
  ]

  const searching = list.search !== '' || status !== ''

  return (
    <>
      <PageHeader
        title="Socios"
        description="Inscripciones y estado de cada socio."
        actions={
          <>
            <Button variant="outlined" icon={<CalendarClock size={20} aria-hidden="true" />} onClick={() => navigate('/vencimientos')}>
              Vencimientos
            </Button>
            {can('members.write') && (
              <Button icon={<Plus size={20} aria-hidden="true" />} onClick={() => setFormOpen(true)}>
                Nuevo socio
              </Button>
            )}
          </>
        }
      />

      <div class="mb-4 flex flex-col gap-3 sm:flex-row">
        <div class="flex-1">
          <SearchBar onSearch={list.setSearch} placeholder="Buscar por nombre, CI o teléfono" label="Buscar socios" />
        </div>
        <div class="sm:w-64">
          <Select
            label="Estado"
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
            options={[
              { value: '', label: 'Todos (sin archivados)' },
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
              { value: 'suspended', label: 'Suspendidos' },
              { value: 'archived', label: 'Archivados' },
            ]}
          />
        </div>
      </div>

      <DataTable
        caption="Socios"
        columns={columns}
        rows={list.items}
        rowKey={(m) => m.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(m) => navigate(`/socios/${m.id}`)}
        empty={
          searching ? (
            <EmptyState icon={Users} title="Sin resultados" description="No hay socios que coincidan con la búsqueda o el filtro." />
          ) : (
            <EmptyState
              icon={Users}
              title="Aún no hay socios"
              description="Registra al primer socio para empezar a cobrar membresías."
              action={can('members.write') && <Button onClick={() => setFormOpen(true)}>Nuevo socio</Button>}
            />
          )
        }
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} disabled={list.loading} />

      <MemberFormDialog
        open={formOpen}
        member={null}
        onClose={() => setFormOpen(false)}
        onSaved={(m) => {
          setFormOpen(false)
          list.reload()
          snack.show(`Socio "${m.fullName}" registrado`, {
            actionLabel: can('payments.create') && can('memberships.write') ? 'Cobrar' : undefined,
            onAction: () => navigate(`/cobrar?socio=${m.id}`),
            duration: 8000,
          })
        }}
      />
    </>
  )
}
