import { useState } from 'preact/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/features/auth/AuthProvider'
import { CategoriesSettings } from './CategoriesSettings'
import { GymSettings } from './GymSettings'
import { StaffSettings } from './StaffSettings'

type Tab = 'gym' | 'categories' | 'staff'

/** Ajustes: datos del gimnasio, categorías y personal (cada sección según permiso). */
export function SettingsPage() {
  const { can } = useAuth()
  const tabs: { value: Tab; label: string }[] = [
    { value: 'gym', label: 'Gimnasio' },
    { value: 'categories', label: 'Categorías' },
    ...(can('staff.manage') ? [{ value: 'staff' as const, label: 'Personal' }] : []),
  ]
  const [tab, setTab] = useState<Tab>('gym')

  return (
    <>
      <PageHeader title="Ajustes" description="Configura el gimnasio, las categorías y quién puede usar el sistema." />
      <div class="mb-6 max-w-lg">
        <Segmented<Tab> label="Sección de ajustes" value={tab} onChange={setTab} options={tabs} />
      </div>
      {tab === 'gym' && <GymSettings />}
      {tab === 'categories' && <CategoriesSettings />}
      {tab === 'staff' && can('staff.manage') && <StaffSettings />}
    </>
  )
}
