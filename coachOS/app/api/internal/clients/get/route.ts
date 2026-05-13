import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.COACH_USER_ID) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { client_id } = parsed.data
  const coachId = user.id

  const [clientResult, checkinsResult, notesResult, activePlanResult] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .eq('coach_id', coachId)
      .single(),

    supabase
      .from('checkins')
      .select('*')
      .eq('client_id', client_id)
      .eq('coach_id', coachId)
      .order('submitted_at', { ascending: false })
      .limit(10),

    supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', client_id)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('weekly_plans')
      .select('*')
      .eq('client_id', client_id)
      .eq('coach_id', coachId)
      .in('status', ['draft', 'published'])
      .gte('week_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (clientResult.error || !clientResult.data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({
    client: clientResult.data,
    recent_checkins: checkinsResult.data ?? [],
    notes: notesResult.data ?? [],
    active_plan: activePlanResult.data ?? null,
  })
}
