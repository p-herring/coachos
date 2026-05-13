import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

function getMondayForDate(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

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

  const { client_id, week_start } = parsed.data
  const coachId = user.id
  const targetWeek = week_start ?? getMondayForDate(new Date())

  const { data: plan, error: planError } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('client_id', client_id)
    .eq('coach_id', coachId)
    .eq('week_start', targetWeek)
    .maybeSingle()

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }

  let sessions: unknown[] = []
  if (plan) {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('weekly_plan_id', plan.id)
      .order('session_date')

    sessions = sessionData ?? []
  }

  return NextResponse.json({ plan: plan ?? null, sessions, week_start: targetWeek })
}
