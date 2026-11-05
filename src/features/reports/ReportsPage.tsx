import { useMemo, useState } from 'preact/hooks'
import { ChartColumn, Download } from 'lucide-preact'
import { BarChart } from '@/components/shared/BarChart'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { useSnackbar } from '@/components/ui/Snackbar'
import { TextField } from '@/components/ui/TextField'
import { api } from '@/lib/data'
import { addDays, formatDate, monthRange, todayISO } from '@/lib/dates'
import { downloadText } from '@/lib/download'
import { PAYMENT_METHOD_LABEL } from '@/lib/labels'
import { buildReport, csvFileName, ledgerToCsv } from '@/lib/reports'
import type { CategoryTotal } from '@/lib/reports'
import { useAsyncData } from '@/lib/useAsyncData'

type Preset = 'today' | 'week' | 'month' | 'lastMonth' | 'custom'

const MAX_DAYS = 366
const METHODS = ['cash', 'transfer', 'qr'] as const

function rangeFor(preset: Exclude<Preset, 'custom'>, today: string) {
  if (preset === 'today') return { from: today, to: today }
  if (preset === 'week') return { from: addDays(today, -6), to: today }
  if (preset === 'month') return monthRange(today)
  return monthRange(addDays(monthRange(today).from, -1))
}

