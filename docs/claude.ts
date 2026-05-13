// lib/ai/claude.ts
//
// Single entry point for all Claude API interactions.
// Never instantiate Anthropic outside this file.
//
// Exports:
//   anthropic          — raw client (for advanced use)
//   buildSystemPrompt  — constructs the dynamic system prompt for Command Centre
//   streamChat         — streaming chat with tool calling (used by /api/ai/chat)

import Anthropic from '@anthropic-ai/sdk'
import { coachOSTools } from './tools'

// ─── Client ───────────────────────────────────────────────────────────────────

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'


// ─── System prompt ────────────────────────────────────────────────────────────

interface SystemPromptContext {
  today: string                    // ISO date
  activeClientCount: number
  overdueCheckinCount: number
  scheduledPostCount: number
  // Optional: when the chat is linked to a specific entity
  linkedClient?: {
    id: string
    name: string
    type: string
    status: string
    healthNotes?: string
  }
  linkedPost?: {
    id: string
    title?: string
    status: string
  }
  linkedPlan?: {
    id: string
    clientName: string
    weekStart: string
  }
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const lines: string[] = []

  // ── Persona block (static) ────────────────────────────────────────────────
  lines.push(`You are the AI engine for coachOS — Pete's personal coaching operations platform.`)
  lines.push(`Pete is a solo online coach based in Perth, Australia. He has a mixed client roster of general fitness and triathlon/endurance athletes.`)
  lines.push(``)
  lines.push(`Your job is to handle the operational work of running a coaching business so Pete can focus on coaching. You have full access to his client roster, workout plans, check-ins, and social media calendar via the tools available to you.`)
  lines.push(``)
  lines.push(`Pete's style: direct, pragmatic, no fluff. He does not want lengthy explanations. He wants things done. If he asks you to build a plan, build it. If he asks for a caption, write it. Show your work briefly, but default to action over commentary.`)
  lines.push(``)
  lines.push(`When generating coaching content (plans, check-in responses, session notes):`)
  lines.push(`- Write as Pete's voice, not as an AI assistant`)
  lines.push(`- Keep language warm but professional`)
  lines.push(`- Always respect health notes and injury flags — they are non-negotiable constraints`)
  lines.push(`- Never prescribe specific load numbers for clients with medical flags without noting the caveat`)
  lines.push(``)
  lines.push(`When generating social media content:`)
  lines.push(`- pete.in.progress is Pete's personal brand — authentic, first-person, relatable`)
  lines.push(`- Avoid generic fitness influencer language ("crush it", "beast mode", etc.)`)
  lines.push(`- Instagram and TikTok captions should be punchy and scroll-stopping`)
  lines.push(`- YouTube Shorts descriptions should include searchable keywords`)
  lines.push(``)
  lines.push(`Human-in-the-loop rules — ALWAYS follow these:`)
  lines.push(`- NEVER publish a post without explicit approval from Pete`)
  lines.push(`- NEVER send a check-in response without Pete reviewing it first`)
  lines.push(`- NEVER publish a weekly plan without Pete confirming it`)
  lines.push(`- For anything that touches a client directly: draft → show Pete → wait for approval → execute`)
  lines.push(`- For internal operations (notes, drafts, analysis): execute and report`)

  // ── Dynamic context block ─────────────────────────────────────────────────
  lines.push(``)
  lines.push(`--- CURRENT CONTEXT ---`)
  lines.push(`Today: ${ctx.today} (Perth, AWST UTC+8)`)
  lines.push(`Active clients: ${ctx.activeClientCount}`)

  if (ctx.overdueCheckinCount > 0) {
    lines.push(`⚠ Overdue check-ins: ${ctx.overdueCheckinCount} client(s) — Pete should address these`)
  }

  if (ctx.scheduledPostCount > 0) {
    lines.push(`Scheduled posts: ${ctx.scheduledPostCount} in the queue`)
  }

