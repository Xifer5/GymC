import { Lock, SearchX } from 'lucide-preact'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export function NoAccess() {
  return (
    <Card variant="outlined" padded={false}>
      <EmptyState
        icon={Lock}
        title="Sin acceso"
        description="Tu usuario no tiene permiso para ver esta sección. Pídele al administrador que te lo asigne."
      />
    </Card>
  )
}

export function NotFound() {
  return (
    <Card variant="outlined" padded={false}>
      <EmptyState icon={SearchX} title="Página no encontrada" description="La dirección no existe o fue movida." />
    </Card>
  )
}
