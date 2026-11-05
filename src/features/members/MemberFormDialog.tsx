import { useEffect, useState } from 'preact/hooks'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { api, AppError } from '@/lib/data'
import type { Member, MemberStatus } from '@/lib/data'
import { validateMember } from '@/lib/validations/member'
import type { MemberFormErrors, MemberFormValues } from '@/lib/validations/member'

const EMPTY: MemberFormValues = { fullName: '', ci: '', phone: '', email: '', notes: '' }
const FORM_ID = 'member-form'

export interface MemberFormDialogProps {
  open: boolean
  /** null = alta; Member = edición. */
  member: Member | null
  onClose: () => void
  onSaved: (member: Member, mode: 'created' | 'updated') => void
}

export function MemberFormDialog({ open, member, onClose, onSaved }: MemberFormDialogProps) {
  const [values, setValues] = useState<MemberFormValues>(EMPTY)
  const [status, setStatus] = useState<MemberStatus>('active')
  const [errors, setErrors] = useState<MemberFormErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setFormError(undefined)
    setBusy(false)
    setStatus(member?.status ?? 'active')
    setValues(
      member
        ? { fullName: member.fullName, ci: member.ci, phone: member.phone, email: member.email ?? '', notes: member.notes ?? '' }
        : EMPTY,
    )
  }, [open, member])

  const set = (key: keyof MemberFormValues) => (v: string) => {
    setValues((s) => ({ ...s, [key]: v }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (busy) return
    const result = validateMember(values)
    if (!result.ok) return setErrors(result.errors)
    setBusy(true)
    setFormError(undefined)
    try {
      const saved = member
        ? await api.members.update(member.id, { ...result.value, status })
        : await api.members.create(result.value)
      onSaved(saved, member ? 'updated' : 'created')
    } catch (err) {
      if (err instanceof AppError && err.code === 'conflict') setErrors({ ci: err.message })
      else setFormError(err instanceof Error ? err.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={member ? 'Editar socio' : 'Nuevo socio'}
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
        <TextField label="Nombre completo" value={values.fullName} onValueChange={set('fullName')} error={errors.fullName} autocomplete="off" />
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField label="CI" value={values.ci} onValueChange={set('ci')} error={errors.ci} autocomplete="off" />
          <TextField label="Teléfono" value={values.phone} onValueChange={set('phone')} error={errors.phone} inputMode="tel" autocomplete="off" />
        </div>
        <TextField label="Correo (opcional)" type="email" value={values.email} onValueChange={set('email')} error={errors.email} inputMode="email" autocomplete="off" />
        <TextField label="Observaciones (opcional)" value={values.notes} onValueChange={set('notes')} error={errors.notes} />
        {member && member.status !== 'archived' && (
          <Select
            label="Estado"
            value={status}
            onValueChange={(v) => setStatus(v as MemberStatus)}
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' },
              { value: 'suspended', label: 'Suspendido' },
            ]}
          />
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
