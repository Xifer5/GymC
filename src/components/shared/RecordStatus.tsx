import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTime, timestampToISODate } from '@/lib/dates'

interface Props {
  status: 'confirmed' | 'voided'
  voidReason?: string
  voidedByName?: string
  voidedAt?: string
  createdByName?: string
}

/** Estado de un pago o movimiento con su trazabilidad: quién lo registró o, si está anulado, motivo, quién y cuándo. */
export function RecordStatus({ status, voidReason, voidedByName, voidedAt, createdByName }: Props) {
  if (status === 'confirmed') {
    return (
      <span class="inline-flex flex-col items-start gap-1">
        <Badge tone="success">Confirmado</Badge>
        {createdByName && <span class="text-body-sm text-on-surface-variant">Registró {createdByName}</span>}
      </span>
    )
  }
  const when = voidedAt ? `${formatDate(timestampToISODate(voidedAt))} ${formatTime(voidedAt)}` : ''
  const who = [voidedByName && `por ${voidedByName}`, when].filter(Boolean).join(' · ')
  return (
    <span class="inline-flex flex-col items-start gap-1">
      <Badge tone="error">Anulado</Badge>
      {voidReason && <span class="text-body-sm text-on-surface-variant">{voidReason}</span>}
      {who && <span class="text-body-sm text-on-surface-variant">{who}</span>}
    </span>
  )
}
