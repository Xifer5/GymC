import type { ComponentChildren } from 'preact'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'
import { Sidebar } from './Sidebar'

/** Estructura común: sidebar (≥600) o barra superior + barra inferior (<600). */
export function AppShell({ children }: { children: ComponentChildren }) {
  return (
    <div class="min-h-dvh sm:pl-20 lg:pl-64 print:pl-0">
      <a
        href="#contenido"
        class="sr-only z-50 rounded-full bg-primary px-4 py-3 text-label-lg text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus:h-12 focus:items-center"
      >
        Saltar al contenido
      </a>
      <OfflineBanner />
      <Sidebar />

      <header class="sticky top-0 z-20 flex h-14 items-center justify-between bg-surface px-4 sm:hidden print:hidden">
        <span class="text-title-lg">Gym Manager</span>
        <ThemeToggle />
      </header>

      <main id="contenido" tabindex={-1} class="mx-auto outline-none max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8 print:p-0">{children}</main>

      <BottomNav />
    </div>
  )
}
