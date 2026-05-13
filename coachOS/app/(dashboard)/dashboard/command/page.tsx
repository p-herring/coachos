// app/(dashboard)/command/page.tsx
//
// AI Command Centre — the primary way Pete interacts with Claude.
// Full-page chat interface with:
//   - Streaming responses
//   - Tool call visibility (shows what Claude is doing)
//   - Optional entity context (client, post, or plan linked to the conversation)
//   - Conversation history sidebar
//   - Suggested quick actions

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Loader2, Bot, User, Wrench, ChevronRight, History, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallEvent[]
  timestamp: Date
}

interface ToolCallEvent {
  tool: string
  input: Record<string, unknown>
  success?: boolean
  error?: string
}

interface SSEEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error'
  text?: string
  tool?: string
  input?: Record<string, unknown>
  success?: boolean
  error?: string
  message?: string
}

// ─── Quick action suggestions ─────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Who needs a check-in response?', icon: '📋' },
  { label: "Build this week's plans for all active clients", icon: '📅' },
  { label: 'Draft 3 Instagram posts for this week', icon: '📸' },
  { label: 'Which clients are overdue for a check-in?', icon: '⚠️' },
  { label: "What's performing best on social this month?", icon: '📈' },
  { label: 'Summarise all active client check-ins', icon: '👥' },
]

// ─── Tool call display names ──────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  get_client:                  'Fetching client profile',
  list_clients:                'Querying client roster',
  update_client:               'Updating client',
  add_client_note:             'Adding note',
  get_weekly_plan:             'Loading weekly plan',
  create_session:              'Creating session',
  update_session:              'Updating session',
  publish_weekly_plan:         'Publishing plan',
  generate_session:            'Generating session',
  build_week:                  'Building week plan',
  get_checkins:                'Loading check-ins',
  draft_checkin_response:      'Drafting response',
  send_checkin_response:       'Saving response',
  list_posts:                  'Loading content calendar',
  create_post:                 'Creating post draft',
  schedule_post:               'Scheduling post',
  get_post_metrics:            'Fetching metrics',
  analyse_content_performance: 'Analysing performance',
  generate_image:              'Generating image with DALL-E',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandCentrePage() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client')
  const postId   = searchParams.get('post')
  const planId   = searchParams.get('plan')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallEvent[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeToolCalls])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setActiveToolCalls([])

    // Build message history for API
    const history = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Placeholder for streaming assistant message
    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])

    // Abort controller for cancellation
    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: {
            client_id: clientId ?? undefined,
            post_id:   postId   ?? undefined,
            plan_id:   planId   ?? undefined,
          },
          conversation_id: conversationId,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const toolCalls: ToolCallEvent[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          let event: SSEEvent
          try { event = JSON.parse(data) } catch { continue }

          if (event.type === 'text' && event.text) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + event.text }
                : m
            ))
          }

          if (event.type === 'tool_call' && event.tool) {
            const tc: ToolCallEvent = { tool: event.tool, input: event.input ?? {} }
            toolCalls.push(tc)
            setActiveToolCalls([...toolCalls])
          }

          if (event.type === 'tool_result' && event.tool) {
            const idx = toolCalls.findLastIndex(tc => tc.tool === event.tool && tc.success === undefined)
            if (idx !== -1) {
              toolCalls[idx] = { ...toolCalls[idx], success: event.success, error: event.error }
              setActiveToolCalls([...toolCalls])
            }
          }

          if (event.type === 'error') {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: `❌ Error: ${event.message}` }
                : m
            ))
          }
        }
      }

      // Attach final tool calls to assistant message
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, toolCalls } : m
      ))

    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: '❌ Connection error. Please try again.' }
          : m
      ))
    } finally {
      setIsStreaming(false)
      setActiveToolCalls([])
    }
  }, [messages, isStreaming, clientId, postId, planId, conversationId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setActiveToolCalls([])
  }

  const isEmptyState = messages.length === 0

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">

      {/* ── Conversation sidebar ────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-muted/30 p-4 gap-3">
        <button
          onClick={() => { setMessages([]); setConversationId(undefined) }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <History className="w-3 h-3" />
          Recent
        </div>

        {/* Conversation history list — populated via TanStack Query in production */}
        <p className="text-xs text-muted-foreground italic">
          Recent conversations appear here
        </p>
      </aside>

      {/* ── Main chat area ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Context banner — shown when chat is scoped to an entity */}
        {(clientId || postId || planId) && (
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 border-b text-sm text-brand-blue">
            <ChevronRight className="w-4 h-4" />
            {clientId && `Chatting about a client`}
            {postId   && `Chatting about a post`}
            {planId   && `Chatting about a weekly plan`}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

          {/* Empty state */}
          {isEmptyState && (
            <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-brand-blue" />
                </div>
                <h2 className="text-xl font-semibold">Command Centre</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Tell me what needs doing. I'll handle it.
                </p>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.label)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:bg-muted/50 text-left text-sm transition"
                  >
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-muted-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Active tool calls (in-progress) */}
          {isStreaming && activeToolCalls.length > 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-brand-blue" />
              </div>
              <div className="space-y-1">
                {activeToolCalls.map((tc, i) => (
                  <ToolCallPill key={i} toolCall={tc} />
                ))}
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && activeToolCalls.length === 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-brand-blue" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t bg-background px-4 py-4">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what needs doing..."
              rows={1}
              disabled={isStreaming}
              className={cn(
                "flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-3 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue",
                "disabled:opacity-50 min-h-[48px] max-h-[200px]"
              )}
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="w-11 h-11 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition"
              >
                <span className="w-3.5 h-3.5 bg-white rounded-sm" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition",
                  input.trim()
                    ? "bg-brand-blue hover:bg-brand-blue/90 text-white"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Enter to send · Shift+Enter for new line · Claude may make mistakes — always review before publishing
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
        isUser ? "bg-brand-purple/10" : "bg-brand-blue/10"
      )}>
        {isUser
          ? <User className="w-4 h-4 text-brand-purple" />
          : <Bot  className="w-4 h-4 text-brand-blue" />
        }
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
        {/* Tool calls (shown above message content if any) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1 mb-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallPill key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-brand-blue text-white rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}>
            {message.content}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ToolCallPill ─────────────────────────────────────────────────────────────

function ToolCallPill({ toolCall }: { toolCall: ToolCallEvent }) {
  const label = TOOL_LABELS[toolCall.tool] ?? toolCall.tool
  const isPending = toolCall.success === undefined
  const isSuccess = toolCall.success === true
  const isError   = toolCall.success === false

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
      isPending && "bg-muted border-border text-muted-foreground",
      isSuccess  && "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400",
      isError    && "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400",
    )}>
      {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
      {isSuccess  && <span>✓</span>}
      {isError    && <span>✗</span>}
      <Wrench className="w-3 h-3" />
      {label}
      {isError && toolCall.error && (
        <span className="opacity-70">— {toolCall.error.slice(0, 40)}</span>
      )}
    </div>
  )
}
