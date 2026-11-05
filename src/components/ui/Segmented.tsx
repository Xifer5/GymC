import { Check } from 'lucide-preact'
import { cx } from '@/lib/cx'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  /** Nombre accesible del grupo. */
  label: string
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
}

/** Botón segmentado M3 (selección única). Útil con 2–4 opciones: método de pago, modo de cobro. */
export function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} class="flex w-full overflow-hidden rounded-full border border-outline">
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            class={cx(
              'state-layer flex h-12 min-w-0 flex-auto items-center justify-center gap-2 px-2 text-label-lg sm:h-10',
              i > 0 && 'border-l border-outline',
              selected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface',
            )}
          >
            {selected && <Check size={16} aria-hidden="true" />}
            <span class="truncate">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
