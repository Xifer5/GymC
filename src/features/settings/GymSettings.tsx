import { useEffect, useRef, useState } from 'preact/hooks'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSnackbar } from '@/components/ui/Snackbar'
import { TextField } from '@/components/ui/TextField'
import { api } from '@/lib/data'
import { useAsyncData } from '@/lib/useAsyncData'
import { validateGym } from '@/lib/validations/settings'
import type { GymFormErrors } from '@/lib/validations/settings'

/** Datos del gimnasio: aparecen en el encabezado de los recibos. */
export function GymSettings() {
  const snack = useSnackbar()
  const gym = useAsyncData(() => api.gym.get(), [])
  const [values, setValues] = useState({ name: '', address: '', phone: '' })
  const [errors, setErrors] = useState<GymFormErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (gym.data) setValues({ name: gym.data.name, address: gym.data.address ?? '', phone: gym.data.phone ?? '' })
  }, [gym.data])

  if (gym.loading && !gym.data) return <div role="status" aria-label="Cargando" class="h-48 animate-pulse rounded-md bg-surface-highest" />
  if (gym.error || !gym.data) {
    return (
      <Card variant="outlined" padded={false}>
        <EmptyState title="No se pudo cargar" description={gym.error} action={<Button variant="tonal" onClick={gym.reload}>Reintentar</Button>} />
      </Card>
    )
  }

  const set = (k: keyof typeof values) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const dirty =
    values.name.trim() !== gym.data.name ||
    values.address.trim() !== (gym.data.address ?? '') ||
    values.phone.trim() !== (gym.data.phone ?? '')

  async function submit(e: Event) {
    e.preventDefault()
    if (submitting.current) return
    const v = validateGym(values)
    if (!v.ok) return setErrors(v.errors)
    submitting.current = true
    setBusy(true)
    setFormError(undefined)
    try {
      await api.gym.update(v.value)
      gym.reload()
      snack.show('Datos del gimnasio guardados')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate class="max-w-xl space-y-4">
      <p class="text-body-md text-on-surface-variant">Estos datos salen en el encabezado de los recibos.</p>
      <TextField label="Nombre del gimnasio" value={values.name} onValueChange={set('name')} error={errors.name} autocomplete="off" />
      <TextField label="Dirección (opcional)" value={values.address} onValueChange={set('address')} error={errors.address} autocomplete="off" />
      <TextField label="Teléfono (opcional)" value={values.phone} onValueChange={set('phone')} error={errors.phone} inputMode="tel" autocomplete="off" />
      {formError && (
        <p role="alert" class="text-body-sm text-error">
          {formError}
        </p>
      )}
      <Button type="submit" loading={busy} disabled={!dirty}>
        Guardar cambios
      </Button>
    </form>
  )
}
