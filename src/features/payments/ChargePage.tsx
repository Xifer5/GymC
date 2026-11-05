import { useState } from 'preact/hooks'
import { useLocation, useSearch } from 'wouter'
import { PageHeader } from '@/components/shared/PageHeader'
import { MemberPicker } from '@/features/members/MemberPicker'
import { ChargeForm } from './ChargeForm'
import { Receipt } from './Receipt'
import type { ReceiptData } from './Receipt'

/** `/cobrar` elige socio; `/cobrar?socio=ID` abre el cobro de ese socio. Al confirmar muestra el recibo. */
export function ChargePage() {
  const search = useSearch()
  const [, navigate] = useLocation()
  const memberId = new URLSearchParams(search).get('socio')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  if (receipt) {
    return (
      <>
        <PageHeader title="Recibo" />
        <Receipt
          data={receipt}
          onNew={() => {
            setReceipt(null)
            navigate('/cobrar')
          }}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Cobrar" description="Inscribe, renueva o cobra un saldo pendiente." />
      <div class="mx-auto max-w-2xl">
        {memberId ? (
          <ChargeForm key={memberId} memberId={memberId} onChangeMember={() => navigate('/cobrar')} onDone={setReceipt} />
        ) : (
          <MemberPicker onSelect={(m) => navigate(`/cobrar?socio=${m.id}`)} />
        )}
      </div>
    </>
  )
}
