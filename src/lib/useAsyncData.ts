import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

/**
 * Carga única (sin paginación) con estados loading/error y recarga manual.
 * Ignora respuestas viejas si `deps` cambia mientras hay una petición en curso.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: true })
  const [tick, setTick] = useState(0)
  const latest = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    const id = ++latest.current
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fetcherRef
      .current()
      .then((data) => id === latest.current && setState({ data, loading: false }))
      .catch((e: unknown) => {
        if (id === latest.current) {
          setState({ loading: false, error: e instanceof Error ? e.message : 'Error inesperado' })
        }
      })
  }, [tick, depsKey])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
