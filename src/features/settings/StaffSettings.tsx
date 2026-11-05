import { useEffect, useRef, useState } from 'preact/hooks'
import { Pencil, Plus, Power, PowerOff, UserPlus } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { useSnackbar } from '@/components/ui/Snackbar'
import { TextField } from '@/components/ui/TextField'
import { api, AppError } from '@/lib/data'
import type { Permission, Profile } from '@/lib/data'
import { PERMISSION_GROUPS } from '@/lib/labels'
import { useAsyncData } from '@/lib/useAsyncData'
import { validateStaff } from '@/lib/validations/settings'
import type { StaffFormErrors } from '@/lib/validations/settings'

const FORM_ID = 'staff-form'
/** Permisos de partida para una recepcionista nueva: lo habitual del mostrador. */
const DEFAULT_PERMS: Permission[] = ['members.read', 'members.write', 'memberships.write', 'payments.create']

interface FormProps {
  open: boolean
  /** null = crear. */
  staff: Profile | null
  onClose: () => void
  onSaved: (message: string) => void
}

function StaffFormDialog({ open, staff, onClose, onSaved }: FormProps) {
  const [values, setValues] = useState({ fullName: '', email: '', password: '' })
  const [perms, setPerms] = useState<Permission[]>(DEFAULT_PERMS)
  const [errors, setErrors] = useState<StaffFormErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (!open) return
    setValues({ fullName: staff?.fullName ?? '', email: staff?.email ?? '', password: '' })
    setPerms(staff ? staff.permissions : DEFAULT_PERMS)
    setErrors({})
    setFormError(undefined)
    setBusy(false)
    submitting.current = false
  }, [open, staff])

  const set = (k: keyof typeof values) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const toggle = (p: Permission, on: boolean) => setPerms((cur) => (on ? [...new Set([...cur, p])] : cur.filter((x) => x !== p)))

  async function submit(e: Event) {
    e.preventDefault()
    if (submitting.current) return
    const v = validateStaff(values, !staff)
    if (!v.ok) return setErrors(v.errors)
    submitting.current = true
    setBusy(true)
    setFormError(undefined)
    try {
      if (staff) await api.staff.update(staff.id, { fullName: v.value.fullName, permissions: perms })
      else await api.staff.create({ ...v.value, permissions: perms })
      onSaved(staff ? `Cambios de "${v.value.fullName}" guardados` : `Usuario "${v.value.fullName}" creado`)
    } catch (err) {
      setFormError(err instanceof AppError ? err.message : 'No se pudo guardar')
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={staff ? 'Editar usuario' : 'Nuevo usuario'}
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
        <TextField label="Nombre completo" value={values.fullName} onValueChange={set('fullName')} error={errors.fullName} autocomplete="off" />
        {staff ? (
          <p class="text-body-sm text-on-surface-variant">Correo: {staff.email}</p>
        ) : (
          <>
            <TextField label="Correo" type="email" value={values.email} onValueChange={set('email')} error={errors.email} autocomplete="off" />
            <TextField
              label="Contraseña inicial"
              type="password"
              value={values.password}
              onValueChange={set('password')}
              error={errors.password}
              helper={errors.password ? undefined : 'Mínimo 8 caracteres. Compártela en persona.'}
              autocomplete="new-password"
            />
          </>
        )}

        <fieldset class="space-y-3">
          <legend class="text-title-sm">Permisos</legend>
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.title}>
              <p class="mb-1 text-label-lg text-on-surface-variant">{g.title}</p>
              {g.items.map((i) => (
                <Checkbox key={i.permission} label={i.label} hint={i.hint} checked={perms.includes(i.permission)} onChange={(on) => toggle(i.permission, on)} />
              ))}
            </div>
          ))}
        </fieldset>

        {formError && (
          <p role="alert" class="text-body-sm text-error">
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  )
}

/** Usuarios de recepción y sus permisos. Los administradores se listan pero no se editan aquí. */
export function StaffSettings() {
  const snack = useSnackbar()
  const staff = useAsyncData(() => api.staff.list(), [])
  const [editing, setEditing] = useState<Profile | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<Profile | null>(null)
  const [busy, setBusy] = useState(false)

  const openForm = (s: Profile | null) => {
    setEditing(s)
    setFormOpen(true)
  }

  async function setActive(s: Profile, active: boolean) {
    setBusy(true)
    try {
      await api.staff.update(s.id, { active })
      staff.reload()
      snack.show(active ? `"${s.fullName}" reactivado` : `"${s.fullName}" desactivado`)
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo actualizar')
    } finally {
      setBusy(false)
      setDeactivating(null)
    }
  }

  const columns: Column<Profile>[] = [
    { id: 'name', header: 'Usuario', primary: true, cell: (s) => <span class="font-medium">{s.fullName}</span> },
    { id: 'email', header: 'Correo', cell: (s) => s.email },
    {
      id: 'role',
      header: 'Rol',
      cell: (s) => (s.role === 'admin' ? <Badge tone="success">Administrador</Badge> : <Badge>Recepción · {s.permissions.length} permisos</Badge>),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (s) => <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Activo' : 'Desactivado'}</Badge>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      actions: true,
      cell: (s) =>
        s.role === 'admin' ? null : (
          <div class="flex justify-end">
            <IconButton label={`Editar ${s.fullName}`} onClick={() => openForm(s)}>
              <Pencil size={20} aria-hidden="true" />
            </IconButton>
            <IconButton
              label={s.active ? `Desactivar ${s.fullName}` : `Reactivar ${s.fullName}`}
              onClick={() => (s.active ? setDeactivating(s) : void setActive(s, true))}
            >
              {s.active ? <PowerOff size={20} aria-hidden="true" /> : <Power size={20} aria-hidden="true" />}
            </IconButton>
          </div>
        ),
    },
  ]

  return (
    <>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p class="max-w-xl text-body-md text-on-surface-variant">
          Cada usuario de recepción solo ve y hace lo que le asignes. Al desactivarlo deja de poder entrar, pero su historial se conserva.
        </p>
        <Button icon={<Plus size={20} aria-hidden="true" />} onClick={() => openForm(null)}>
          Nuevo usuario
        </Button>
      </div>

      <DataTable
        caption="Usuarios del gimnasio"
        columns={columns}
        rows={staff.data ?? []}
        rowKey={(s) => s.id}
        loading={staff.loading}
        error={staff.error}
        onRetry={staff.reload}
        empty={
          <Card variant="outlined" padded={false}>
            <EmptyState icon={UserPlus} title="Sin usuarios" description="Crea el primero para que atienda en recepción." />
          </Card>
        }
      />

      <StaffFormDialog
        open={formOpen}
        staff={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(msg) => {
          setFormOpen(false)
          staff.reload()
          snack.show(msg)
        }}
      />

      <ConfirmDialog
        open={deactivating !== null}
        title="Desactivar usuario"
        destructive
        confirmLabel="Desactivar"
        loading={busy}
        onCancel={() => !busy && setDeactivating(null)}
        onConfirm={() => deactivating && void setActive(deactivating, false)}
      >
        <p class="text-body-md">
          {deactivating?.fullName} no podrá iniciar sesión. Sus cobros y registros anteriores se conservan. Puedes reactivarlo cuando quieras.
        </p>
      </ConfirmDialog>
    </>
  )
}
