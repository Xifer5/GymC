import type { ComponentChildren } from 'preact'
import { Link } from 'wouter'
import type { LucideIcon } from 'lucide-preact'
import { cx } from '@/lib/cx'

export type StatTone = 'neutral' | 'success' | 'warning' | 'error'

const TONE: Record<StatTone, string> = {
  neutral: 'bg-surface-highest text-on-surface',
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
}

export interface StatCardProps {
  label: string
  value: ComponentChildren
  icon?: LucideIcon
  tone?: StatTone
  /** Si se indica, toda la tarjeta es un enlace. */
  href?: string
  hint?: string
}

/** Cifra clave con etiqueta (dashboard). El estado nunca depende solo del color: lleva etiqueta e icono. */
export function StatCard({ label, value, icon: Icon, tone = 'neutral', href, hint }: StatCardProps) {
  const body = (
    <>
      <div class="flex items-center justify-between gap-2">
        <span class="text-label-lg">{label}</span>
        {Icon && <Icon size={20} aria-hidden="true" />}
      </div>
      <p class="mt-2 text-headline-md tabular-nums">{value}</p>
      {hint && <p class="mt-1 text-body-sm opacity-80">{hint}</p>}
    </>
  )
  const cls = cx('block rounded-md p-4', TONE[tone], href && 'state-layer')
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div class={cls}>{body}</div>
  )
}
