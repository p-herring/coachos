// app/api/ai/chat/route.ts
//
// Streaming Command Centre endpoint.
// Accepts messages + context, builds the system prompt,
// calls Claude with tool support, and streams SSE back to the client.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { buildSystemPrompt, streamChat } from '@/lib/ai/claude'
import { executeTool } from '@/lib/ai/tools'

// ─── Request schema ───────────────────────────────────────────────────────────

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1),
  context: z.object({
    client_id:  z.string().uuid().optional(),
    post_id:    z.string().uuid().optional(),
    plan_id:    z.string().uuid().optional(),
  }).optional().default({}),
  conversation_id: z.string().uuid().optional(), // for saving to ai_conversations
})


// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse + validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { messages, context, conversation_id } = parsed.data

  // Auth: verify Pete is logged in
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Belt-and-suspenders: verify this is actually Pete
  if (session.user.id !== process.env.COACH_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Build system prompt context ─────────────────────────────────────────

  // Fetch dashboard stats for context block
  const [
    { count: activeClientCount },
    { count: overdueCheckinCount },
    { count: scheduledPostCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('coach_id', session.user.id).eq('status', 'active'),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('coach_id', session.user.id)
      .eq('status', 'active')
      .lt('next_checkin_date', new Date().toISOString().split('T')[0]),
    supabase.from('posts').select('*', { count: 'exact', head: true })
      .eq('coach_id', session.user.id).eq('status', 'scheduled'),
  ])

  // Fetch linked entity details if context provided
  let linkedClient
  let linkedPost
  let linkedPlan

  if (context.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, client_type, status, health_notes')
      .eq('id', context.client_id)
      .single()
    if (data) {
      linkedClient = {
        id: data.id,
        name: data.full_name,
        type: data.client_type,
        status: data.status,
        healthNotes: data.health_notes ?? undefined,
      }
    }
  }

  if (context.post_id) {
    const { data } = await supabase
      .from('posts')
      .select('id, title, status')
      .eq('id', context.post_id)
      .single()
    if (data) linkedPost = data
  }

  if (context.plan_id) {
    const { data } = await supabase
      .from('weekly_plans')
      .select('id, week_start, clients(full_name)')
      .eq('id', context.plan_id)
      .single()
    if (data) {
      linkedPlan = {
        id: data.id,
        weekStart: data.week_start,
        clientName: (data.clients as { full_name: string })?.full_name ?? 'Unknown',
      }
    }
  }

  const systemPrompt = buildSystemPrompt({
    today: new Date().toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Australia/Perth',
    }),
    activeClientCount: activeClientCount ?? 0,
    overdueCheckinCount: overdueCheckinCount ?? 0,
    scheduledPostCount: scheduledPostCount ?? 0,
    linkedClient,
    linkedPost,
    linkedPlan,
  })

  // ── Save conversation to DB (async, non-blocking) ───────────────────────
  // We fire-and-forget the save so it doesn't delay the stream.
  // The conversation is saved/updated after each user message.

  if (conversation_id) {
    // Update existing conversation
    supabase.from('ai_conversations').update({
      messages: messages,
      context: context,
      updated_at: new Date().toISOString(),
    }).eq('id', conversation_id).then(() => {})
  } else {
    // Create new conversation (title = first 60 chars of first user message)
    const firstUserMessage = messages.find(m => m.role === 'user')?.content ?? ''
    supabase.from('ai_conversations').insert({
      coach_id: session.user.id,
      title: firstUserMessage.slice(0, 60),
      messages: messages,
      context: context,
    }).then(() => {})
  }

  // ── Stream Claude response ──────────────────────────────────────────────

  const accessToken = session.access_token

  const responseStream = await streamChat({
    messages,
    systemPrompt,
    onToolCall: async (toolName, toolInput) => {
      return executeTool(toolName, toolInput, accessToken)
    },
  })

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
