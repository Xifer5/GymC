import { useEffect, useRef, useState } from 'preact/hooks'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { api } from '@/lib/data'
import type { Category, Movement, MovementType, PaymentMethod } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { MOVEMENT_TYPE_LABEL, PAYMENT_METHOD_OPTIONS } from '@/lib/labels'
import { validateMovement } from '@/lib/validations/movement'
import type { MovementFormErrors } from '@/lib/validations/movement'

const FORM_ID = 'movement-form'

export interface MovementFormDialogProps {
  open: boolean
  /** Tipo con el que se abre (el usuario puede cambiarlo). */
  initialType: MovementType
  onClose: () => void
  onSaved: (movement: Movement) => void
}

/** Alta de ingreso/egreso. Las anulaciones se hacen desde el listado. */
export function MovementFormDialog({ open, initialType, onClose, onSaved }: MovementFormDialogProps) {
  const [type, setType] = useState<MovementType>(initialType)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [errors, setErrors] = useState<MovementFormErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (!open) return
    setType(initialType)
    setCategoryId('')
    setDescription('')
    setAmount('')
    setDate(todayISO())
    setMethod('cash')
    setErrors({})
    setFormError(undefined)
    setBusy(false)
    submitting.current = false
  }, [open, initialType])

  useEffect(() => {
    if (!open) return
    let stale = false
    setCategories([])
    setCategoryId('')
    api.categories
      .list(type)
      .then((c) => !stale && setCategories(c))
      .catch((e: unknown) => !stale && setFormError(e instanceof Error ? e.message : 'No se pudieron cargar las categorías'))
    return () => {
      stale = true
    }
  }, [open, type])

  const clear = (k: keyof MovementFormErrors) => setErrors((e) => ({ ...e, [k]: undefined }))

  async function submit(e: Event) {
    e.preventDefault()
    if (submitting.current) return
    const v = validateMovement({ categoryId, description, amount, date }, todayISO())
    if (!v.ok) return setErrors(v.errors)
    submitting.current = true
    setBusy(true)
    setFormError(undefined)
    try {
      onSaved(await api.movements.register({ type, method, ...v.value }))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar')
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={type === 'income' ? 'Nuevo ingreso' : 'Nuevo egreso'}
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
      <form id={FORM_ID} onSubmit={submit} noValidate class="grid gap-4">
        <Segmented<MovementType>
          label="Tipo de movimiento"
          value={type}
          onChange={setType}
          options={[
            { value: 'income', label: MOVEMENT_TYPE_LABEL.income },
            { value: 'expense', label: MOVEMENT_TYPE_LABEL.expense },
          ]}
        />
        <Select
          label="Categoría"
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v)
            clear('categoryId')
          }}
          placeholder="Selecciona una categoría…"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          error={errors.categoryId}
        />
        <TextField
          label="Descripción"
          value={description}
          onValueChange={(v) => {
            setDescription(v)
            clear('description')
          }}
          error={errors.description}
          autocomplete="off"
        />
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Monto"
            prefixText="Bs"
            inputMode="decimal"
            value={amount}
            onValueChange={(v) => {
              setAmount(v)
              clear('amount')
            }}
            error={errors.amount}
          />
          <TextField
            label="Fecha"
            type="date"
            value={date}
            onValueChange={(v) => {
              setDate(v)
              clear('date')
            }}
            error={errors.date}
          />
        </div>
        <div class="space-y-2">
          <p class="text-label-lg text-on-surface-variant" aria-hidden="true">Método de pago</p>
          <Segmented<PaymentMethod> label="Método de pago" value={method} onChange={setMethod} options={PAYMENT_METHOD_OPTIONS} />
        </div>
        {formError && (
          <p role="alert" class="text-body-sm text-error">
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  )
}
