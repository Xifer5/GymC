import type { ComponentChildren } from 'preact'
import { Inbox } from 'lucide-preact'
import type { LucideProps } from 'lucide-preact'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: (props: LucideProps) => ComponentChildren
  /** Acción principal sugerida, p. ej. <Button>Registrar socio</Button>. */
  action?: ComponentChildren
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span class="mb-2 flex size-16 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
        <Icon size={28} aria-hidden="true" />
      </span>
      <p class="text-title-lg text-on-surface">{title}</p>
      {description && <p class="max-w-sm text-body-md text-on-surface-variant">{description}</p>}
      {action && <div class="mt-4">{action}</div>}
    </div>
  )
}