function CategoryTable({ title, rows, total }: { title: string; rows: CategoryTotal[]; total: number }) {
  return (
    <Card variant="outlined" class="min-w-0">
      <h3 class="mb-3 text-title-md">{title}</h3>
      {rows.length === 0 ? (
        <p class="text-body-md text-on-surface-variant">Sin movimientos en este período.</p>
      ) : (
        <ul class="space-y-3">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.cents / total) * 100) : 0
            return (
              <li key={r.category}>
                <div class="flex items-baseline justify-between gap-3 text-body-md">
                  <span class="truncate">{r.category}</span>
                  <span class="shrink-0">
                    <MoneyDisplay cents={r.cents} /> <span class="text-body-sm text-on-surface-variant">· {pct}%</span>
                  </span>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-surface-highest" aria-hidden="true">
                  <div class="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** Reportes: ingresos, egresos y balance de un período, con desglose y exportación a CSV. */
export function ReportsPage() {
  const snack = useSnackbar()
  const today = todayISO()
  const [preset, setPreset] = useState<Preset>('month')
  const [custom, setCustom] = useState(monthRange(today))

  const { from, to } = preset === 'custom' ? custom : rangeFor(preset, today)
  const rangeError =
    !from || !to
      ? 'Elige las dos fechas'
      : from > to
        ? '"Hasta" es anterior a "Desde"'
        : (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000 >= MAX_DAYS
          ? `El período máximo es de ${MAX_DAYS} días`
          : undefined

  const data = useAsyncData(
    () => (rangeError ? Promise.resolve(null) : api.reports.ledger({ from, to })),
    [from, to, rangeError],
  )
  const entries = data.data ?? []
  const report = useMemo(() => (rangeError ? null : buildReport(entries, from, to)), [data.data, from, to, rangeError])

  function exportCsv() {
    downloadText(csvFileName(from, to), ledgerToCsv(entries))
    snack.show(`${entries.length} movimientos exportados`)
  }

  const empty = !rangeError && !data.loading && !data.error && entries.length === 0

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Ingresos, egresos y balance por período."
        actions={
          <Button
            variant="outlined"
            icon={<Download size={18} aria-hidden="true" />}
            onClick={exportCsv}
            disabled={!!rangeError || data.loading || entries.length === 0}
          >
            Exportar CSV
          </Button>
        }
      />

      <div class="mb-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Período"
          value={preset}
          onValueChange={(v) => {
            if (v === 'custom') setCustom({ from, to })
            setPreset(v as Preset)
          }}
          options={[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Últimos 7 días' },
            { value: 'month', label: 'Este mes' },
            { value: 'lastMonth', label: 'Mes anterior' },
            { value: 'custom', label: 'Personalizado' },
          ]}
        />
        {preset === 'custom' && (
          <>
            <TextField label="Desde" type="date" value={custom.from} onValueChange={(v) => setCustom((c) => ({ ...c, from: v }))} />
            <TextField
              label="Hasta"
              type="date"
              value={custom.to}
              onValueChange={(v) => setCustom((c) => ({ ...c, to: v }))}
              error={rangeError}
            />
          </>
        )}
      </div>
      {!rangeError && (
        <p class="mb-4 text-body-sm text-on-surface-variant">
          Del {formatDate(from)} al {formatDate(to)}
        </p>
      )}

      {data.error ? (
        <Card variant="outlined" padded={false}>
          <EmptyState title="No se pudo cargar" description={data.error} action={<Button variant="tonal" onClick={data.reload}>Reintentar</Button>} />
        </Card>
      ) : rangeError && preset !== 'custom' ? null : !report || (data.loading && !data.data) ? (
        <div role="status" aria-label="Cargando" class="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} class="h-24 animate-pulse rounded-md bg-surface-highest" />
          ))}
        </div>
      ) : empty ? (
        <Card variant="outlined" padded={false}>
          <EmptyState icon={ChartColumn} title="Sin movimientos" description="No hay cobros ni movimientos en este período." />
        </Card>
      ) : (
        <div class={data.loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={data.loading}>
          <section aria-label="Resumen" class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Ingresos" value={<MoneyDisplay cents={report.incomeCents} />} tone="success" />
            <StatCard label="Egresos" value={<MoneyDisplay cents={report.expenseCents} />} tone="warning" />
            <StatCard label="Balance" value={<MoneyDisplay cents={report.balanceCents} />} tone={report.balanceCents < 0 ? 'error' : 'neutral'} />
          </section>

          <section aria-labelledby="h-daily" class="mb-6">
            <h2 id="h-daily" class="mb-3 text-title-lg">Por día</h2>
            <Card variant="outlined">
              <BarChart
                data={report.byDay.map((d) => ({ label: formatDate(d.date), a: d.incomeCents, b: d.expenseCents }))}
                labelA="Ingresos"
                labelB="Egresos"
                summary={`Ingresos y egresos diarios del ${formatDate(from)} al ${formatDate(to)}`}
              />
            </Card>
          </section>

          <section aria-labelledby="h-cat" class="mb-6">
            <h2 id="h-cat" class="mb-3 text-title-lg">Por categoría</h2>
            <div class="grid gap-3 md:grid-cols-2">
              <CategoryTable title="Ingresos" rows={report.incomeByCategory} total={report.incomeCents} />
              <CategoryTable title="Egresos" rows={report.expenseByCategory} total={report.expenseCents} />
            </div>
          </section>

          <section aria-labelledby="h-method">
            <h2 id="h-method" class="mb-3 text-title-lg">Por método de pago</h2>
            <Card variant="outlined" padded={false} class="overflow-x-auto">
              <table class="w-full text-body-md">
                <caption class="sr-only">Ingresos y egresos por método de pago</caption>
                <thead>
                  <tr class="bg-surface-container text-left text-label-lg text-on-surface-variant">
                    <th scope="col" class="px-4 py-3">Método</th>
                    <th scope="col" class="px-4 py-3 text-right">Ingresos</th>
                    <th scope="col" class="px-4 py-3 text-right">Egresos</th>
                  </tr>
                </thead>
                <tbody>
                  {METHODS.map((m) => (
                    <tr key={m} class="border-t border-outline-variant">
                      <th scope="row" class="px-4 py-3 text-left font-normal">{PAYMENT_METHOD_LABEL[m]}</th>
                      <td class="px-4 py-3 text-right"><MoneyDisplay cents={report.incomeByMethod[m]} /></td>
                      <td class="px-4 py-3 text-right"><MoneyDisplay cents={report.expenseByMethod[m]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </div>
      )}
    </>
  )
}
