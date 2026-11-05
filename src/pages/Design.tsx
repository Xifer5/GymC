/** Catálogo de componentes. Solo existe en desarrollo (ruta /design). */
import { useState } from 'preact/hooks'
import { Users } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { Pagination } from '@/components/shared/Pagination'
import { SearchBar } from '@/components/shared/SearchBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { useSnackbar } from '@/components/ui/Snackbar'
import { TextField } from '@/components/ui/TextField'
import { getTheme, setTheme } from '@/lib/theme'
import { usePagedList } from '@/lib/usePagedList'
import type { Theme } from '@/lib/theme'

interface DemoRow {
  id: string
  name: string
  plan: string
  status: 'active' | 'expiring' | 'expired'
  due: number
}
const PLANS = ['Mensual', 'Semanal', 'Quincenal', 'Diario']
const DEMO: DemoRow[] = Array.from({ length: 57 }, (_, i) => ({
  id: String(i),
  name: ['Ana Pérez', 'José Núñez', 'María Rojas', 'Luis Vargas', 'Carla Mamani'][i % 5] + ` ${i + 1}`,
  plan: PLANS[i % 4],
  status: (['active', 'expiring', 'expired'] as const)[i % 3],
  due: i % 4 === 0 ? 5000 : 0,
}))
const STATUS = {
  active: <Badge tone="success">Activa</Badge>,
  expiring: <Badge tone="warning">Por vencer</Badge>,
  expired: <Badge tone="error">Vencida</Badge>,
}

function TableDemo() {
  const [mode, setMode] = useState<'normal' | 'error' | 'empty'>('normal')
  const list = usePagedList<DemoRow>(
    async ({ page, pageSize, search }) => {
      await new Promise((r) => setTimeout(r, 500))
      if (mode === 'error') throw new Error('Sin conexión con el servidor')
      const all = mode === 'empty' ? [] : DEMO.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length }
    },
    { pageSize: 10, deps: [mode] },
  )
  const snack = useSnackbar()
  const columns: Column<DemoRow>[] = [
    { id: 'name', header: 'Socio', primary: true, cell: (r) => r.name },
    { id: 'plan', header: 'Plan', cell: (r) => r.plan },
    { id: 'status', header: 'Estado', cell: (r) => STATUS[r.status] },
    { id: 'due', header: 'Saldo', align: 'right', cell: (r) => <MoneyDisplay cents={r.due} /> },
  ]
  return (
    <div class="space-y-3">
      <div class="flex flex-wrap gap-2">
        {(['normal', 'error', 'empty'] as const).map((m) => (
          <Button key={m} variant={mode === m ? 'tonal' : 'outlined'} onClick={() => setMode(m)}>
            {m}
          </Button>
        ))}
      </div>
      <SearchBar onSearch={list.setSearch} placeholder="Buscar por nombre" />
      <DataTable
        caption="Socios de ejemplo"
        columns={columns}
        rows={list.items}
        rowKey={(r) => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(r) => snack.show(`Abrir ${r.name}`)}
        empty={<EmptyState icon={Users} title="Sin socios" description="Prueba con otra búsqueda." />}
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} disabled={list.loading} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <section class="space-y-3">
      <h2 class="text-title-lg">{title}</h2>
      {children}
    </section>
  )
}

