import type { ComponentChildren } from 'preact'
import { CircleCheck, CircleX, Clock, Info } from 'lucide-preact'
import { cx } from '@/lib/cx'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info'

const TONES: Record<BadgeTone, { cls: string; Icon: typeof Info }> = {
  neutral: { cls: 'bg-surface-highest text-on-surface-variant', Icon: Info },
  info: { cls: 'bg-tertiary-container text-on-tertiary-container', Icon: Info },
  success: { cls: 'bg-success-container text-on-success-container', Icon: CircleCheck },
  warning: { cls: 'bg-warning-container text-on-warning-container', Icon: Clock },
  error: { cls: 'bg-error-container text-on-error-container', Icon: CircleX },
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ComponentChildren
  /** Icono + texto: el estado nunca depende solo del color. */
  icon?: boolean
}

export function Badge({ tone = 'neutral', children, icon = true }: BadgeProps) {
  const { cls, Icon } = TONES[tone]
  return (
    <span class={cx('inline-flex h-6 items-center gap-1 rounded-sm px-2 text-label-md whitespace-nowrap', cls)}>
      {icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </span>
  )
}
