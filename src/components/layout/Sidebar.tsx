import { Link, useLocation } from 'wouter'
import { Dumbbell, LogOut } from 'lucide-preact'
import { COBRAR, canSee, isActive, visibleNav } from '@/app/nav'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/AuthProvider'
import { cx } from '@/lib/cx'

/**
 * Navegación para pantallas ≥ 600 px.
 * 600–1023: rail (80 px, icono sobre etiqueta). ≥1024: drawer (256 px, icono + etiqueta).
 */
export function Sidebar() {
  const { user, can, signOut } = useAuth()
  const [location] = useLocation()
  const items = visibleNav(can)
  const cobrar = canSee(COBRAR, can)

  return (
    <aside class="fixed inset-y-0 left-0 z-30 hidden print:!hidden w-20 flex-col gap-2 bg-surface-low px-2 py-4 sm:flex lg:w-64 lg:px-3">
      <div class="mb-2 flex items-center justify-center gap-3 lg:justify-start lg:px-3">
        <span class="flex size-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Dumbbell size={22} aria-hidden="true" />
        </span>
        <span class="hidden text-title-lg lg:block">Gym Manager</span>
      </div>

      {cobrar && (
        <Link
          href={COBRAR.path}
          className="state-layer mb-2 flex h-14 items-center justify-center gap-3 rounded-lg bg-primary-container text-label-lg text-on-primary-container shadow-1 lg:px-4"
          aria-label="Cobrar"
        >
          <COBRAR.icon size={24} aria-hidden="true" />
          <span class="hidden lg:inline">Cobrar</span>
        </Link>
      )}

      <nav aria-label="Principal" class="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item.path, location)
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'state-layer group flex flex-col items-center gap-1 rounded-full py-1 text-label-sm lg:h-14 lg:flex-row lg:gap-3 lg:px-4 lg:text-label-lg',
                active ? 'text-on-secondary-container lg:bg-secondary-container' : 'text-on-surface-variant',
              )}
            >
              <span
                class={cx(
                  'flex h-8 w-14 items-center justify-center rounded-full lg:h-auto lg:w-auto',
                  active && 'bg-secondary-container lg:bg-transparent',
                )}
              >
                <item.icon size={24} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div class="flex flex-col items-center gap-1 border-t border-outline-variant pt-3 lg:items-stretch">
        <p class="hidden truncate px-3 text-body-sm text-on-surface-variant lg:block">
          {user?.fullName} · {user?.role === 'admin' ? 'Administrador' : 'Recepción'}
        </p>
        <div class="flex flex-col items-center lg:flex-row lg:justify-between">
          <ThemeToggle />
          <IconButton label="Cerrar sesión" onClick={() => void signOut()}>
            <LogOut size={22} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </aside>
  )
}
