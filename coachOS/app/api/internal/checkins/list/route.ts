import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid().optional(),
  include_responded: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(100).optional().default(20),
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

  const { client_id, include_responded, limit, offset } = parsed.data
  const coachId = user.id

  let query = supabase
    .from('checkins')
    .select('*, clients(id, full_name, client_type)', { count: 'exact' })
    .eq('coach_id', coachId)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (client_id) {
    query = query.eq('client_id', client_id)
  }

  if (!include_responded) {
    query = query.is('coach_response', null)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ checkins: data ?? [], total: count ?? 0 })
}
