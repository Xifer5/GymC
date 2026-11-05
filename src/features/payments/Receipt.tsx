import { Link } from 'wouter'
import { CircleCheck, Plus, Printer, User } from 'lucide-preact'
import { MoneyDisplay } from '@/components/shared/MoneyDisplay'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { GymInfo, Member, Membership, Payment } from '@/lib/data'
import { formatDate, formatTime, timestampToISODate } from '@/lib/dates'
import { PAYMENT_METHOD_LABEL } from '@/lib/labels'

export interface ReceiptData {
  payment: Payment
  member: Member
  /** Estado de la membresía DESPUÉS de este pago (saldo actualizado). */
  membership: Membership
  kind: 'sale' | 'balance'
  gym: GymInfo
}

const pad = (n: number) => String(n).padStart(6, '0')

/** Comprobante de pago. Se imprime tal cual (el resto de la app se oculta con `print:hidden`). */
export function Receipt({ data, onNew }: { data: ReceiptData; onNew: () => void }) {
  const { payment, member, membership, kind, gym } = data
  const date = timestampToISODate(payment.paidAt)
  const concept =
    kind === 'sale' ? `Membresía ${membership.planName}` : `Pago de saldo · Membresía ${membership.planName}`

  return (
    <div class="mx-auto max-w-md">
      <div role="status" class="mb-4 flex items-center gap-2 text-title-md text-success print:hidden">
        <CircleCheck size={24} aria-hidden="true" />
        Cobro registrado
      </div>

      <Card variant="outlined" padded={false} class="print:border-0">
        <article aria-label={`Recibo ${payment.receiptNo}`} class="p-6">
          <header class="mb-4 flex items-start justify-between gap-4 border-b border-dashed border-outline pb-4">
            <div>
              <p class="text-title-lg">{gym.name}</p>
              {(gym.address || gym.phone) && (
                <p class="text-body-sm text-on-surface-variant">{[gym.address, gym.phone && `Tel. ${gym.phone}`].filter(Boolean).join(' · ')}</p>
              )}
              <p class="text-body-sm text-on-surface-variant">Comprobante de pago</p>
            </div>
            <div class="text-right">
              <p class="text-title-md tabular-nums">Recibo N.º {pad(payment.receiptNo)}</p>
              <p class="text-body-sm text-on-surface-variant">
                {formatDate(date)} · {formatTime(payment.paidAt)}
              </p>
            </div>
          </header>

          <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-md">
            <dt class="text-on-surface-variant">Socio</dt>
            <dd class="text-right font-medium">{member.fullName}</dd>
            <dt class="text-on-surface-variant">CI</dt>
            <dd class="text-right">{member.ci}</dd>
            <dt class="text-on-surface-variant">Concepto</dt>
            <dd class="text-right">{concept}</dd>
            <dt class="text-on-surface-variant">Vigencia</dt>
            <dd class="text-right">
              {formatDate(membership.startDate)} – {formatDate(membership.endDate)}
            </dd>
            <dt class="text-on-surface-variant">Método</dt>
            <dd class="text-right">{PAYMENT_METHOD_LABEL[payment.method]}</dd>
          </dl>

          <div class="my-4 flex items-baseline justify-between border-y border-dashed border-outline py-3">
            <span class="text-title-md">Monto cobrado</span>
            <MoneyDisplay cents={payment.amountCents} class="text-headline-sm" />
          </div>

          <p class="text-body-md">
            {membership.dueCents > 0 ? (
              <>
                Saldo pendiente: <MoneyDisplay cents={membership.dueCents} class="font-medium" />
              </>
            ) : (
              <span class="text-success">Membresía pagada en su totalidad</span>
            )}
          </p>
        </article>
      </Card>

      <div class="mt-4 flex flex-wrap gap-2 print:hidden">
        <Button icon={<Printer size={20} aria-hidden="true" />} onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button variant="tonal" icon={<Plus size={20} aria-hidden="true" />} onClick={onNew}>
          Nuevo cobro
        </Button>
        <Link
          href={`/socios/${member.id}`}
          className="state-layer inline-flex h-12 items-center justify-center gap-2 rounded-xl px-3 text-label-lg text-primary sm:h-10"
        >
          <User size={18} aria-hidden="true" />
          Ver socio
        </Link>
      </div>
    </div>
  )
}
