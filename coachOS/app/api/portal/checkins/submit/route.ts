import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  energy: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  nutrition: z.number().int().min(1).max(5),
  notes: z.string().optional(),
  weight_kg: z.number().min(0).max(500).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Use service role to find and verify client
  const service = createServiceClient()

  const { data: client, error: clientError } = await service
    .from('clients')
    .select('id, coach_id, status')
    .eq('portal_user_id', session.user.id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'No linked client account found' }, { status: 403 })
  }

  if (client.status !== 'active' && client.status !== 'trial') {
    return NextResponse.json({ error: 'Your account is not active' }, { status: 403 })
  }

  const { data, error } = await service
    .from('checkins')
    .insert({
      ...parsed.data,
      client_id: client.id,
      coach_id: client.coach_id,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Advance next_checkin_date based on cadence
  const { data: fullClient } = await service
    .from('clients')
    .select('checkin_cadence, next_checkin_date')
    .eq('id', client.id)
    .single()

  if (fullClient) {
    const cadenceDays = fullClient.checkin_cadence === 'fortnightly' ? 14 : 7
    const next = new Date()
    next.setDate(next.getDate() + cadenceDays)
    await service
      .from('clients')
      .update({ next_checkin_date: next.toISOString().split('T')[0] })
      .eq('id', client.id)
  }

  return NextResponse.json({ checkin_id: data.id }, { status: 201 })
}
