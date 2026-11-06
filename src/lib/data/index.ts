/**
 * Punto único de acceso a datos para la UI: `import { api } from '@/lib/data'`.
 * Hoy: mock local en localStorage. Para pasar a Supabase solo cambia esta línea
 * (crear `supabase.ts` que implemente DataApi y pase `contract.ts`).
 */
import { createMockApi } from './mock'

export const api = createMockApi({
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
  latencyMs: import.meta.env.DEV ? 150 : 0,
})

export * from './types'

/**
 * Datos de demostración. Solo existen con el adaptador mock (sin servidor); al conectar Supabase
 * `available` pasa a `false` y la interfaz oculta los botones. Requiere `settings.manage`.
 */
export const demo = {
  available: true as boolean,
  load: (opts?: { replace?: boolean }) => api.demo.load(opts),
  clear: () => api.demo.clear(),
}

// Solo desarrollo: permite sembrar/inspeccionar datos desde la consola del navegador (`__api.members.list()`).
if (import.meta.env.DEV) Object.assign(window, { __api: api })
