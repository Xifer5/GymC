import { Link, useLocation, useSearch } from 'wouter'
import { Banknote, CalendarCheck, MessageCircle, Phone } from 'lucide-preact'
import { BackLink } from '@/components/shared/BackLink'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/features/auth/AuthProvider'
import { api } from '@/lib/data'
import type { MembershipWithMember } from '@/lib/data'
import { expiryText, formatDate, todayISO } from '@/lib/dates'
import { telUrl, whatsappUrl } from '@/lib/phone'
import { useAsyncData } from '@/lib/useAsyncData'

type Tab = 'expiring' | 'expired'

const ICON_LINK =
  'state-layer inline-flex h-12 w-12 items-center justify-center rounded-full text-primary sm:h-10 sm:w-10'

/** Socios por vencer (próximos 7 días) y vencidos, con contacto rápido y acceso a renovar. */
export function ExpiringPage() {
  const { can } = useAuth()
  const [, navigate] = useLocation()
  const tab: Tab = new URLSearchParams(useSearch()).get('estado') === 'expired' ? 'expired' : 'expiring'
  const data = useAsyncData(() => api.memberships.listByState(tab), [tab])
  const today = todayISO()
  const canCharge = can('payments.create') && can('memberships.write')

  const columns: Column<MembershipWithMember>[] = [
    {
      id: 'member',
      header: 'Socio',
      primary: true,
      cell: (m) => (
        <Link href={`/socios/${m.memberId}`} className="inline-flex min-h-12 items-center font-medium text-primary underline-offset-2 hover:underline sm:min-h-10">
          {m.memberName}
        </Link>
      ),
    },
    { id: 'phone', header: 'Teléfono', cell: (m) => m.memberPhone },
    { id: 'plan', header: 'Plan', cell: (m) => m.planName },
    {
      id: 'end',
      header: 'Vencimiento',
      cell: (m) => (
        <span>
          {formatDate(m.endDate)} <span class="text-body-sm text-on-surface-variant">· {expiryText(m.endDate, today)}</span>
        </span>
      ),
    },
    {
      id: 'due',
      header: 'Saldo',
      align: 'right',
      cell: (m) => (m.dueCents > 0 ? <MoneyDisplay cents={m.dueCents} /> : <span class="text-on-surface-variant">—</span>),
    },
    {
      id: 'actions',
      header: 'Acciones',
      actions: true,
      cell: (m) => {
        const wa = whatsappUrl(m.memberPhone, `Hola ${m.memberName.split(' ')[0]}, te escribimos del gimnasio.`)
        return (
          <div class="flex items-center justify-end gap-1">
            <a href={telUrl(m.memberPhone)} class={ICON_LINK} aria-label={`Llamar a ${m.memberName}`}>
              <Phone size={20} aria-hidden="true" />
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" class={ICON_LINK} aria-label={`WhatsApp a ${m.memberName}`}>
                <MessageCircle size={20} aria-hidden="true" />
              </a>
            )}
            {canCharge && (
              <Button variant="tonal" icon={<Banknote size={18} aria-hidden="true" />} onClick={() => navigate(`/cobrar?socio=${m.memberId}`)}>
                Renovar
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <BackLink href="/socios">Socios</BackLink>
      <PageHeader title="Vencimientos" description="Socios que necesitan renovar. Ordenados del más urgente al menos." />

      <div class="mb-4 max-w-md">
        <Segmented<Tab>
          label="Estado de la membresía"
          value={tab}
          onChange={(t) => navigate(`/vencimientos?estado=${t}`, { replace: true })}
          options={[
            { value: 'expiring', label: `Por vencer${tab === 'expiring' && data.data ? ` (${data.data.length})` : ''}` },
            { value: 'expired', label: `Vencidas${tab === 'expired' && data.data ? ` (${data.data.length})` : ''}` },
          ]}
        />
      </div>

      <DataTable
        caption={tab === 'expiring' ? 'Socios por vencer' : 'Socios con membresía vencida'}
        columns={columns}
        rows={data.data ?? []}
        rowKey={(m) => m.id}
        loading={data.loading}
        error={data.error}
        onRetry={data.reload}
        empty={
          <EmptyState
            icon={CalendarCheck}
            title={tab === 'expiring' ? 'Nadie vence en los próximos 7 días' : 'No hay membresías vencidas'}
            description="Buen trabajo: todos los socios están al día."
          />
        }
      />
    </>
  )
}
