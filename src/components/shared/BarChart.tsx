import { formatMoney } from '@/lib/money'
import type { Cents } from '@/lib/money'

export interface BarDatum {
  label: string
  a: Cents
  b: Cents
}

export interface BarChartProps {
  data: BarDatum[]
  /** Nombres de las dos series (a = verde, b = rojo). */
  labelA: string
  labelB: string
  /** Texto accesible de todo el gráfico. */
  summary: string
}

const H = 140
const BAR = 6
const GAP = 4
const PAIR = BAR * 2 + 1 + GAP

/** Barras agrupadas A/B por día en SVG propio (sin dependencias). Cada barra lleva `<title>` con su valor. */
export function BarChart({ data, labelA, labelB, summary }: BarChartProps) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]))
  const w = Math.max(1, data.length) * PAIR
  const h = (v: Cents) => (v <= 0 ? 0 : Math.max(2, (v / max) * H))

  return (
    <figure class="m-0">
      <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-label-md text-on-surface-variant">
        <span class="inline-flex items-center gap-2">
          <span class="h-3 w-3 rounded-sm bg-primary" aria-hidden="true" /> {labelA}
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="h-3 w-3 rounded-sm bg-error" aria-hidden="true" /> {labelB}
        </span>
        <span class="ml-auto tabular-nums">Máx. {formatMoney(max)}</span>
      </div>
      <div>
        <svg
          role="img"
          aria-label={summary}
          viewBox={`0 0 ${w} ${H}`}
          preserveAspectRatio="none"
          class="block h-36 w-full"
        >
          <line x1="0" x2={w} y1={H - 0.5} y2={H - 0.5} class="stroke-outline-variant" stroke-width="1" vector-effect="non-scaling-stroke" />
          {data.map((d, i) => {
            const x = i * PAIR + GAP / 2
            return (
              <g key={d.label}>
                <rect x={x} y={H - h(d.a)} width={BAR} height={h(d.a)} rx="1" class="fill-primary">
                  <title>{`${d.label} · ${labelA}: ${formatMoney(d.a)}`}</title>
                </rect>
                <rect x={x + BAR + 1} y={H - h(d.b)} width={BAR} height={h(d.b)} rx="1" class="fill-error">
                  <title>{`${d.label} · ${labelB}: ${formatMoney(d.b)}`}</title>
                </rect>
              </g>
            )
          })}
        </svg>
      </div>
      {data.length > 1 && (
        <div class="mt-1 flex justify-between text-label-sm text-on-surface-variant" aria-hidden="true">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </figure>
  )
}
