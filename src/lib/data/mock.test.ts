import { describe, expect, it } from 'vitest'
import { runDataApiContract } from './contract'
import { createMockApi } from './mock'
import type { StorageLike } from './mock'

const memoryStorage = (): StorageLike => {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

runDataApiContract('mock', () => createMockApi({ storage: memoryStorage() }))

describe('persistencia del mock', () => {
  it('los datos sobreviven a recargar (misma storage)', async () => {
    const storage = memoryStorage()
    const a = createMockApi({ storage })
    await a.auth.signIn('admin@gym.local', 'admin123')
    await a.members.create({ fullName: 'Luis', ci: '55', phone: '1' })
    const b = createMockApi({ storage })
    expect((await b.auth.currentUser())?.email).toBe('admin@gym.local')
    expect((await b.members.list()).total).toBe(1)
  })
  it('storage corrupto → arranca limpio', async () => {
    const storage = memoryStorage()
    storage.setItem('gm-mock-db', '{no es json')
    const a = createMockApi({ storage })
    await a.auth.signIn('admin@gym.local', 'admin123')
    expect((await a.members.list()).total).toBe(0)
  })
})
