import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  session_id: z.string().uuid(),
  rpe: z.number().int().min(1).max(10).optional(),
  completion_notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { session_id, rpe, completion_notes } = parsed.data

  const service = createServiceClient()

  // Find the portal user's client record
  const { data: client, error: clientError } = await service
    .from('clients')
    .select('id')
    .eq('portal_user_id', session.user.id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'No linked client account found' }, { status: 403 })
  }

  // Verify the session belongs to this client
  const { data: sessionRecord } = await service
    .from('sessions')
    .select('id, client_id')
    .eq('id', session_id)
    .eq('client_id', client.id)
    .single()

  if (!sessionRecord) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data, error } = await service
    .from('sessions')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      rpe: rpe ?? null,
      completion_notes: completion_notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
