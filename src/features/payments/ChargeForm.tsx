import { useRef, useState } from 'preact/hooks'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { MembershipStateBadge } from '@/features/memberships/MembershipStateBadge'
import { api } from '@/lib/data'
import type { Member, Membership, PaymentMethod, Plan } from '@/lib/data'
import { formatDate, membershipEnd, membershipState, renewalStart, todayISO } from '@/lib/dates'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/labels'
import { formatMoney, formatMoneyInput, parseMoney } from '@/lib/money'
import { useAsyncData } from '@/lib/useAsyncData'
import { chargeTotals, validateBalancePayment, validatePlanCharge } from '@/lib/validations/charge'
import type { PlanChargeErrors } from '@/lib/validations/charge'
import type { ReceiptData } from './Receipt'

type Mode = 'plan' | 'balance'

interface Props {
  memberId: string
  onChangeMember: () => void
  onDone: (receipt: ReceiptData) => void
}

/** Carga los datos del socio y delega en `ChargeFormBody` (que inicializa su estado una sola vez). */
export function ChargeForm({ memberId, onChangeMember, onDone }: Props) {
  const data = useAsyncData(async () => {
    const [member, memberships, plans] = await Promise.all([
      api.members.get(memberId),
      api.memberships.listForMember(memberId),
      api.plans.list(),
    ])
    return { member, memberships, plans }
  }, [memberId])

  if (data.loading && !data.data) {
    return <div role="status" aria-label="Cargando" class="h-48 animate-pulse rounded-md bg-surface-highest" />
  }
  if (data.error || !data.data) {
    return (
      <Card variant="outlined" padded={false}>
        <EmptyState
          title={data.error?.includes('no encontrado') ? 'Socio no encontrado' : 'No se pudo cargar'}
          description={data.error?.includes('no encontrado') ? 'Elige otro socio.' : data.error}
          action={<Button variant="tonal" onClick={data.error?.includes('no encontrado') ? onChangeMember : data.reload}>{data.error?.includes('no encontrado') ? 'Buscar socio' : 'Reintentar'}</Button>}
        />
      </Card>
    )
  }
  return <ChargeFormBody {...data.data} onChangeMember={onChangeMember} onDone={onDone} />
}

interface BodyProps {
  member: Member
  memberships: Membership[]
  plans: Plan[]
  onChangeMember: () => void
  onDone: (receipt: ReceiptData) => void
}

