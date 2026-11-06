import { useRef, useState } from 'preact/hooks'
import { Braces, Download, FileSpreadsheet } from 'lucide-preact'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSnackbar } from '@/components/ui/Snackbar'
import { AppError } from '@/lib/data'
import { downloadBackup } from './backupActions'
import type { BackupKind } from './backupActions'

const TABLES: { kind: BackupKind; label: string }[] = [
  { kind: 'socios', label: 'Socios' },
  { kind: 'membresias', label: 'Membresías' },
  { kind: 'pagos', label: 'Pagos' },
  { kind: 'movimientos', label: 'Ingresos y egresos' },
]

/** Descarga de todos los datos: Excel, CSV por tabla y copia completa en JSON. */
export function ExportSettings() {
  const snack = useSnackbar()
  const [busy, setBusy] = useState<BackupKind | null>(null)
  const running = useRef(false)

  async function run(kind: BackupKind) {
    if (running.current) return
    running.current = true
    setBusy(kind)
    try {
      const name = await downloadBackup(kind)
      snack.show(`Descargado: ${name}`)
    } catch (err) {
      snack.show(err instanceof AppError ? err.message : 'No se pudo preparar la descarga')
    } finally {
      running.current = false
      setBusy(null)
    }
  }

  return (
    <div class="max-w-2xl space-y-4">
      <p class="text-body-md text-on-surface-variant">
        Descarga tus datos cuando quieras: como respaldo propio, para llevarlos a otra herramienta o para revisarlos con tu contador. Los pagos y
        movimientos <strong class="font-medium text-on-surface">anulados se incluyen con su motivo</strong>, y los egresos aparecen en negativo.
      </p>

      <Card variant="outlined">
        <div class="flex items-start gap-3">
          <FileSpreadsheet size={24} class="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <h3 class="text-title-md">Excel (.xlsx)</h3>
            <p class="mt-1 text-body-md text-on-surface-variant">
              Un solo archivo con una hoja por tabla: Resumen, Socios, Membresías, Pagos y Movimientos. Es lo más cómodo para ordenar y filtrar.
            </p>
            <div class="mt-4">
              <Button icon={<Download size={20} aria-hidden="true" />} onClick={() => void run('xlsx')} loading={busy === 'xlsx'} disabled={busy !== null}>
                Descargar Excel
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div class="flex items-start gap-3">
          <Braces size={24} class="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <h3 class="text-title-md">Texto: CSV y copia completa</h3>
            <p class="mt-1 text-body-md text-on-surface-variant">
              CSV por tabla (se abre en Excel, separado por «;») o la copia completa en JSON, un texto que cualquier sistema puede leer.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              {TABLES.map((t) => (
                <Button key={t.kind} variant="outlined" onClick={() => void run(t.kind)} loading={busy === t.kind} disabled={busy !== null}>
                  CSV · {t.label}
                </Button>
              ))}
              <Button variant="tonal" onClick={() => void run('json')} loading={busy === 'json'} disabled={busy !== null}>
                Copia completa (JSON)
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
