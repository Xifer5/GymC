import { CalendarClock, CircleAlert, UserCheck, Users } from 'lucide-preact'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/AuthProvider'
import { DemoDataCard } from '@/features/settings/DemoDataCard'
import { api, demo } from '@/lib/data'
import type { PaymentWithMember, Summary } from '@/lib/data'
import { formatDate, timestampToISODate } from '@/lib/dates'
import { PAYMENT_METHOD_LABEL } from '@/lib/labels'
import { formatMoney } from '@/lib/money'
import { useAsyncData } from '@/lib/useAsyncData'

const METHODS = ['cash', 'transfer', 'qr'] as const

function FinanceCard({ title, summary }: { title: string; summary: Summary }) {
  return (
    <Card variant="outlined" aria-label={title}>
      <h3 class="mb-3 text-title-md">{title}</h3>
      <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-md">
        <dt class="text-on-surface-variant">Ingresos</dt>
        <dd class="text-right"><MoneyDisplay cents={summary.incomeCents} /></dd>
        <dt class="pl-3 text-body-sm text-on-surface-variant">Membresías</dt>
        <dd class="text-right text-body-sm text-on-surface-variant"><MoneyDisplay cents={summary.paymentsCents} /></dd>
        <dt class="pl-3 text-body-sm text-on-surface-variant">Otros ingresos</dt>
        <dd class="text-right text-body-sm text-on-surface-variant"><MoneyDisplay cents={summary.otherIncomeCents} /></dd>
        <dt class="text-on-surface-variant">Egresos</dt>
        <dd class="text-right">− <MoneyDisplay cents={summary.expenseCents} /></dd>
        <div role="presentation" class="col-span-2 my-1 border-t border-outline-variant" />
        <dt class="text-title-sm">Balance</dt>
        <dd class="text-right text-title-sm"><MoneyDisplay cents={summary.balanceCents} /></dd>
      </dl>
      <p class="mt-3 text-body-sm text-on-surface-variant">
        {METHODS.map((m) => `${PAYMENT_METHOD_LABEL[m]} ${formatMoney(summary.incomeByMethod[m])}`).join(' · ')}
      </p>
    </Card>
  )
}

/** Inicio: socios (activos, por vencer, vencidos), finanzas de hoy y del mes, y últimos pagos. */
export function DashboardPage() {
  const { user, can } = useAuth()
  const data = useAsyncData(() => api.dashboard.get(), [])
  const canSeeMembers = can('members.read')

  const header = (
    <PageHeader
      title="Inicio"
      description={user ? `Hola, ${user.fullName.split(' ')[0]}. Esto es lo de hoy.` : undefined}
    />
  )

  if (data.loading && !data.data) {
    return (
      <>
        {header}
        <div role="status" aria-label="Cargando" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} class="h-24 animate-pulse rounded-md bg-surface-highest" />
          ))}
        </div>
      </>
    )
  }
  if (data.error || !data.data) {
    return (
      <>
        {header}
        <Card variant="outlined" padded={false}>
          <EmptyState title="No se pudo cargar" description={data.error} action={<Button variant="tonal" onClick={data.reload}>Reintentar</Button>} />
        </Card>
      </>
    )
  }

  const d = data.data
  const link = canSeeMembers ? '/socios' : undefined
  const soon = canSeeMembers ? '/vencimientos?estado=expiring' : undefined
  const late = canSeeMembers ? '/vencimientos?estado=expired' : undefined

  const columns: Column<PaymentWithMember>[] = [
    { id: 'member', header: 'Socio', primary: true, cell: (p) => <span class="font-medium">{p.memberName}</span> },
    { id: 'date', header: 'Fecha', cell: (p) => formatDate(timestampToISODate(p.paidAt)) },
    { id: 'method', header: 'Método', cell: (p) => PAYMENT_METHOD_LABEL[p.method] },
    { id: 'amount', header: 'Monto', align: 'right', cell: (p) => <MoneyDisplay cents={p.amountCents} /> },
  ]

  return (
    <>
      {header}

      {d.totalMembers === 0 && demo.available && can('settings.manage') && (
        <div class="mb-6">
          <DemoDataCard hasData={false} onChanged={data.reload} />
        </div>
      )}

      <section aria-label="Socios" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Socios" value={d.totalMembers} icon={Users} href={link} hint="Sin archivados" />
        <StatCard label="Activos" value={d.activeMembers} icon={UserCheck} tone="success" href={link} hint="Membresía vigente" />
        <StatCard label="Por vencer" value={d.expiringMembers} icon={CalendarClock} tone="warning" href={soon} hint="Próximos 7 días" />
        <StatCard label="Vencidos" value={d.expiredMembers} icon={CircleAlert} tone="error" href={late} hint="Sin renovar" />
      </section>

      {d.finance && (
        <section aria-labelledby="h-finance" class="mb-6">
          <h2 id="h-finance" class="mb-3 text-title-lg">Finanzas</h2>
          <div class="grid gap-3 md:grid-cols-2">
            <FinanceCard title="Hoy" summary={d.finance.today} />
            <FinanceCard title="Este mes" summary={d.finance.month} />
          </div>
        </section>
      )}

      {(can('payments.create') || can('reports.view')) && (
        <section aria-labelledby="h-recent">
          <h2 id="h-recent" class="mb-3 text-title-lg">Últimos pagos</h2>
          <DataTable
            caption="Últimos pagos"
            columns={columns}
            rows={d.recentPayments}
            rowKey={(p) => p.id}
            empty={<EmptyState title="Sin pagos todavía" description="Los cobros aparecerán aquí." />}
          />
        </section>
      )}
    </>
  )
}
