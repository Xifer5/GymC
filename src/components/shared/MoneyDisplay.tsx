import { formatMoney } from '@/lib/money'
import type { Cents } from '@/lib/money'
import { cx } from '@/lib/cx'

/** Único lugar donde se muestran importes. Negativos en rojo y con signo (no solo color). */
export function MoneyDisplay({ cents, class: cls }: { cents: Cents; class?: string }) {
  return <span class={cx('tabular-nums', cents < 0 && 'text-error', cls)}>{formatMoney(cents)}</span>
}
