import type { ComponentChildren } from 'preact'
import { Suspense, lazy } from 'preact/compat'
import { Route, Switch } from 'wouter'
import { AppShell } from '@/components/layout/AppShell'
import { SnackbarProvider } from '@/components/ui/Snackbar'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ExpiringPage } from '@/features/memberships/ExpiringPage'
import { MemberDetailPage } from '@/features/members/MemberDetailPage'
import { MembersPage } from '@/features/members/MembersPage'
import { MovementsPage } from '@/features/movements/MovementsPage'
import { ChargePage } from '@/features/payments/ChargePage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PlansPage } from '@/features/plans/PlansPage'
import type { Permission } from '@/lib/data'
import { NoAccess, NotFound } from '@/pages/Placeholder'

// El catálogo solo se incluye en desarrollo (se elimina del build de producción).
const Design = import.meta.env.DEV ? lazy(() => import('./pages/Design')) : null

/** Muestra la página solo si el usuario tiene todos los permisos; si no, "Sin acceso". */
function Guard({ perms, children }: { perms: Permission[]; children: ComponentChildren }) {
  const { can } = useAuth()
  return perms.every(can) ? <>{children}</> : <NoAccess />
}

function AuthenticatedApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div class="grid min-h-dvh place-items-center text-body-md text-on-surface-variant" role="status">Cargando…</div>
  }
  if (!user) return <LoginPage />

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/socios">
          <Guard perms={['members.read']}>
            <MembersPage />
          </Guard>
        </Route>
        <Route path="/socios/:id">
          {(params: { id: string }) => (
            <Guard perms={['members.read']}>
              <MemberDetailPage id={params.id} />
            </Guard>
          )}
        </Route>
        <Route path="/vencimientos">
          <Guard perms={['members.read']}>
            <ExpiringPage />
          </Guard>
        </Route>
        <Route path="/cobrar">
          <Guard perms={['payments.create', 'memberships.write']}>
            <ChargePage />
          </Guard>
        </Route>
        <Route path="/movimientos">
          <Guard perms={['movements.read']}>
            <MovementsPage />
          </Guard>
        </Route>
        <Route path="/reportes">
          <Guard perms={['reports.view']}>
            <ReportsPage />
          </Guard>
        </Route>
        <Route path="/planes">
          <Guard perms={['plans.manage']}>
            <PlansPage />
          </Guard>
        </Route>
        <Route path="/ajustes">
          <Guard perms={['settings.manage']}>
            <SettingsPage />
          </Guard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  )
}

export function App() {
  return (
    <SnackbarProvider>
      <Switch>
        {Design && (
          <Route path="/design">
            <Suspense fallback={null}>
              <Design />
            </Suspense>
          </Route>
        )}
        <Route>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        </Route>
      </Switch>
    </SnackbarProvider>
  )
}
