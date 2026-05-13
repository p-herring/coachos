import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  client_type: z.enum(['general', 'triathlon', 'mixed']).default('general'),
  status: z.enum(['lead', 'trial', 'active', 'paused', 'alumni']).default('lead'),
  billing_model: z.enum(['trial', 'subscription', 'one_time', 'retainer']).default('retainer'),
  billing_status: z.enum(['pending', 'active', 'overdue', 'cancelled']).default('pending'),
  billing_notes: z.string().optional(),
  goals: z.array(z.string()).optional().default([]),
  health_notes: z.string().optional(),
  checkin_cadence: z.enum(['weekly', 'fortnightly']).default('weekly'),
  next_checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tp_username: z.string().optional(),
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

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...parsed.data, coach_id: coachId })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A client with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client: data }, { status: 201 })
}
