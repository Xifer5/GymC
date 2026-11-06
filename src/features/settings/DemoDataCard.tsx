import { useRef, useState } from 'preact/hooks'
import { Download, FlaskConical } from 'lucide-preact'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/Snackbar'
import { AppError, demo } from '@/lib/data'
import { downloadBackup } from './backupActions'

type Action = 'load' | 'replace' | 'clear'

const DONE: Record<Action, string> = {
  load: 'Datos de ejemplo cargados',
  replace: 'Datos reemplazados por el ejemplo',
  clear: 'Datos borrados. Empiezas de cero.',
}

/**
 * Datos de demostración (solo con el adaptador mock). Sin datos: cargar el ejemplo.
 * Con datos: reemplazarlos por el ejemplo o borrarlos todos, siempre con confirmación y con la opción de descargar una copia antes.
 * Es una herramienta de pruebas: con un servidor real no existe (los registros financieros no se borran, se anulan con motivo).
 */
export function DemoDataCard({ hasData, onChanged }: { hasData: boolean; onChanged: () => void }) {
  const snack = useSnackbar()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'replace' | 'clear' | null>(null)
  const running = useRef(false)

  if (!demo.available) return null

  async function run(action: Action) {
    if (running.current) return
    running.current = true
    setBusy(true)
    try {
      if (action === 'clear') await demo.clear()
      else await demo.load({ replace: action === 'replace' })
      snack.show(DONE[action])
      onChanged()
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo completar la acción')
    } finally {
      running.current = false
      setBusy(false)
      setConfirm(null)
    }
  }

  async function backupFirst() {
    try {
      snack.show(`Descargado: ${await downloadBackup('xlsx')}`)
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo preparar la descarga')
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
              ? 'Esta versión de pruebas guarda los datos solo en este dispositivo. Puedes reemplazarlos por un gimnasio de ejemplo o borrarlos para empezar de cero.'
              : 'Aún no hay datos. Carga un gimnasio de ejemplo para probar la app: socios vigentes, por vencer y vencidos, cobros, egresos y reportes.'}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            {hasData ? (
              <>
                <Button variant="tonal" onClick={() => setConfirm('replace')} disabled={busy}>
                  Reemplazar con datos de ejemplo
                </Button>
                <Button variant="outlined" onClick={() => setConfirm('clear')} disabled={busy}>
                  Borrar todos los datos
                </Button>
              </>
            ) : (
              <Button variant="tonal" onClick={() => void run('load')} loading={busy}>
                Cargar datos de ejemplo
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'replace' ? 'Reemplazar con datos de ejemplo' : 'Borrar todos los datos'}
        destructive
        confirmLabel={confirm === 'replace' ? 'Reemplazar' : 'Borrar todo'}
        loading={busy}
        onCancel={() => !busy && setConfirm(null)}
        onConfirm={() => confirm && void run(confirm)}
      >
        <p class="text-body-md">
          {confirm === 'replace'
            ? 'Se borrarán los socios, pagos e ingresos/egresos actuales de este dispositivo y se cargará el gimnasio de ejemplo. '
            : 'Se borrarán los socios, membresías, pagos e ingresos/egresos de este dispositivo. '}
          No se puede deshacer. Los planes, categorías y usuarios se conservan.
        </p>
        <div class="mt-3">
          <Button variant="text" icon={<Download size={18} aria-hidden="true" />} onClick={() => void backupFirst()} disabled={busy}>
            Descargar una copia antes (Excel)
          </Button>
        </div>
      </ConfirmDialog>
    </Card>
  )
}
