import { useId } from 'preact/hooks'
import { cx } from '@/lib/cx'

export interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
  disabled?: boolean
}

/** Casilla M3 con área táctil de 48 px. La etiqueta es parte del control. */
export function Checkbox({ label, checked, onChange, hint, disabled }: CheckboxProps) {
  const id = useId()
  return (
    <label
      for={id}
      class={cx(
        'state-layer flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 py-1',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
        class="h-5 w-5 shrink-0 accent-primary"
      />
      <span class="min-w-0">
        <span class="block text-body-md text-on-surface">{label}</span>
        {hint && <span class="block text-body-sm text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  )
}
