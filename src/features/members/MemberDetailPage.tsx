import { useRef, useState } from 'preact/hooks'
import { useLocation } from 'wouter'
import { Archive, Ban, Banknote, Mail, Pencil, Phone, StickyNote, UserX } from 'lucide-preact'
import { BackLink } from '@/components/shared/BackLink'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSnackbar } from '@/components/ui/Snackbar'
import { useAuth } from '@/features/auth/AuthProvider'
import { MembershipStateBadge } from '@/features/memberships/MembershipStateBadge'
import { api, AppError } from '@/lib/data'
import type { Member, Membership, Payment } from '@/lib/data'
import { formatDate, membershipState, timestampToISODate, todayISO } from '@/lib/dates'
import { telUrl } from '@/lib/phone'
import { MEMBER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/labels'
import { useAsyncData } from '@/lib/useAsyncData'
import { MemberFormDialog } from './MemberFormDialog'

interface Detail {
  member: Member
  memberships: Membership[]
  payments: Payment[] | null // null = sin permiso para verlos
}

export function MemberDetailPage({ id }: { id: string }) {
  const { can } = useAuth()
  const snack = useSnackbar()
  const [, navigate] = useLocation()
  const [editOpen, setEditOpen] = useState(false)
  const [voiding, setVoiding] = useState<Payment | null>(null)
  const [voidBusy, setVoidBusy] = useState(false)
  const voidingRef = useRef(false)
  const data = useAsyncData<Detail>(async () => {
    const canPayments = can('payments.create') || can('reports.view')
    const [member, memberships, payments] = await Promise.all([
      api.members.get(id),
      api.memberships.listForMember(id),
      canPayments ? api.payments.listForMember(id) : Promise.resolve(null),
    ])
    return { member, memberships, payments }
  }, [id])

  const back = <BackLink href="/socios">Socios</BackLink>

  if (data.loading && !data.data) {
    return (
      <>
        {back}
        <div role="status" aria-label="Cargando" class="h-40 animate-pulse rounded-md bg-surface-highest" />
      </>
    )
  }
  if (data.error || !data.data) {
    const notFound = data.error?.includes('no encontrado')
    return (
      <>
        {back}
        <Card variant="outlined" padded={false}>
          <EmptyState
            icon={UserX}
            title={notFound ? 'Socio no encontrado' : 'No se pudo cargar'}
            description={notFound ? 'El socio no existe o fue eliminado.' : data.error}
            action={!notFound && <Button variant="tonal" onClick={data.reload}>Reintentar</Button>}
          />
        </Card>
      </>
    )
  }

  const { member, memberships, payments } = data.data
  const today = todayISO()
  const archived = member.status === 'archived'
  const current = memberships.find((m) => m.status === 'active')
  const currentState = current ? membershipState(current.endDate, today) : null
  const canCharge = can('payments.create') && can('memberships.write') && !archived

  async function setArchived(next: boolean) {
    try {
      await api.members.update(member.id, { status: next ? 'archived' : 'active' })
      if (next) {
        navigate('/socios')
        snack.show(`"${member.fullName}" archivado`, {
          actionLabel: 'Deshacer',
          onAction: () => {
            void api.members.update(member.id, { status: 'active' }).then(() => navigate(`/socios/${member.id}`))
          },
        })
      } else {
        data.reload()
        snack.show(`"${member.fullName}" restaurado`)
      }
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo actualizar')
    }
  }

  const membershipColumns: Column<Membership>[] = [
    { id: 'plan', header: 'Plan', primary: true, cell: (m) => <span class="font-medium">{m.planName}</span> },
    { id: 'range', header: 'Vigencia', cell: (m) => `${formatDate(m.startDate)} – ${formatDate(m.endDate)}` },
    { id: 'price', header: 'Precio', align: 'right', cell: (m) => <MoneyDisplay cents={m.priceCents - m.discountCents} /> },
    { id: 'paid', header: 'Pagado', align: 'right', cell: (m) => <MoneyDisplay cents={m.paidCents} /> },
    { id: 'due', header: 'Saldo', align: 'right', cell: (m) => <MoneyDisplay cents={m.dueCents} /> },
    {
      id: 'state',
      header: 'Estado',
      cell: (m) => (m.status === 'cancelled' ? <Badge>Cancelada</Badge> : <MembershipStateBadge state={membershipState(m.endDate, today)} />),
    },
  ]

  const paymentColumns: Column<Payment>[] = [
    { id: 'receipt', header: 'Recibo', primary: true, cell: (p) => <span class="font-medium">#{p.receiptNo}</span> },
    { id: 'date', header: 'Fecha', cell: (p) => formatDate(timestampToISODate(p.paidAt)) },
    { id: 'method', header: 'Método', cell: (p) => PAYMENT_METHOD_LABEL[p.method] },
    { id: 'amount', header: 'Monto', align: 'right', cell: (p) => <MoneyDisplay cents={p.amountCents} /> },
    {
      id: 'status',
      header: 'Estado',
      cell: (p) =>
        p.status === 'voided' ? (
          <span class="inline-flex flex-col items-start gap-1">
            <Badge tone="error">Anulado</Badge>
            {p.voidReason && <span class="text-body-sm text-on-surface-variant">{p.voidReason}</span>}
          </span>
        ) : (
          <Badge tone="success">Confirmado</Badge>
        ),
    },
    ...(can('payments.void')
      ? [
          {
            id: 'actions',
            header: 'Acciones',
            actions: true,
            cell: (p: Payment) =>
              p.status === 'confirmed' ? (
                <Button variant="text" icon={<Ban size={18} aria-hidden="true" />} onClick={() => setVoiding(p)}>
                  Anular
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  async function confirmVoid(reason: string) {
    if (!voiding || voidingRef.current) return
    voidingRef.current = true
    setVoidBusy(true)
    try {
      await api.payments.void(voiding.id, reason)
      snack.show(`Recibo #${voiding.receiptNo} anulado`)
      setVoiding(null)
      data.reload()
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo anular el pago')
      setVoiding(null)
      data.reload()
    } finally {
      voidingRef.current = false
      setVoidBusy(false)
    }
  }

  return (
    <>
      {back}
      <PageHeader
        title={member.fullName}
        description={`CI ${member.ci} · Socio desde ${formatDate(member.joinedOn)}`}
        actions={
          <>
            {canCharge && (
              <Button icon={<Banknote size={20} aria-hidden="true" />} onClick={() => navigate(`/cobrar?socio=${member.id}`)}>
                {current ? 'Renovar / cobrar' : 'Cobrar'}
              </Button>
            )}
            {can('members.write') && (
              <Button variant="outlined" icon={<Pencil size={18} aria-hidden="true" />} onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )}
            {can('members.write') && (
              <Button variant="text" icon={<Archive size={18} aria-hidden="true" />} onClick={() => void setArchived(!archived)}>
                {archived ? 'Restaurar' : 'Archivar'}
              </Button>
            )}
          </>
        }
      />

      <div class="mb-6 flex flex-wrap items-center gap-2">
        {member.status !== 'active' && <Badge>{MEMBER_STATUS_LABEL[member.status]}</Badge>}
        {currentState && !archived ? <MembershipStateBadge state={currentState} /> : !archived && <Badge>Sin membresía</Badge>}
        {current && current.dueCents > 0 && !archived && (
          <Badge tone="warning">
            Debe <MoneyDisplay cents={current.dueCents} />
          </Badge>
        )}
      </div>

      <Card variant="outlined" class="mb-6">
        <dl class="grid gap-3 sm:grid-cols-2">
          <div class="flex items-center gap-3">
            <Phone size={20} class="text-on-surface-variant" aria-hidden="true" />
            <div>
              <dt class="text-body-sm text-on-surface-variant">Teléfono</dt>
              <dd><a class="inline-flex min-h-12 items-center text-primary underline sm:min-h-10" href={telUrl(member.phone)}>{member.phone}</a></dd>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Mail size={20} class="text-on-surface-variant" aria-hidden="true" />
            <div>
              <dt class="text-body-sm text-on-surface-variant">Correo</dt>
              <dd>{member.email ?? <span class="text-on-surface-variant">—</span>}</dd>
            </div>
          </div>
          {member.notes && (
            <div class="flex items-start gap-3 sm:col-span-2">
              <StickyNote size={20} class="mt-1 text-on-surface-variant" aria-hidden="true" />
              <div>
                <dt class="text-body-sm text-on-surface-variant">Observaciones</dt>
                <dd>{member.notes}</dd>
              </div>
            </div>
          )}
        </dl>
      </Card>

      <section aria-labelledby="h-memberships" class="mb-6">
        <h2 id="h-memberships" class="mb-3 text-title-lg">Membresías</h2>
        <DataTable
          caption="Historial de membresías"
          columns={membershipColumns}
          rows={memberships}
          rowKey={(m) => m.id}
          empty={<EmptyState title="Sin membresías" description="Todavía no se le vendió ningún plan." />}
        />
      </section>

      {payments && (
        <section aria-labelledby="h-payments">
          <h2 id="h-payments" class="mb-3 text-title-lg">Pagos</h2>
          <DataTable
            caption="Historial de pagos"
            columns={paymentColumns}
            rows={payments}
            rowKey={(p) => p.id}
            empty={<EmptyState title="Sin pagos" description="Aún no hay pagos registrados." />}
          />
        </section>
      )}

      <ConfirmDialog
        open={voiding !== null}
        title="Anular pago"
        destructive
        requireReason
        confirmLabel="Anular pago"
        loading={voidBusy}
        onCancel={() => !voidBusy && setVoiding(null)}
        onConfirm={(reason) => void confirmVoid(reason)}
      >
        {voiding && (
          <p class="text-body-md">
            Se anulará el recibo #{voiding.receiptNo} por <MoneyDisplay cents={voiding.amountCents} />. El monto vuelve a quedar como saldo
            pendiente de la membresía y el pago se conserva marcado como anulado.
          </p>
        )}
      </ConfirmDialog>

      <MemberFormDialog
        open={editOpen}
        member={member}
        onClose={() => setEditOpen(false)}
        onSaved={(m) => {
          setEditOpen(false)
          data.reload()
          snack.show(`Datos de "${m.fullName}" actualizados`)
        }}
      />
    </>
  )
}
