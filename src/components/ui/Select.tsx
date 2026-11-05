import type { SelectHTMLAttributes } from 'preact'
import { useId } from 'preact/hooks'
import { ChevronDown, CircleAlert } from 'lucide-preact'
import { cx } from '@/lib/cx'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

type NativeSelect = Pick<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'name' | 'disabled' | 'required' | 'autofocus' | 'onBlur' | 'onFocus'
>

export interface SelectProps extends NativeSelect {
  class?: string
  className?: string
  label: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  /** Si se indica, añade una primera opción vacía con este texto. */
  placeholder?: string
  error?: string
  helper?: string
}

/** Select nativo con estilo M3 filled (accesible y cómodo en móvil). */
export function Select({
  label, value, onValueChange, options, placeholder, error, helper, id, class: cls, className, ...rest
}: SelectProps) {
  const auto = useId()
  const selectId = id ?? auto
  const noteId = `${selectId}-note`
  const note = error ?? helper
  // La etiqueta flota si hay texto visible: una opción coincide con el valor (incluso si es '') o hay placeholder.
  const hasSelection = placeholder !== undefined || options.some((o) => o.value === value)

  return (
    <div class={cx('w-full', cls as string, className as string)}>
      <div
        class={cx(
          'group relative rounded-t-xs bg-surface-highest has-disabled:opacity-60',
          error
            ? 'shadow-[inset_0_-2px_0_var(--md-error)]'
            : 'shadow-[inset_0_-1px_0_var(--md-on-surface-variant)] focus-within:shadow-[inset_0_-2px_0_var(--md-primary)]',
        )}
      >
        <label
          for={selectId}
          class={cx(
            'pointer-events-none absolute left-4 transition-all',
            hasSelection ? 'top-2 text-body-sm' : 'top-4 text-body-lg',
            'group-focus-within:top-2 group-focus-within:text-body-sm',
            error ? 'text-error' : 'text-on-surface-variant group-focus-within:text-primary',
          )}
        >
          {label}
        </label>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onValueChange(e.currentTarget.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          class="h-14 w-full appearance-none bg-transparent px-4 pb-1 pr-11 pt-5 text-body-lg text-on-surface outline-none"
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          aria-hidden="true"
          class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
      </div>
      {note && (
        <p
          id={noteId}
          role={error ? 'alert' : undefined}
          class={cx('mt-1 flex items-center gap-1 px-4 text-body-sm', error ? 'text-error' : 'text-on-surface-variant')}
        >
          {error && <CircleAlert size={14} aria-hidden="true" />}
          {note}
        </p>
      )}
    </div>
  )
}
