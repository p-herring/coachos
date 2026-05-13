import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  checkin_id: z.string().uuid(),
  response: z.string().min(1, 'Response cannot be empty'),
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

  const { checkin_id, response } = parsed.data
  const coachId = user.id

  const { data, error } = await supabase
    .from('checkins')
    .update({
      coach_response: response,
      responded_at: new Date().toISOString(),
    })
    .eq('id', checkin_id)
    .eq('coach_id', coachId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Check-in not found' }, { status: error ? 500 : 404 })
  }

  return NextResponse.json({ success: true, checkin: data })
}
