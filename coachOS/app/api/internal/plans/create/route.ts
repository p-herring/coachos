import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start must be YYYY-MM-DD'),
  coach_notes: z.string().optional(),
})

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.id !== process.env.COACH_USER_ID) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { client_id, week_start, coach_notes } = parsed.data
  const coachId = session.user.id

  // Verify week_start is a Monday
  const dayOfWeek = new Date(week_start + 'T00:00:00').getDay()
  if (dayOfWeek !== 1) {
    return NextResponse.json({ error: 'week_start must be a Monday' }, { status: 400 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .eq('coach_id', coachId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('weekly_plans')
    .insert({
      client_id,
      coach_id: coachId,
      week_start,
      week_end: getWeekEnd(week_start),
      coach_notes: coach_notes ?? null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A plan already exists for this client and week' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: data }, { status: 201 })
}
