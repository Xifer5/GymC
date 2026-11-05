import type { ComponentChildren, HTMLAttributes } from 'preact'
import { cx } from '@/lib/cx'

export type CardVariant = 'elevated' | 'filled' | 'outlined'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Padding interno de 16 px (desactivar si el contenido ya lo trae, p. ej. tablas). */
  padded?: boolean
  children?: ComponentChildren
}

const VARIANTS: Record<CardVariant, string> = {
  elevated: 'bg-surface-low shadow-1',
  filled: 'bg-surface-highest',
  outlined: 'bg-surface border border-outline-variant',
}

/** Agrupa información relacionada. */
export function Card({ variant = 'elevated', padded = true, class: cls, className, children, ...rest }: CardProps) {
  return (
    <div class={cx('rounded-md', VARIANTS[variant], padded && 'p-4', cls as string, className as string)} {...rest}>
      {children}
    </div>
  )
}
