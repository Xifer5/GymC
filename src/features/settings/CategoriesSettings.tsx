import { useEffect, useRef, useState } from 'preact/hooks'
import { Pencil, Plus, Power, PowerOff } from 'lucide-preact'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { useSnackbar } from '@/components/ui/Snackbar'
import { TextField } from '@/components/ui/TextField'
import { api, AppError } from '@/lib/data'
import type { Category, MovementType } from '@/lib/data'
import { MOVEMENT_TYPE_LABEL } from '@/lib/labels'
import { useAsyncData } from '@/lib/useAsyncData'
import { validateCategoryName } from '@/lib/validations/settings'

const FORM_ID = 'category-form'

interface DialogState {
  type: MovementType
  category: Category | null
}

function CategoryDialog({ state, onClose, onSaved }: { state: DialogState | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (!state) return
    setName(state.category?.name ?? '')
    setError(undefined)
    setBusy(false)
    submitting.current = false
  }, [state])

  async function submit(e: Event) {
    e.preventDefault()
    if (!state || submitting.current) return
    const v = validateCategoryName(name)
    if (!v.ok) return setError(v.error)
    submitting.current = true
    setBusy(true)
    try {
      if (state.category) await api.categories.update(state.category.id, { name: v.name })
      else await api.categories.create({ type: state.type, name: v.name })
      onSaved(state.category ? 'Categoría actualizada' : `Categoría "${v.name}" creada`)
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'No se pudo guardar')
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={state !== null}
      title={state?.category ? 'Renombrar categoría' : `Nueva categoría de ${state ? MOVEMENT_TYPE_LABEL[state.type].toLowerCase() : ''}`}
      onClose={busy ? () => undefined : onClose}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <TextField
          label="Nombre"
          value={name}
          onValueChange={(v) => {
            setName(v)
            setError(undefined)
          }}
          error={error}
          autocomplete="off"
          autofocus
        />
      </form>
    </Dialog>
  )
}

function CategoryList({
  type,
  items,
  onAdd,
  onEdit,
  onToggle,
}: {
  type: MovementType
  items: Category[]
  onAdd: () => void
  onEdit: (c: Category) => void
  onToggle: (c: Category) => void
}) {
  return (
    <Card variant="outlined" padded={false} class="min-w-0">
      <div class="flex items-center justify-between gap-2 px-4 pt-4">
        <h3 class="text-title-md">{type === 'income' ? 'Ingresos' : 'Egresos'}</h3>
        <Button variant="tonal" icon={<Plus size={18} aria-hidden="true" />} onClick={onAdd}>
          Nueva
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Sin categorías" description="Crea la primera para poder registrar movimientos." />
      ) : (
        <ul class="p-2">
          {items.map((c) => (
            <li key={c.id} class="flex items-center gap-2 rounded-md px-2">
              <span class={`min-w-0 flex-1 truncate py-3 text-body-md ${c.active ? '' : 'text-on-surface-variant line-through'}`}>{c.name}</span>
              {!c.active && <Badge>Inactiva</Badge>}
              <IconButton label={`Renombrar ${c.name}`} onClick={() => onEdit(c)}>
                <Pencil size={20} aria-hidden="true" />
              </IconButton>
              <IconButton label={c.active ? `Desactivar ${c.name}` : `Activar ${c.name}`} onClick={() => onToggle(c)}>
                {c.active ? <PowerOff size={20} aria-hidden="true" /> : <Power size={20} aria-hidden="true" />}
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Categorías de ingresos y egresos. Se desactivan en vez de borrarse (los movimientos antiguos las siguen usando). */
export function CategoriesSettings() {
  const snack = useSnackbar()
  const cats = useAsyncData(() => api.categories.list(undefined, { includeInactive: true }), [])
  const [dialog, setDialog] = useState<DialogState | null>(null)

  async function toggle(c: Category) {
    try {
      await api.categories.update(c.id, { active: !c.active })
      cats.reload()
      snack.show(c.active ? `"${c.name}" desactivada` : `"${c.name}" activada`, {
        actionLabel: 'Deshacer',
        onAction: () => void api.categories.update(c.id, { active: c.active }).then(cats.reload),
      })
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo actualizar')
    }
  }

  if (cats.loading && !cats.data) return <div role="status" aria-label="Cargando" class="h-48 animate-pulse rounded-md bg-surface-highest" />
  if (cats.error || !cats.data) {
    return (
      <Card variant="outlined" padded={false}>
        <EmptyState title="No se pudo cargar" description={cats.error} action={<Button variant="tonal" onClick={cats.reload}>Reintentar</Button>} />
      </Card>
    )
  }
  const all = cats.data

  return (
    <>
      <p class="mb-4 text-body-md text-on-surface-variant">
        Una categoría desactivada deja de ofrecerse al registrar, pero los movimientos anteriores conservan su nombre.
      </p>
      <div class="grid gap-3 md:grid-cols-2">
        {(['income', 'expense'] as const).map((type) => (
          <CategoryList
            key={type}
            type={type}
            items={all.filter((c) => c.type === type)}
            onAdd={() => setDialog({ type, category: null })}
            onEdit={(category) => setDialog({ type, category })}
            onToggle={(c) => void toggle(c)}
          />
        ))}
      </div>
      <CategoryDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onSaved={(msg) => {
          setDialog(null)
          cats.reload()
          snack.show(msg)
        }}
      />
    </>
  )
}
