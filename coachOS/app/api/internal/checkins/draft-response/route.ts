import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

const schema = z.object({
  checkin_id: z.string().uuid(),
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

  const { checkin_id } = parsed.data
  const coachId = session.user.id

  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .select('*, clients(full_name, client_type, goals, health_notes, checkin_cadence)')
    .eq('id', checkin_id)
    .eq('coach_id', coachId)
    .single()

  if (checkinError || !checkin) {
    return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
  }

  const client = checkin.clients as { full_name: string; client_type: string; goals: string[] | null; health_notes: string | null; checkin_cadence: string } | null

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI drafting requires ANTHROPIC_API_KEY to be configured' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const scores = [
    checkin.energy !== null ? `Energy: ${checkin.energy}/5` : null,
    checkin.sleep !== null ? `Sleep: ${checkin.sleep}/5` : null,
    checkin.stress !== null ? `Stress: ${checkin.stress}/5` : null,
    checkin.nutrition !== null ? `Nutrition: ${checkin.nutrition}/5` : null,
    checkin.weight_kg !== null ? `Weight: ${checkin.weight_kg}kg` : null,
  ].filter(Boolean).join(', ')

  const prompt = `You are writing a check-in response as Pete, a solo online coach in Perth, Australia.

Client: ${client?.full_name ?? 'Unknown'}
Client type: ${client?.client_type ?? 'general'}
${client?.health_notes ? `Health notes (important): ${client.health_notes}` : ''}
${client?.goals?.length ? `Goals: ${client.goals.join(', ')}` : ''}

This week's check-in scores: ${scores || 'No scores provided'}
${checkin.notes ? `Client notes: ${checkin.notes}` : ''}

Write a short, warm, direct response (3-5 sentences). Acknowledge the scores, address any concerns, give a brief forward-looking comment. Write in Pete's voice — genuine, encouraging, no fluff. Do not use generic phrases like "great work" or "keep it up". Do not mention being an AI.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const draft = message.content[0].type === 'text' ? message.content[0].text : ''

  // Save the draft to the checkin record
  await supabase
    .from('checkins')
    .update({ ai_draft: draft })
    .eq('id', checkin_id)

  return NextResponse.json({ draft, checkin_id })
}
