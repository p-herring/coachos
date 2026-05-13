import { NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Use service role to read the client record (clients table has no portal-user RLS policy by design)
  const service = createServiceClient()

  const { data: client, error } = await service
    .from('clients')
    .select('id, full_name, email, client_type, goals, health_notes, status, checkin_cadence, next_checkin_date, portal_user_id, coach_id')
    .eq('portal_user_id', user.id)
    .single()

  if (error || !client) {
    return NextResponse.json({ status: 'not_linked' }, { status: 200 })
  }

  if (client.status === 'alumni' || client.status === 'paused') {
    return NextResponse.json({ status: 'inactive', client })
  }

  return NextResponse.json({ status: 'active', client })
}
