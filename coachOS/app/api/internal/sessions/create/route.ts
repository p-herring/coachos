import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid(),
  weekly_plan_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Session name is required'),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'session_date must be YYYY-MM-DD'),
  session_type: z.enum(['swim', 'bike', 'run', 'strength', 'conditioning', 'mobility', 'rest', 'other']),
  duration_minutes: z.number().int().min(1).optional(),
  intensity: z.enum(['easy', 'moderate', 'hard', 'race']).optional(),
  notes: z.string().optional(),
  coach_notes: z.string().optional(),
  exercises: z.array(z.record(z.string(), z.unknown())).optional().default([]),
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

  const coachId = user.id
  const { client_id, weekly_plan_id, ...rest } = parsed.data

  // Verify client belongs to coach
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .eq('coach_id', coachId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // If weekly_plan_id provided, verify it belongs to this coach + client
  if (weekly_plan_id) {
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('id', weekly_plan_id)
      .eq('client_id', client_id)
      .eq('coach_id', coachId)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Weekly plan not found' }, { status: 404 })
    }
  }

  const { exercises, ...restWithoutExercises } = rest

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      ...restWithoutExercises,
      exercises: (exercises ?? []) as import('@/types/database').Json,
      client_id,
      weekly_plan_id: weekly_plan_id ?? null,
      coach_id: coachId,
      source: 'coachOS',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data }, { status: 201 })
}
