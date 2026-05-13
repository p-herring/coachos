import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { ClientForm } from '@/components/dashboard/ClientForm'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('coach_id', session.user.id)
    .single()

  if (!client) notFound()

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/clients/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {client.full_name}
        </Link>
        <h1 className="text-2xl font-bold">Edit client</h1>
      </div>

      <ClientForm
        clientId={client.id}
        defaultValues={{
          full_name: client.full_name,
          email: client.email,
          phone: client.phone ?? undefined,
          date_of_birth: client.date_of_birth ?? undefined,
          client_type: client.client_type as 'general' | 'triathlon' | 'mixed',
          status: client.status as 'lead' | 'trial' | 'active' | 'paused' | 'alumni',
          billing_model: client.billing_model as 'trial' | 'subscription' | 'one_time' | 'retainer',
          billing_status: client.billing_status as 'pending' | 'active' | 'overdue' | 'cancelled',
          billing_notes: client.billing_notes ?? undefined,
          health_notes: client.health_notes ?? undefined,
          goals: client.goals ?? [],
          checkin_cadence: client.checkin_cadence as 'weekly' | 'fortnightly',
          next_checkin_date: client.next_checkin_date ?? undefined,
          tp_username: client.tp_username ?? undefined,
        }}
      />
    </div>
  )
}
