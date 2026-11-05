import { WifiOff } from 'lucide-preact'
import { useOnline } from '@/lib/pwa'

/** Aviso fijo cuando no hay conexión: cobrar y anular requieren red (no hay escritura offline en v1). */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      class="sticky top-0 z-40 flex items-center justify-center gap-2 bg-error-container px-4 py-2 text-center text-label-lg text-on-error-container print:hidden"
    >
      <WifiOff size={18} aria-hidden="true" />
      Sin conexión. Puedes consultar, pero no cobrar ni registrar hasta que vuelva.
    </div>
  )
}