export default function Design() {
  const snack = useSnackbar()
  const [theme, setT] = useState<Theme>(getTheme())
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('150,00')
  const [date, setDate] = useState('2026-03-05')
  const [plan, setPlan] = useState('')
  const [dlg, setDlg] = useState<'confirm' | 'void' | null>(null)
  const [saving, setSaving] = useState(false)

  return (
    <main class="mx-auto max-w-3xl space-y-8 p-4 pb-24">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-headline-md">Catálogo de componentes</h1>
        <Select
          label="Tema"
          value={theme}
          onValueChange={(v) => {
            setT(v as Theme)
            setTheme(v as Theme)
          }}
          options={[
            { value: 'system', label: 'Sistema' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
          class="max-w-48"
        />
      </header>

      <Section title="Button">
        <div class="flex flex-wrap gap-2">
          <Button>Cobrar</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="danger">Anular</Button>
          <Button disabled>Disabled</Button>
          <Button
            loading={saving}
            onClick={() => {
              setSaving(true)
              setTimeout(() => setSaving(false), 1500)
            }}
          >
            {saving ? 'Guardando' : 'Probar loading'}
          </Button>
        </div>
      </Section>

      <Section title="TextField / Select">
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre completo" value={name} onValueChange={setName} autocomplete="off" />
          <TextField label="Monto" prefixText="Bs" value={amount} onValueChange={setAmount} inputMode="decimal" />
          <TextField label="Fecha" type="date" value={date} onValueChange={setDate} />
          <TextField label="Con ayuda" value="" onValueChange={() => {}} helper="Solo números" />
          <TextField label="Con error" value="abc" onValueChange={() => {}} error="El CI no es válido" />
          <TextField label="Deshabilitado" value="" onValueChange={() => {}} disabled />
          <Select
            label="Plan"
            value={plan}
            onValueChange={setPlan}
            placeholder="Selecciona…"
            options={[
              { value: 'm', label: 'Mensual · Bs 150,00' },
              { value: 's', label: 'Semanal · Bs 50,00' },
            ]}
          />
          <Select label="Con error" value="" onValueChange={() => {}} options={[]} error="Selecciona un plan" />
        </div>
      </Section>

      <Section title="Badge">
        <div class="flex flex-wrap gap-2">
          <Badge tone="success">Activa</Badge>
          <Badge tone="warning">Por vencer</Badge>
          <Badge tone="error">Vencida</Badge>
          <Badge tone="info">Parcial</Badge>
          <Badge>Archivado</Badge>
          <Badge tone="success" icon={false}>Sin icono</Badge>
        </div>
      </Section>

      <Section title="Card">
        <div class="grid gap-3 sm:grid-cols-3">
          <Card variant="elevated">Elevated</Card>
          <Card variant="filled">Filled</Card>
          <Card variant="outlined">Outlined</Card>
        </div>
      </Section>

      <Section title="Dialog / Snackbar">
        <div class="flex flex-wrap gap-2">
          <Button variant="outlined" onClick={() => setDlg('confirm')}>Confirmar</Button>
          <Button variant="outlined" onClick={() => setDlg('void')}>Anular con motivo</Button>
          <Button variant="tonal" onClick={() => snack.show('Pago registrado')}>Snackbar</Button>
          <Button
            variant="tonal"
            onClick={() => snack.show('Socio archivado', { actionLabel: 'Deshacer', onAction: () => snack.show('Restaurado') })}
          >
            Snackbar con acción
          </Button>
        </div>
      </Section>

      <Section title="DataTable + SearchBar + Pagination">
        <TableDemo />
      </Section>

      <Section title="EmptyState">
        <Card variant="outlined" padded={false}>
          <EmptyState
            icon={Users}
            title="Aún no hay socios"
            description="Registra al primer socio para empezar a cobrar membresías."
            action={<Button>Registrar socio</Button>}
          />
        </Card>
      </Section>

      <ConfirmDialog
        open={dlg === 'confirm'}
        title="¿Archivar socio?"
        confirmLabel="Archivar"
        onConfirm={() => { setDlg(null); snack.show('Socio archivado') }}
        onCancel={() => setDlg(null)}
      >
        El socio dejará de aparecer en los listados, pero su historial se conserva.
      </ConfirmDialog>
      <ConfirmDialog
        open={dlg === 'void'}
        title="Anular pago"
        confirmLabel="Anular"
        destructive
        requireReason
        onConfirm={(reason) => { setDlg(null); snack.show(`Anulado: ${reason}`) }}
        onCancel={() => setDlg(null)}
      >
        El pago quedará en el historial como anulado.
      </ConfirmDialog>
    </main>
  )
}
