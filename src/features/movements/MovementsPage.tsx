import { useMemo, useRef, useState } from 'preact/hooks'
import { ArrowLeftRight, Ban, Minus, Plus } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { useSnackbar } from '@/components/ui/Snackbar'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/features/auth/AuthProvider'
import { api, AppError } from '@/lib/data'
import type { Movement, MovementType } from '@/lib/data'
import { formatDate } from '@/lib/dates'
import { MOVEMENT_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/labels'
import { useAsyncData } from '@/lib/useAsyncData'
import { usePagedList } from '@/lib/usePagedList'
import { MovementFormDialog } from './MovementFormDialog'

type TypeFilter = MovementType | ''

/** Ingresos y egresos con filtros por tipo, categoría y fechas. Se anulan con motivo, nunca se borran. */
export function MovementsPage() {
  const { can } = useAuth()
  const snack = useSnackbar()
  const canWrite = can('movements.write')
  const [type, setType] = useState<TypeFilter>('')
  const [categoryId, setCategoryId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [formType, setFormType] = useState<MovementType | null>(null)
  const [voiding, setVoiding] = useState<Movement | null>(null)
  const [voidBusy, setVoidBusy] = useState(false)
  const voidingRef = useRef(false)

  const categories = useAsyncData(() => api.categories.list(undefined, { includeInactive: true }), [])
  const categoryName = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c.name])), [categories.data])
  const visibleCategories = (categories.data ?? []).filter((c) => c.active && (!type || c.type === type))

  const rangeInvalid = from !== '' && to !== '' && from > to
  const list = usePagedList<Movement>(
    (q) =>
      rangeInvalid
        ? Promise.resolve({ items: [], total: 0 })
        : api.movements.list({
            page: q.page,
            pageSize: q.pageSize,
            type: type || undefined,
            categoryId: categoryId || undefined,
            from: from || undefined,
            to: to || undefined,
          }),
    { deps: [type, categoryId, from, to] },
  )

  async function confirmVoid(reason: string) {
    if (!voiding || voidingRef.current) return
    voidingRef.current = true
    setVoidBusy(true)
    try {
      await api.movements.void(voiding.id, reason)
      snack.show(`${MOVEMENT_TYPE_LABEL[voiding.type]} "${voiding.description}" anulado`)
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo anular')
    } finally {
      voidingRef.current = false
      setVoidBusy(false)
      setVoiding(null)
      list.reload()
    }
  }

  const columns: Column<Movement>[] = [
    { id: 'desc', header: 'Descripción', primary: true, cell: (m) => <span class="font-medium">{m.description}</span> },
    { id: 'date', header: 'Fecha', cell: (m) => formatDate(m.occurredOn) },
    {
      id: 'type',
      header: 'Tipo',
      cell: (m) => <Badge tone={m.type === 'income' ? 'success' : 'warning'}>{MOVEMENT_TYPE_LABEL[m.type]}</Badge>,
    },
    { id: 'cat', header: 'Categoría', cell: (m) => categoryName.get(m.categoryId) ?? '—' },
    { id: 'method', header: 'Método', cell: (m) => PAYMENT_METHOD_LABEL[m.method] },
    {
      id: 'amount',
      header: 'Monto',
      align: 'right',
      cell: (m) => (
        <span class={m.status === 'voided' ? 'line-through text-on-surface-variant' : undefined}>
          {m.type === 'expense' ? '− ' : ''}
          <MoneyDisplay cents={m.amountCents} />
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (m) =>
        m.status === 'voided' ? (
          <span class="inline-flex flex-col items-start gap-1">
            <Badge tone="error">Anulado</Badge>
            {m.voidReason && <span class="text-body-sm text-on-surface-variant">{m.voidReason}</span>}
          </span>
        ) : (
          <Badge tone="success">Confirmado</Badge>
        ),
    },
    ...(canWrite
      ? [
          {
            id: 'actions',
            header: 'Acciones',
            actions: true,
            cell: (m: Movement) =>
              m.status === 'confirmed' ? (
                <Button variant="text" icon={<Ban size={18} aria-hidden="true" />} onClick={() => setVoiding(m)}>
                  Anular
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  const filtering = type !== '' || categoryId !== '' || from !== '' || to !== ''

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Otros ingresos y egresos del gimnasio. Los cobros de membresías están en cada socio."
        actions={
          canWrite && (
            <>
              <Button icon={<Plus size={20} aria-hidden="true" />} onClick={() => setFormType('income')}>
                Ingreso
              </Button>
              <Button variant="tonal" icon={<Minus size={20} aria-hidden="true" />} onClick={() => setFormType('expense')}>
                Egreso
              </Button>
            </>
          )
        }
      />

      <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Tipo"
          value={type}
          onValueChange={(v) => {
            setType(v as TypeFilter)
            setCategoryId('')
          }}
          options={[
            { value: '', label: 'Todos' },
            { value: 'income', label: 'Ingresos' },
            { value: 'expense', label: 'Egresos' },
          ]}
        />
        <Select
          label="Categoría"
          value={categoryId}
          onValueChange={setCategoryId}
          options={[{ value: '', label: 'Todas' }, ...visibleCategories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <TextField label="Desde" type="date" value={from} onValueChange={setFrom} />
        <TextField
          label="Hasta"
          type="date"
          value={to}
          onValueChange={setTo}
          error={rangeInvalid ? '"Hasta" es anterior a "Desde"' : undefined}
        />
      </div>

      <DataTable
        caption="Ingresos y egresos"
        columns={columns}
        rows={list.items}
        rowKey={(m) => m.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        empty={
          filtering ? (
            <EmptyState icon={ArrowLeftRight} title="Sin resultados" description="No hay movimientos con esos filtros." />
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title="Aún no hay movimientos"
              description="Registra gastos (luz, alquiler, sueldos) u otros ingresos (venta de agua, suplementos)."
              action={canWrite && <Button onClick={() => setFormType('expense')}>Registrar egreso</Button>}
            />
          )
        }
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} disabled={list.loading} />

      <MovementFormDialog
        open={formType !== null}
        initialType={formType ?? 'expense'}
        onClose={() => setFormType(null)}
        onSaved={(m) => {
          setFormType(null)
          list.reload()
          snack.show(`${MOVEMENT_TYPE_LABEL[m.type]} registrado`)
        }}
      />

      <ConfirmDialog
        open={voiding !== null}
        title={voiding ? `Anular ${MOVEMENT_TYPE_LABEL[voiding.type].toLowerCase()}` : 'Anular'}
        destructive
        requireReason
        confirmLabel="Anular"
        loading={voidBusy}
        onCancel={() => !voidBusy && setVoiding(null)}
        onConfirm={(reason) => void confirmVoid(reason)}
      >
        {voiding && (
          <p class="text-body-md">
            Se anulará "{voiding.description}" por <MoneyDisplay cents={voiding.amountCents} />. Dejará de contar en el balance, pero queda
            registrado con su motivo.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
