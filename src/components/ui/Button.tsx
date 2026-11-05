import type { ButtonHTMLAttributes, ComponentChildren } from 'preact'
import { LoaderCircle } from 'lucide-preact'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Muestra spinner y bloquea clics (evita doble envío). */
  loading?: boolean
  icon?: ComponentChildren
  fullWidth?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary disabled:bg-on-surface/12',
  tonal: 'bg-secondary-container text-on-secondary-container disabled:bg-on-surface/12',
  outlined: 'border border-outline text-primary disabled:border-on-surface/12',
  text: 'px-3 text-primary',
  danger: 'bg-error text-on-error disabled:bg-on-surface/12',
}

export function Button({
  variant = 'filled', loading, icon, fullWidth, class: cls, className, disabled, type = 'button',
  children, ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      class={cx(
        'state-layer inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-label-lg',
        'transition-shadow select-none disabled:pointer-events-none disabled:text-on-surface/38 sm:h-10',
        VARIANTS[variant],
        fullWidth && 'w-full',
        cls as string, className as string,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle size={18} class="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
