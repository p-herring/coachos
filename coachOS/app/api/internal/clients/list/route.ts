import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['lead', 'trial', 'active', 'paused', 'alumni', 'all']).optional().default('all'),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
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

  const { status, search, limit, offset } = parsed.data
  const coachId = user.id

  let query = supabase
    .from('clients')
    .select('id, full_name, email, phone, client_type, status, billing_status, billing_model, next_checkin_date, checkin_cadence, health_notes, goals, portal_user_id, created_at, updated_at', { count: 'exact' })
    .eq('coach_id', coachId)
    .order('full_name')
    .range(offset, offset + limit - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients: data ?? [], total: count ?? 0 })
}
