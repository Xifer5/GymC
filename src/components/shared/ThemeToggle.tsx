import { useState } from 'preact/hooks'
import { Monitor, Moon, Sun } from 'lucide-preact'
import { IconButton } from '@/components/ui/IconButton'
import { getTheme, setTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'

const ORDER: Theme[] = ['system', 'light', 'dark']
const LABEL: Record<Theme, string> = { system: 'sistema', light: 'claro', dark: 'oscuro' }

/** Alterna sistema → claro → oscuro. */
export function ThemeToggle() {
  const [theme, set] = useState<Theme>(getTheme())
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  return (
    <IconButton
      label={`Tema: ${LABEL[theme]}. Cambiar a ${LABEL[next]}`}
      onClick={() => {
        setTheme(next)
        set(next)
      }}
    >
      <Icon size={22} aria-hidden="true" />
    </IconButton>
  )
}
