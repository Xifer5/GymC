import { useState } from 'preact/hooks'
import { Link } from 'wouter'
import { SearchBar } from '@/components/shared/SearchBar'
import { Card } from '@/components/ui/Card'
import { MembershipStateBadge } from '@/features/memberships/MembershipStateBadge'
import { api } from '@/lib/data'
import type { MemberListItem } from '@/lib/data'
import { useAsyncData } from '@/lib/useAsyncData'

/** Busca y elige un socio (para cobrar). Sin texto muestra los más recientes. */
export function MemberPicker({ onSelect }: { onSelect: (member: MemberListItem) => void }) {
  const [query, setQuery] = useState('')
  const res = useAsyncData(() => api.members.list({ search: query, pageSize: 6 }), [query])
  const items = res.data?.items ?? []

  return (
    <div class="space-y-3">
      <SearchBar
        autoFocus
        onSearch={setQuery}
        label="Buscar socio"
        placeholder="Buscar socio por nombre, CI o teléfono"
      />
      <Card variant="outlined" padded={false} aria-busy={res.loading || undefined}>
        {res.error ? (
          <p role="alert" class="p-4 text-body-md text-error">{res.error}</p>
        ) : items.length === 0 ? (
          <p class="p-4 text-body-md text-on-surface-variant">
            {res.loading ? 'Buscando…' : 'No se encontró ningún socio. '}
            {!res.loading && (
              <Link href="/socios" className="text-primary underline">
                Registrar nuevo socio
              </Link>
            )}
          </p>
        ) : (
          <ul class="divide-y divide-outline-variant">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m)}
                  class="state-layer flex min-h-16 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-title-md text-on-surface">{m.fullName}</span>
                    <span class="block text-body-sm text-on-surface-variant">
                      CI {m.ci} · {m.phone}
                    </span>
                  </span>
                  {m.current ? (
                    <MembershipStateBadge state={m.current.state} />
                  ) : (
                    <span class="shrink-0 text-body-sm text-on-surface-variant">Sin membresía</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