function ChargeFormBody({ member, memberships, plans, onChangeMember, onDone }: BodyProps) {
  const today = todayISO()
  const active = memberships.filter((m) => m.status === 'active')
  const current = [...active].sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]
  const pending = [...active].filter((m) => m.dueCents > 0).sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]

  const [mode, setMode] = useState<Mode>(pending ? 'balance' : 'plan')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  // modo "nueva membresía"
  const [planId, setPlanId] = useState(plans.find((p) => p.durationDays === 30)?.id ?? '')
  const [startDate, setStartDate] = useState(renewalStart(current?.endDate ?? null, today))
  const [discount, setDiscount] = useState('')
  const [paid, setPaid] = useState('')
  const [paidTouched, setPaidTouched] = useState(false)
  // modo "pagar saldo"
  const [balancePaid, setBalancePaid] = useState(pending ? formatMoneyInput(pending.dueCents) : '')

  const [errors, setErrors] = useState<PlanChargeErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false) // evita doble envío aunque el clic llegue dos veces antes del re-render

  const plan = plans.find((p) => p.id === planId)
  const totals = chargeTotals(plan, discount)
  // Mientras el usuario no edite el monto, se sugiere cobrar el total.
  const paidText = paidTouched ? paid : plan ? formatMoneyInput(totals.totalCents) : ''
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
  const endDate = plan && validStart ? membershipEnd(startDate, plan.durationDays) : undefined

  const touch = (k: keyof PlanChargeErrors) => setErrors((e) => ({ ...e, [k]: undefined }))

  async function finish(kind: ReceiptData['kind'], payment: ReceiptData['payment']) {
    const [list, gym] = await Promise.all([api.memberships.listForMember(member.id), api.gym.get()])
    const fresh = list.find((m) => m.id === payment.membershipId)
    if (!fresh) throw new Error('El cobro se registró pero no se pudo cargar el recibo. Revisa la ficha del socio.')
    onDone({ payment, member, membership: fresh, kind, gym })
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (submitting.current) return
    setFormError(undefined)

    if (mode === 'balance' && pending) {
      const v = validateBalancePayment(balancePaid, pending.dueCents)
      if (!v.ok) return setErrors({ paid: v.error })
      submitting.current = true
      setBusy(true)
      try {
        const payment = await api.payments.register({ membershipId: pending.id, amountCents: v.paidCents, method })
        await finish('balance', payment)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'No se pudo registrar el cobro')
        submitting.current = false
        setBusy(false)
      }
      return
    }

    const v = validatePlanCharge({ planId, startDate, discount, paid: paidText }, plan)
    if (!v.ok) return setErrors(v.errors)
    submitting.current = true
    setBusy(true)
    try {
      const payment = await api.payments.sell({
        memberId: member.id,
        planId: v.value.planId,
        startDate: v.value.startDate,
        discountCents: v.value.discountCents,
        paidCents: v.value.paidCents,
        method,
      })
      await finish('sale', payment)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar el cobro')
      submitting.current = false
      setBusy(false)
    }
  }

  const amountCents = parseMoney(mode === 'balance' && pending ? balancePaid : paidText)
  const confirmLabel = amountCents !== null && amountCents > 0 ? `Cobrar ${formatMoney(amountCents)}` : 'Cobrar'

  return (
    <form onSubmit={submit} noValidate class="space-y-5">
      <Card variant="filled" class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-title-lg">{member.fullName}</p>
          <p class="text-body-sm text-on-surface-variant">CI {member.ci} · {member.phone}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            {current ? (
              <>
                <MembershipStateBadge state={membershipState(current.endDate, today)} />
                <span class="text-body-sm text-on-surface-variant">hasta {formatDate(current.endDate)}</span>
              </>
            ) : (
              <span class="text-body-sm text-on-surface-variant">Sin membresía</span>
            )}
          </div>
        </div>
        <Button variant="text" onClick={onChangeMember} disabled={busy}>
          Cambiar socio
        </Button>
      </Card>

      {pending && (
        <Segmented<Mode>
          label="Tipo de cobro"
          value={mode}
          onChange={(m) => {
            setMode(m)
            setErrors({})
            setFormError(undefined)
          }}
          options={[
            { value: 'balance', label: `Pagar saldo (${formatMoney(pending.dueCents)})` },
            { value: 'plan', label: 'Nueva membresía' },
          ]}
        />
      )}

      {mode === 'balance' && pending ? (
        <section class="space-y-4" aria-label="Pago de saldo">
          <Card variant="outlined">
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body-md">
              <dt class="text-on-surface-variant">Membresía</dt>
              <dd class="text-right">{pending.planName} · {formatDate(pending.startDate)} – {formatDate(pending.endDate)}</dd>
              <dt class="text-on-surface-variant">Total</dt>
              <dd class="text-right"><MoneyDisplay cents={pending.priceCents - pending.discountCents} /></dd>
              <dt class="text-on-surface-variant">Pagado</dt>
              <dd class="text-right"><MoneyDisplay cents={pending.paidCents} /></dd>
              <dt class="text-title-sm">Saldo pendiente</dt>
              <dd class="text-right text-title-sm"><MoneyDisplay cents={pending.dueCents} /></dd>
            </dl>
          </Card>
          <TextField
            label="Monto a cobrar"
            prefixText="Bs"
            inputMode="decimal"
            value={balancePaid}
            onValueChange={(v) => {
              setBalancePaid(v)
              touch('paid')
            }}
            error={errors.paid}
          />
        </section>
      ) : (
        <section class="space-y-4" aria-label="Nueva membresía">
          <Select
            label="Plan"
            value={planId}
            onValueChange={(v) => {
              setPlanId(v)
              touch('planId')
              touch('paid')
            }}
            placeholder="Selecciona un plan…"
            options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${p.durationDays} d · ${formatMoney(p.priceCents)}` }))}
            error={errors.planId}
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Inicio"
              type="date"
              value={startDate}
              onValueChange={(v) => {
                setStartDate(v)
                touch('startDate')
              }}
              error={errors.startDate}
              helper={current ? 'Por defecto: al terminar la membresía actual' : undefined}
            />
            <TextField
              label="Descuento (opcional)"
              prefixText="Bs"
              inputMode="decimal"
              value={discount}
              onValueChange={(v) => {
                setDiscount(v)
                touch('discount')
                touch('paid')
              }}
              error={errors.discount}
            />
          </div>

          {plan && (
            <Card variant="outlined">
              <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body-md">
                <dt class="text-on-surface-variant">Vigencia</dt>
                <dd class="text-right">{endDate ? `${formatDate(startDate)} – ${formatDate(endDate)}` : '—'}</dd>
                <dt class="text-on-surface-variant">Precio</dt>
                <dd class="text-right"><MoneyDisplay cents={totals.priceCents} /></dd>
                {totals.discountCents > 0 && (
                  <>
                    <dt class="text-on-surface-variant">Descuento</dt>
                    <dd class="text-right">− <MoneyDisplay cents={totals.discountCents} /></dd>
                  </>
                )}
                <dt class="text-title-sm">Total</dt>
                <dd class="text-right text-title-sm"><MoneyDisplay cents={totals.totalCents} /></dd>
              </dl>
            </Card>
          )}

          <TextField
            label="Monto a cobrar ahora"
            prefixText="Bs"
            inputMode="decimal"
            value={paidText}
            onValueChange={(v) => {
              setPaid(v)
              setPaidTouched(true)
              touch('paid')
            }}
            error={errors.paid}
            helper={!errors.paid && plan ? 'Puede ser menos que el total (pago parcial)' : undefined}
          />
        </section>
      )}

      <div class="space-y-2">
        <p class="text-label-lg text-on-surface-variant" aria-hidden="true">Método de pago</p>
        <Segmented<PaymentMethod> label="Método de pago" value={method} onChange={setMethod} options={PAYMENT_METHOD_OPTIONS} />
      </div>

      {formError && (
        <p role="alert" class="text-body-md text-error">
          {formError}
        </p>
      )}

      <Button type="submit" fullWidth loading={busy} class="h-14 text-title-md sm:h-12">
        {confirmLabel}
      </Button>
    </form>
  )
}
