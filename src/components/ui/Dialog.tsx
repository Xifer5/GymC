import type { ComponentChildren } from 'preact'
import { useEffect, useId, useRef } from 'preact/hooks'

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ComponentChildren
  /** Botones de acción (normalmente <Button variant="text"> alineados a la derecha). */
  actions?: ComponentChildren
}

/** Diálogo M3 sobre <dialog> nativo: foco atrapado, Esc cierra, backdrop accesible. */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // clic en el backdrop
      }}
      class="m-auto w-[calc(100%-2rem)] max-w-140 rounded-xl bg-surface-high p-6 text-on-surface shadow-3 backdrop:bg-scrim/32"
    >
      <h2 id={titleId} class="text-headline-sm">
        {title}
      </h2>
      <div class="mt-4 text-body-md text-on-surface-variant">{children}</div>
      {actions && (
        // Fijas al pie: en diálogos largos (móvil) "Guardar" nunca queda fuera de pantalla.
        <div class="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex flex-wrap justify-end gap-2 bg-surface-high px-6 pb-6 pt-3">{actions}</div>
      )}
    </dialog>
  )
}
