import { api } from '@/lib/data'
import { downloadBlob, downloadText } from '@/lib/download'
import { backupCsv, backupFileName, backupJson, backupXlsx } from '@/lib/exports'
import type { ExportTable } from '@/lib/exports'
import { XLSX_MIME } from '@/lib/xlsx'

export type BackupKind = 'xlsx' | 'json' | ExportTable

/** Pide una copia fresca de los datos y la descarga en el formato elegido. Devuelve el nombre del archivo. */
export async function downloadBackup(kind: BackupKind): Promise<string> {
  const b = await api.backup.get()
  if (kind === 'xlsx') {
    const name = backupFileName(b, 'datos', 'xlsx')
    downloadBlob(name, new Blob([backupXlsx(b) as BlobPart], { type: XLSX_MIME }))
    return name
  }
  if (kind === 'json') {
    const name = backupFileName(b, 'datos', 'json')
    downloadText(name, backupJson(b), 'application/json;charset=utf-8')
    return name
  }
  const name = backupFileName(b, kind, 'csv')
  downloadText(name, backupCsv(b, kind))
  return name
}
