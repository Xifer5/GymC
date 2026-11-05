import { useState } from 'preact/hooks'
import { Dumbbell } from 'lucide-preact'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(e: Event) {
    e.preventDefault()
    if (busy) return
    if (!email.trim() || !password) return setError('Ingresa tu correo y contraseña')
    setBusy(true)
    setError(undefined)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
      setBusy(false)
    }
  }

  return (
    <main class="flex min-h-dvh items-center justify-center p-4">
      <Card variant="elevated" padded={false} class="w-full max-w-sm p-6">
        <form onSubmit={submit} class="space-y-4" noValidate>
          <div class="flex flex-col items-center gap-2 pb-2 text-center">
            <span class="flex size-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Dumbbell size={28} aria-hidden="true" />
            </span>
            <h1 class="text-headline-sm text-on-surface">Gym Manager</h1>
            <p class="text-body-md text-on-surface-variant">Inicia sesión para continuar</p>
          </div>
          <TextField
            label="Correo"
            type="email"
            name="email"
            autocomplete="username"
            inputMode="email"
            value={email}
            onValueChange={setEmail}
          />
          <TextField
            label="Contraseña"
            type="password"
            name="password"
            autocomplete="current-password"
            value={password}
            onValueChange={setPassword}
            error={error}
          />
          <Button type="submit" fullWidth loading={busy}>
            Entrar
          </Button>
          {import.meta.env.DEV && (
            <p class="text-body-sm text-on-surface-variant">
              Demo: admin@gym.local / admin123 · recep@gym.local / recep123
            </p>
          )}
        </form>
      </Card>
    </main>
  )
}
