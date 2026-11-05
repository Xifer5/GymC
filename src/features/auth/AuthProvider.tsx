import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { api } from '@/lib/data'
import type { Permission, Profile } from '@/lib/data'
import { hasPermission } from '@/lib/permissions'

interface AuthState {
  user: Profile | null
  /** true mientras se recupera la sesión al abrir la app. */
  loading: boolean
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  can(permission: Permission): boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requiere <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }: { children: ComponentChildren }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api.auth
      .currentUser()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await api.auth.signIn(email, password))
  }, [])

  const signOut = useCallback(async () => {
    await api.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, loading, signIn, signOut, can: (p) => hasPermission(user, p) }),
    [user, loading, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
