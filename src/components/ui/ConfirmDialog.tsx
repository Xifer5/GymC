import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { TextField } from './TextField'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ComponentChildren
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo de acción destructiva (rojo). */
  destructive?: boolean
  /** Pide un motivo obligatorio (anulaciones). Se entrega en `onConfirm(reason)`. */
  requireReason?: boolean
  loading?: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, children, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive,
  requireReason, loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setTouched(false)
    }
  }, [open])

  const missing = requireReason && reason.trim() === ''

  function confirm() {
    if (missing) return setTouched(true)
    onConfirm(reason.trim())
  }

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <Button variant="text" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'filled'} onClick={confirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {requireReason && (
        <div class="mt-4">
          <TextField
            label="Motivo"
            value={reason}
            onValueChange={setReason}
            error={touched && missing ? 'El motivo es obligatorio' : undefined}
          />
        </div>
      )}
    </Dialog>
  )
}
