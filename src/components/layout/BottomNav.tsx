import { useState } from 'preact/hooks'
import { Link, useLocation } from 'wouter'
import { Ellipsis } from 'lucide-preact'
import { COBRAR, canSee, isActive, visibleNav } from '@/app/nav'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { cx } from '@/lib/cx'

const ITEM = 'state-layer flex flex-1 flex-col items-center gap-1 py-2 text-label-md min-w-0'

/** Navegación móvil (<600 px): barra inferior + FAB "Cobrar". Lo secundario va en "Más". */
export function BottomNav() {
  const { can, signOut } = useAuth()
  const [location] = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const items = visibleNav(can)
  const primary = items.filter((i) => i.slot === 'primary')
  const more = items.filter((i) => i.slot === 'more')
  const showFab = canSee(COBRAR, can) && !isActive(COBRAR.path, location)

  return (
    <>
      {showFab && (
        <Link
          href={COBRAR.path}
          className="state-layer fixed bottom-20 right-4 z-30 flex h-14 items-center gap-3 rounded-lg bg-primary-container px-5 text-label-lg text-on-primary-container shadow-3 sm:hidden print:hidden"
        >
          <COBRAR.icon size={24} aria-hidden="true" />
          Cobrar
        </Link>
      )}

      <nav
        aria-label="Principal"
        class="fixed inset-x-0 bottom-0 z-30 flex h-16 bg-surface-container pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden"
      >
        {primary.map((item) => {
          const active = isActive(item.path, location)
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={cx(ITEM, active ? 'text-on-surface' : 'text-on-surface-variant')}
            >
              <span class={cx('flex h-8 w-16 items-center justify-center rounded-full', active && 'bg-secondary-container text-on-secondary-container')}>
                <item.icon size={24} aria-hidden="true" />
              </span>
              <span class="truncate">{item.label}</span>
            </Link>
          )
        })}
        <button type="button" onClick={() => setMoreOpen(true)} class={cx(ITEM, 'text-on-surface-variant')}>
          <span class="flex h-8 w-16 items-center justify-center rounded-full">
            <Ellipsis size={24} aria-hidden="true" />
          </span>
          <span>Más</span>
        </button>
      </nav>

      <Dialog
        open={moreOpen}
        title="Más opciones"
        onClose={() => setMoreOpen(false)}
        actions={<Button variant="text" onClick={() => setMoreOpen(false)}>Cerrar</Button>}
      >
        <ul class="-mx-2 flex flex-col">
          {more.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                onClick={() => setMoreOpen(false)}
                className="state-layer flex h-12 items-center gap-4 rounded-full px-4 text-label-lg text-on-surface"
              >
                <item.icon size={22} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => void signOut()}
              class="state-layer flex h-12 w-full items-center gap-4 rounded-full px-4 text-label-lg text-error"
            >
              Cerrar sesión
            </button>
          </li>
        </ul>
      </Dialog>
    </>
  )
}
