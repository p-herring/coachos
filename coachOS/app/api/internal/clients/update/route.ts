import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid(),
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  client_type: z.enum(['general', 'triathlon', 'mixed']).optional(),
  status: z.enum(['lead', 'trial', 'active', 'paused', 'alumni']).optional(),
  billing_model: z.enum(['trial', 'subscription', 'one_time', 'retainer']).optional(),
  billing_status: z.enum(['pending', 'active', 'overdue', 'cancelled']).optional(),
  billing_notes: z.string().nullable().optional(),
  goals: z.array(z.string()).optional(),
  health_notes: z.string().nullable().optional(),
  checkin_cadence: z.enum(['weekly', 'fortnightly']).optional(),
  next_checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  tp_username: z.string().nullable().optional(),
  onboarded_at: z.string().nullable().optional(),
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

  const { client_id, ...updates } = parsed.data
  const coachId = session.user.id

  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', client_id)
    .eq('coach_id', coachId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Client not found' }, { status: error ? 500 : 404 })
  }

  return NextResponse.json({ client: data })
}
