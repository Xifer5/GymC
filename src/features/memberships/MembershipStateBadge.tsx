import { Badge } from '@/components/ui/Badge'
import type { MembershipState } from '@/lib/dates'

const MAP: Record<MembershipState, { tone: 'success' | 'warning' | 'error'; label: string }> = {
  active: { tone: 'success', label: 'Vigente' },
  expiring: { tone: 'warning', label: 'Por vencer' },
  expired: { tone: 'error', label: 'Vencida' },
}

/** Estado de una membresía. Único lugar con estos textos y colores. */
export function MembershipStateBadge({ state }: { state: MembershipState }) {
  const { tone, label } = MAP[state]
  return <Badge tone={tone}>{label}</Badge>
}
