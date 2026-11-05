import { useEffect, useRef, useState } from 'preact/hooks'
import { Search, X } from 'lucide-preact'
import { IconButton } from '@/components/ui/IconButton'

export interface SearchBarProps {
  /** Se llama con el texto ya "debounceado". */
  onSearch: (query: string) => void
  placeholder?: string
  /** Nombre accesible del campo. */
  label?: string
  delay?: number
  autoFocus?: boolean
}

/** Barra de búsqueda M3. Espera `delay` ms tras la última tecla antes de buscar. */
export function SearchBar({ onSearch, placeholder = 'Buscar', label = 'Buscar', delay = 300, autoFocus }: SearchBarProps) {
  const [text, setText] = useState('')
  const lastSent = useRef('')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useEffect(() => {
    const q = text.trim()
    if (q === lastSent.current) return
    const t = setTimeout(() => {
      lastSent.current = q
      onSearchRef.current(q)
    }, delay)
    return () => clearTimeout(t)
  }, [text, delay])

  function clear() {
    setText('')
    lastSent.current = ''
    onSearch('')
  }

  return (
    <div
      role="search"
      class="flex h-14 w-full items-center gap-2 rounded-full bg-surface-highest pl-4 pr-1 focus-within:shadow-[0_0_0_2px_var(--md-primary)]"
    >
      <Search size={22} aria-hidden="true" class="shrink-0 text-on-surface-variant" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        autocomplete="off"
        autofocus={autoFocus}
        class="h-full min-w-0 flex-1 bg-transparent text-body-lg text-on-surface outline-none placeholder:text-on-surface-variant [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <IconButton label="Limpiar búsqueda" onClick={clear}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      )}
    </div>
  )
}
