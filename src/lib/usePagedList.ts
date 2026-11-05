import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Page } from '@/lib/data/types'

export interface PagedQuery {
  page: number
  pageSize: number
  search: string
}

interface State<T> {
  items: T[]
  total: number
  loading: boolean
  error?: string
}

/**
 * Lista paginada con búsqueda para cualquier endpoint `(q) => Page<T>`.
 * - Ignora respuestas viejas (si el usuario sigue escribiendo/paginando).
 * - Al cambiar la búsqueda vuelve a la página 1.
 * - `deps`: valores extra (filtros) que disparan recarga y vuelven a la página 1.
 */
export function usePagedList<T>(
  fetcher: (q: PagedQuery) => Promise<Page<T>>,
  opts: { pageSize?: number; deps?: readonly unknown[] } = {},
) {
  const pageSize = opts.pageSize ?? 25
  const [page, setPage] = useState(1)
  const [search, setSearchRaw] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [state, setState] = useState<State<T>>({ items: [], total: 0, loading: true })
  const latest = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const depsKey = JSON.stringify(opts.deps ?? [])
  const firstDeps = useRef(depsKey)
  useEffect(() => {
    if (firstDeps.current !== depsKey) {
      firstDeps.current = depsKey
      setPage(1)
    }
  }, [depsKey])

  useEffect(() => {
    const id = ++latest.current
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fetcherRef
      .current({ page, pageSize, search })
      .then((r) => {
        if (id !== latest.current) return
        const last = Math.max(1, Math.ceil(r.total / pageSize))
        if (r.items.length === 0 && page > last) return setPage(last) // la página quedó vacía (p. ej. se archivó el último)
        setState({ items: r.items, total: r.total, loading: false })
      })
      .catch((e: unknown) => {
        if (id !== latest.current) return
        // Se vacían las filas: mostrar datos de otro filtro/página junto al error confundiría.
        setState({ items: [], total: 0, loading: false, error: e instanceof Error ? e.message : 'Error inesperado' })
      })
  }, [page, pageSize, search, reloadTick, depsKey])

  const setSearch = useCallback((s: string) => {
    setSearchRaw(s)
    setPage(1)
  }, [])
  const reload = useCallback(() => setReloadTick((t) => t + 1), [])

  return { ...state, page, pageSize, search, setPage, setSearch, reload }
}
