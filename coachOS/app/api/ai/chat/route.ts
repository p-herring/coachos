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
  let linkedClient:
    | {
        id: string
        name: string
        type: string
        status: string
        healthNotes?: string
      }
    | undefined
  let linkedPost:
    | {
        id: string
        title?: string
        status: string
      }
    | undefined
  let linkedPlan:
    | {
        id: string
        clientName: string
        weekStart: string
      }
    | undefined

  if (context.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, client_type, status, health_notes')
      .eq('id', context.client_id)
      .single()
    const client = data as
      | {
          id: string
          full_name: string
          client_type: string
          status: string
          health_notes?: string | null
        }
      | null

    if (client) {
      linkedClient = {
        id: client.id,
        name: client.full_name,
        type: client.client_type,
        status: client.status,
        healthNotes: client.health_notes ?? undefined,
      }
    }
  }

  if (context.post_id) {
    const { data } = await supabase
      .from('posts')
      .select('id, title, status')
      .eq('id', context.post_id)
      .single()
    const post = data as
      | {
          id: string
          title?: string | null
          status: string
        }
      | null

    if (post) {
      linkedPost = {
        id: post.id,
        title: post.title ?? undefined,
        status: post.status,
      }
    }
  }

  if (context.plan_id) {
    const { data } = await supabase
      .from('weekly_plans')
      .select('id, week_start, clients(full_name)')
      .eq('id', context.plan_id)
      .single()
    const plan = data as
      | {
          id: string
          week_start: string
          clients?: { full_name: string } | null
        }
      | null

    if (plan) {
      linkedPlan = {
        id: plan.id,
        weekStart: plan.week_start,
        clientName: plan.clients?.full_name ?? 'Unknown',
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

  const aiConversationPayload = {
    messages,
    context,
  }

  const aiConversationsTable = supabase.from('ai_conversations') as unknown as {
    update: (values: {
      messages: typeof messages
      context: typeof context
      updated_at: string
    }) => {
      eq: (column: string, value: string) => Promise<unknown>
    }
    insert: (values: {
      coach_id: string
      title: string
      messages: typeof messages
      context: typeof context
    }) => Promise<unknown>
  }

  // ── Save conversation to DB (async, non-blocking) ───────────────────────
  // We fire-and-forget the save so it doesn't delay the stream.
  // The conversation is saved/updated after each user message.

  if (conversation_id) {
    // Update existing conversation
    aiConversationsTable.update({
      ...aiConversationPayload,
      updated_at: new Date().toISOString(),
    }).eq('id', conversation_id).then(() => {})
  } else {
    // Create new conversation (title = first 60 chars of first user message)
    const firstUserMessage = messages.find(m => m.role === 'user')?.content ?? ''
    aiConversationsTable.insert({
      coach_id: session.user.id,
      title: firstUserMessage.slice(0, 60),
      ...aiConversationPayload,
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
