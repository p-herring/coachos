import { redirect } from 'next/navigation'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { CheckinForm } from '@/components/portal/CheckinForm'

export default async function PortalCheckinPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <p className="text-muted-foreground">Portal not yet configured.</p>
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id, full_name, health_notes, checkin_cadence')
    .eq('portal_user_id', user.id)
    .single()

  if (!client) redirect('/portal/not-linked')

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Weekly check-in</h1>
        <p className="text-muted-foreground mt-1">How&apos;s your week been?</p>
      </div>

      {client.health_notes && (
        <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-sm text-brand-orange">
          <span className="font-medium">Remember: </span>{client.health_notes}
        </div>
      )}

      <CheckinForm clientId={client.id} />
    </div>
  )
}
