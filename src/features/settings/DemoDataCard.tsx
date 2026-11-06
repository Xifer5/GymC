import { useRef, useState } from 'preact/hooks'
import { FlaskConical } from 'lucide-preact'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/Snackbar'
import { AppError, demo } from '@/lib/data'

/**
 * Carga o borra los datos de demostración (solo con el adaptador mock). Sin datos ofrece cargar el ejemplo;
 * con datos ofrece borrarlos todos para empezar de cero.
 */
export function DemoDataCard({ hasData, onChanged }: { hasData: boolean; onChanged: () => void }) {
  const snack = useSnackbar()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const running = useRef(false)

  if (!demo.available) return null

  async function run(action: 'load' | 'clear') {
    if (running.current) return
    running.current = true
    setBusy(true)
    try {
      await demo[action]()
      snack.show(action === 'load' ? 'Datos de ejemplo cargados' : 'Datos borrados. Empiezas de cero.')
      onChanged()
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo completar la acción')
    } finally {
      running.current = false
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <Card variant="outlined" class="max-w-xl">
      <div class="flex items-start gap-3">
        <FlaskConical size={24} class="mt-0.5 shrink-0 text-on-surface-variant" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <h3 class="text-title-md">Datos de demostración</h3>
          <p class="mt-1 text-body-md text-on-surface-variant">
            {hasData
              ? 'Esta versión guarda los datos solo en este dispositivo. Puedes borrar todos los socios, pagos y movimientos para empezar de cero.'
              : 'Aún no hay datos. Carga un gimnasio de ejemplo para probar la app: socios vigentes, por vencer y vencidos, cobros, egresos y reportes.'}
          </p>
          <div class="mt-4">
            {hasData ? (
              <Button variant="outlined" onClick={() => setConfirmOpen(true)} disabled={busy}>
                Borrar todos los datos
              </Button>
            ) : (
              <Button variant="tonal" onClick={() => void run('load')} loading={busy}>
                Cargar datos de ejemplo
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Borrar todos los datos"
        destructive
        confirmLabel="Borrar todo"
        loading={busy}
        onCancel={() => !busy && setConfirmOpen(false)}
        onConfirm={() => void run('clear')}
      >
        <p class="text-body-md">
          Se borrarán los socios, membresías, pagos e ingresos/egresos de este dispositivo. No se puede deshacer. Los planes, categorías y usuarios se
          conservan.
        </p>
      </ConfirmDialog>
    </Card>
  )
}
