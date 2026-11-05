export type Theme = 'light' | 'dark' | 'system'

const KEY = 'gm-theme'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* almacenamiento no disponible */
  }
  return 'system'
}

export function setTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    /* ignorar */
  }
}

export function initTheme() {
  setTheme(getTheme())
}
