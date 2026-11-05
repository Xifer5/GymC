import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useRef, useState } from 'preact/hooks'

interface ShowOptions {
  actionLabel?: string
  onAction?: () => void
  /** ms; por defecto 4000. */
  duration?: number
}
interface Item extends ShowOptions {
  id: number
  message: string
}

const SnackbarContext = createContext<{ show: (message: string, opts?: ShowOptions) => void } | null>(null)

export function useSnackbar() {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar requiere <SnackbarProvider>')
  return ctx
}

/** Un solo snackbar a la vez (M3). Colocar una vez en la raíz de la app. */
export function SnackbarProvider({ children }: { children: ComponentChildren }) {
  const [item, setItem] = useState<Item | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const seq = useRef(0)

  const dismiss = useCallback(() => setItem(null), [])
  const show = useCallback((message: string, opts: ShowOptions = {}) => {
    setItem({ id: ++seq.current, message, ...opts })
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (item) timer.current = setTimeout(dismiss, item.duration ?? 4000)
    return () => clearTimeout(timer.current)
  }, [item, dismiss])

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        class="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex justify-center sm:bottom-6"
      >
        {item && (
          <div
            key={item.id}
            class="pointer-events-auto flex min-h-12 w-full max-w-lg items-center gap-2 rounded-xs bg-inverse-surface py-2 pl-4 pr-2 text-body-md text-inverse-on-surface shadow-3"
          >
            <span class="flex-1">{item.message}</span>
            {item.actionLabel && (
              <button
                type="button"
                class="state-layer h-10 rounded-xl px-3 text-label-lg text-inverse-primary"
                onClick={() => {
                  item.onAction?.()
                  dismiss()
                }}
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </SnackbarContext.Provider>
  )
}
