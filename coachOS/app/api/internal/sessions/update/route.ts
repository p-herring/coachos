import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  session_id: z.string().uuid(),
  name: z.string().min(1).optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  session_type: z.enum(['swim', 'bike', 'run', 'strength', 'conditioning', 'mobility', 'rest', 'other']).optional(),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  intensity: z.enum(['easy', 'moderate', 'hard', 'race']).nullable().optional(),
  notes: z.string().nullable().optional(),
  coach_notes: z.string().nullable().optional(),
  exercises: z.array(z.record(z.string(), z.unknown())).optional(),
  weekly_plan_id: z.string().uuid().nullable().optional(),
})

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

  const { session_id, exercises, ...updates } = parsed.data
  const coachId = session.user.id

  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString(),
    ...(exercises !== undefined ? { exercises: exercises as import('@/types/database').Json } : {}),
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', session_id)
    .eq('coach_id', coachId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Session not found' }, { status: error ? 500 : 404 })
  }

  return NextResponse.json({ session: data })
}