  // ── Linked entity context (when chat is scoped to a client/post/plan) ────
  if (ctx.linkedClient) {
    lines.push(``)
    lines.push(`--- THIS CONVERSATION IS ABOUT CLIENT ---`)
    lines.push(`Name: ${ctx.linkedClient.name}`)
    lines.push(`Type: ${ctx.linkedClient.type}`)
    lines.push(`Status: ${ctx.linkedClient.status}`)
    lines.push(`Client ID: ${ctx.linkedClient.id}`)
    if (ctx.linkedClient.healthNotes) {
      lines.push(`⚠ HEALTH NOTES (always apply): ${ctx.linkedClient.healthNotes}`)
    }
  }

  if (ctx.linkedPost) {
    lines.push(``)
    lines.push(`--- THIS CONVERSATION IS ABOUT POST ---`)
    lines.push(`Post ID: ${ctx.linkedPost.id}`)
    if (ctx.linkedPost.title) lines.push(`Title: ${ctx.linkedPost.title}`)
    lines.push(`Status: ${ctx.linkedPost.status}`)
  }

  if (ctx.linkedPlan) {
    lines.push(``)
    lines.push(`--- THIS CONVERSATION IS ABOUT WEEKLY PLAN ---`)
    lines.push(`Plan ID: ${ctx.linkedPlan.id}`)
    lines.push(`Client: ${ctx.linkedPlan.clientName}`)
    lines.push(`Week of: ${ctx.linkedPlan.weekStart}`)
  }

  lines.push(`--- END CONTEXT ---`)

  return lines.join('\n')
}


// ─── Streaming chat with tool calling ─────────────────────────────────────────
// Used by app/api/ai/chat/route.ts
// Returns a ReadableStream that the Vercel AI SDK can pipe to the client.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamChatOptions {
  messages: ChatMessage[]
  systemPrompt: string
  onToolCall?: (toolName: string, toolInput: Record<string, unknown>) => Promise<unknown>
}

export async function streamChat(options: StreamChatOptions): Promise<ReadableStream> {
  const { messages, systemPrompt, onToolCall } = options

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Convert messages to Anthropic format
        const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
          role: m.role,
          content: m.content,
        }))

        // Agentic loop — keeps running until Claude stops calling tools
        let continueLoop = true
        let currentMessages = [...anthropicMessages]

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: coachOSTools,
            messages: currentMessages,
            stream: false,  // we handle our own streaming below
          })

          // Process each content block
          const toolResults: Anthropic.ToolResultBlockParam[] = []
          let hasToolUse = false

          for (const block of response.content) {
            if (block.type === 'text') {
              // Stream text to client in SSE format
              const chunk = `data: ${JSON.stringify({ type: 'text', text: block.text })}\n\n`
              controller.enqueue(encoder.encode(chunk))

            } else if (block.type === 'tool_use') {
              hasToolUse = true

              // Notify client that a tool is being called
              const toolChunk = `data: ${JSON.stringify({
                type: 'tool_call',
                tool: block.name,
                input: block.input,
              })}\n\n`
              controller.enqueue(encoder.encode(toolChunk))

              // Execute the tool
              let toolResult: unknown
              let toolError: string | null = null

              try {
                if (onToolCall) {
                  toolResult = await onToolCall(block.name, block.input as Record<string, unknown>)
                } else {
                  toolError = 'No tool executor configured'
                }
              } catch (err) {
                toolError = err instanceof Error ? err.message : 'Tool execution failed'
              }

              // Notify client of tool result
              const resultChunk = `data: ${JSON.stringify({
                type: 'tool_result',
                tool: block.name,
                success: !toolError,
                error: toolError,
              })}\n\n`
              controller.enqueue(encoder.encode(resultChunk))

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: toolError
                  ? JSON.stringify({ error: toolError })
                  : JSON.stringify(toolResult),
              })
            }
          }

          // If Claude used tools, feed results back and loop
          if (hasToolUse && response.stop_reason === 'tool_use') {
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResults },
            ]
            continueLoop = true
          } else {
            // Claude is done (end_turn or no more tools)
            continueLoop = false
          }
        }

        // Signal end of stream
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

      } catch (err) {
        const errorChunk = `data: ${JSON.stringify({
          type: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        })}\n\n`
        controller.enqueue(encoder.encode(errorChunk))
        controller.close()
      }
    },
  })

  return stream
}
