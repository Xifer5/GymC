import { useState } from 'preact/hooks'
import { api } from '@/lib/data'
import { useAsyncData } from '@/lib/useAsyncData'
import { PageHeader } from '@/components/shared/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/features/auth/AuthProvider'
import { CategoriesSettings } from './CategoriesSettings'
import { DemoDataCard } from './DemoDataCard'
import { ExportSettings } from './ExportSettings'
import { GymSettings } from './GymSettings'
import { StaffSettings } from './StaffSettings'

type Tab = 'gym' | 'categories' | 'data' | 'staff'

/** Ajustes: datos del gimnasio, categorías y personal (cada sección según permiso). */
export function SettingsPage() {
  const { can } = useAuth()
  const tabs: { value: Tab; label: string }[] = [
    { value: 'gym', label: 'Gimnasio' },
    { value: 'categories', label: 'Categorías' },
    { value: 'data', label: 'Datos' },
    ...(can('staff.manage') ? [{ value: 'staff' as const, label: 'Personal' }] : []),
  ]
  const [tab, setTab] = useState<Tab>('gym')
  const summary = useAsyncData(() => api.dashboard.get(), [])

  return (
    <>
      <PageHeader title="Ajustes" description="Configura el gimnasio, las categorías, descarga tus datos y decide quién puede usar el sistema." />
      <div class="mb-6 max-w-lg">
        <Segmented<Tab> label="Sección de ajustes" value={tab} onChange={setTab} options={tabs} />
      </div>
      {tab === 'gym' && (
        <div class="space-y-8">
          <GymSettings />
          {summary.data && <DemoDataCard hasData={summary.data.totalMembers > 0} onChanged={summary.reload} />}
        </div>
      )}
      {tab === 'categories' && <CategoriesSettings />}
      {tab === 'data' && <ExportSettings />}
      {tab === 'staff' && can('staff.manage') && <StaffSettings />}
    </>
  )
}
