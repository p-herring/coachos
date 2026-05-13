import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_id: z.string().uuid(),
  note: z.string().min(1, 'Note cannot be empty'),
  note_type: z.enum(['general', 'call', 'email', 'whatsapp', 'billing', 'flag']).default('general'),
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

  const { client_id, note, note_type } = parsed.data
  const coachId = session.user.id

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
    .from('client_notes')
    .insert({ client_id, note, note_type, coach_id: coachId })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ note: data }, { status: 201 })
}
