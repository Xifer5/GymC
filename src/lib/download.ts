/** Descarga un texto como archivo desde el navegador. */
export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  downloadBlob(filename, new Blob([content], { type: mime }))
}

/** Descarga cualquier archivo (por ejemplo, un .xlsx) desde el navegador. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
