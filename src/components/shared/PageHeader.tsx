import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Acciones de la página (botones). Se alinean a la derecha en pantallas anchas. */
  actions?: ComponentChildren
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  // Cada pantalla se anuncia con su nombre (lectores de pantalla, historial, pestañas).
  useEffect(() => {
    document.title = `${title} · Gym Manager`
  }, [title])
  return (
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-headline-sm text-on-surface sm:text-headline-md">{title}</h1>
        {description && <p class="mt-1 text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div class="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
