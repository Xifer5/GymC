import { useEffect, useState } from 'preact/hooks'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/TextField'
import { api } from '@/lib/data'
import type { Plan } from '@/lib/data'
import { formatMoneyInput } from '@/lib/money'
import { validatePlan } from '@/lib/validations/plan'
import type { PlanFormErrors, PlanFormValues } from '@/lib/validations/plan'

const EMPTY: PlanFormValues = { name: '', days: '', price: '', description: '' }
const FORM_ID = 'plan-form'

export interface PlanFormDialogProps {
  open: boolean
  /** null = crear; Plan = editar. */
  plan: Plan | null
  onClose: () => void
  onSaved: (plan: Plan, mode: 'created' | 'updated') => void
}

export function PlanFormDialog({ open, plan, onClose, onSaved }: PlanFormDialogProps) {
  const [values, setValues] = useState<PlanFormValues>(EMPTY)
  const [errors, setErrors] = useState<PlanFormErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setFormError(undefined)
    setBusy(false)
    setValues(
      plan
        ? {
            name: plan.name,
            days: String(plan.durationDays),
            price: formatMoneyInput(plan.priceCents),
            description: plan.description ?? '',
          }
        : EMPTY,
    )
  }, [open, plan])

  const set = (key: keyof PlanFormValues) => (v: string) => {
    setValues((s) => ({ ...s, [key]: v }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (busy) return
    const result = validatePlan(values)
    if (!result.ok) return setErrors(result.errors)
    setBusy(true)
    setFormError(undefined)
    try {
      const saved = plan ? await api.plans.update(plan.id, result.value) : await api.plans.create(result.value)
      onSaved(saved, plan ? 'updated' : 'created')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={plan ? 'Editar plan' : 'Nuevo plan'}
      onClose={onClose}
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
        <TextField label="Nombre" value={values.name} onValueChange={set('name')} error={errors.name} autocomplete="off" />
        <div class="grid grid-cols-2 gap-4">
          <TextField
            label="Duración (días)"
            value={values.days}
            onValueChange={set('days')}
            error={errors.days}
            inputMode="numeric"
            helper={errors.days ? undefined : '30 = mensual'}
          />
          <TextField
            label="Precio"
            prefixText="Bs"
            value={values.price}
            onValueChange={set('price')}
            error={errors.price}
            inputMode="decimal"
          />
        </div>
        <TextField label="Descripción (opcional)" value={values.description} onValueChange={set('description')} error={errors.description} />
        {plan && (
          <p class="text-body-sm text-on-surface-variant">
            Los cambios de precio y duración no afectan a las membresías ya vendidas.
          </p>
        )}
        {formError && (
          <p role="alert" class="text-body-sm text-error">
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  )
}
