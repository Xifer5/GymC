import type { InputHTMLAttributes } from 'preact'
import { useId } from 'preact/hooks'
import { CircleAlert } from 'lucide-preact'
import { cx } from '@/lib/cx'

const ALWAYS_FLOATED = ['date', 'time', 'month', 'week', 'datetime-local']

type NativeInput = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'id' | 'name' | 'disabled' | 'required' | 'readOnly' | 'autofocus' | 'autocomplete' | 'inputMode'
  | 'maxLength' | 'min' | 'max' | 'step' | 'placeholder' | 'onBlur' | 'onFocus'
>

export interface TextFieldProps extends NativeInput {
  class?: string
  className?: string
  type?: string
  label: string
  value: string
  onValueChange: (value: string) => void
  /** Mensaje de error (también marca el campo como inválido). */
  error?: string
  helper?: string
  /** Texto fijo antes del valor, p. ej. "Bs". */
  prefixText?: string
}

/** Campo de texto M3 "filled": la etiqueta flota al enfocar o con valor. */
export function TextField({
  label, value, onValueChange, error, helper, prefixText, type = 'text', id, class: cls, className, ...rest
}: TextFieldProps) {
  const auto = useId()
  const inputId = id ?? auto
  const noteId = `${inputId}-note`
  const floated = value !== '' || !!prefixText || ALWAYS_FLOATED.includes(type)
  const note = error ?? helper

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
          for={inputId}
          class={cx(
            'pointer-events-none absolute left-4 transition-all',
            floated ? 'top-2 text-body-sm' : 'top-4 text-body-lg',
            'group-focus-within:top-2 group-focus-within:text-body-sm',
            error ? 'text-error' : 'text-on-surface-variant group-focus-within:text-primary',
          )}
        >
          {label}
        </label>
        {prefixText && (
          <span class="pointer-events-none absolute bottom-1 left-4 text-body-lg text-on-surface-variant">
            {prefixText}
          </span>
        )}
        <input
          id={inputId}
          type={type as 'text'}
          value={value}
          onInput={(e) => onValueChange(e.currentTarget.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          class={cx(
            'h-14 w-full bg-transparent pb-1 pt-5 text-body-lg text-on-surface outline-none',
            prefixText ? 'pl-11 pr-4' : 'px-4',
          )}
          {...rest}
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
