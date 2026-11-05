import type { ButtonHTMLAttributes, ComponentChildren } from 'preact'
import { cx } from '@/lib/cx'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: los botones de solo icono necesitan nombre accesible. */
  label: string
  children: ComponentChildren
}

/** Botón de icono con área táctil de 48 px. */
export function IconButton({ label, children, class: cls, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      class={cx(
        'state-layer inline-flex size-12 items-center justify-center rounded-full text-on-surface-variant',
        'disabled:pointer-events-none disabled:text-on-surface/38',
        cls as string, className as string,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
