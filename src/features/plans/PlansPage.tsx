import { useState } from 'preact/hooks'
import { Pencil, Plus, Power, PowerOff, Tags } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Select'
import { useSnackbar } from '@/components/ui/Snackbar'
import { api } from '@/lib/data'
import type { Plan } from '@/lib/data'
import { useAsyncData } from '@/lib/useAsyncData'
import { PlanFormDialog } from './PlanFormDialog'

const dayLabel = (d: number) => `${d} ${d === 1 ? 'día' : 'días'}`

export function PlansPage() {
  const snack = useSnackbar()
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [editing, setEditing] = useState<Plan | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const plans = useAsyncData(() => api.plans.list({ includeInactive: filter === 'all' }), [filter])

  const openForm = (plan: Plan | null) => {
    setEditing(plan)
    setFormOpen(true)
  }

  async function setActive(plan: Plan, active: boolean) {
    try {
      await api.plans.update(plan.id, { active })
      plans.reload()
      snack.show(active ? `"${plan.name}" activado` : `"${plan.name}" desactivado`, {
        actionLabel: 'Deshacer',
        onAction: () => void setActive(plan, !active),
      })
    } catch (err) {
      snack.show(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  const columns: Column<Plan>[] = [
    { id: 'name', header: 'Plan', primary: true, cell: (p) => <span class="font-medium">{p.name}</span> },
    { id: 'days', header: 'Duración', cell: (p) => dayLabel(p.durationDays) },
    { id: 'price', header: 'Precio', align: 'right', cell: (p) => <MoneyDisplay cents={p.priceCents} /> },
    {
      id: 'status',
      header: 'Estado',
      cell: (p) => <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      actions: true,
      cell: (p) => (
        <div class="flex justify-end">
          <IconButton label={`Editar ${p.name}`} onClick={() => openForm(p)}>
            <Pencil size={20} aria-hidden="true" />
          </IconButton>
          <IconButton
            label={p.active ? `Desactivar ${p.name}` : `Activar ${p.name}`}
            onClick={() => void setActive(p, !p.active)}
          >
            {p.active ? <PowerOff size={20} aria-hidden="true" /> : <Power size={20} aria-hidden="true" />}
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Planes"
        description="Define los planes de membresía y sus precios."
        actions={
          <Button icon={<Plus size={20} aria-hidden="true" />} onClick={() => openForm(null)}>
            Nuevo plan
          </Button>
        }
      />

      <div class="mb-4 max-w-56">
        <Select
          label="Mostrar"
          value={filter}
          onValueChange={(v) => setFilter(v as 'active' | 'all')}
          options={[
            { value: 'active', label: 'Solo activos' },
            { value: 'all', label: 'Todos' },
          ]}
        />
      </div>

      <DataTable
        caption="Planes de membresía"
        columns={columns}
        rows={plans.data ?? []}
        rowKey={(p) => p.id}
        loading={plans.loading}
        error={plans.error}
        onRetry={plans.reload}
        empty={
          <EmptyState
            icon={Tags}
            title="Aún no hay planes"
            description="Crea el primer plan para poder vender membresías."
            action={<Button onClick={() => openForm(null)}>Nuevo plan</Button>}
          />
        }
      />

      <PlanFormDialog
        open={formOpen}
        plan={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(plan, mode) => {
          setFormOpen(false)
          plans.reload()
          snack.show(mode === 'created' ? `Plan "${plan.name}" creado` : `Plan "${plan.name}" actualizado`)
        }}
      />
    </>
  )
}
