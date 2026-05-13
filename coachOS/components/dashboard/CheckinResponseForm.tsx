'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Bot, Send } from 'lucide-react'

interface CheckinResponseFormProps {
  checkinId: string
  existingDraft?: string | null
  existingResponse?: string | null
}

export function CheckinResponseForm({ checkinId, existingDraft, existingResponse }: CheckinResponseFormProps) {
  const router = useRouter()
  const [response, setResponse] = useState(existingResponse ?? existingDraft ?? '')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alreadyResponded = Boolean(existingResponse)

  async function draftWithAI() {
    setDrafting(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/checkins/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: checkinId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to draft response')
        return
      }
      setResponse(data.draft)
    } catch {
      setError('Network error')
    } finally {
      setDrafting(false)
    }
  }

  async function sendResponse() {
    if (!response.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/checkins/send-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: checkinId, response: response.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send response')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  if (alreadyResponded) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your response</p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{existingResponse}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Response</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={draftWithAI}
          disabled={drafting}
          className="gap-1.5 text-xs h-7"
        >
          <Bot className="w-3 h-3" />
          {drafting ? 'Drafting…' : 'Draft with AI'}
        </Button>
      </div>
      <Textarea
        value={response}
        onChange={e => setResponse(e.target.value)}
        placeholder="Write your response…"
        rows={4}
        className="resize-none"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        size="sm"
        onClick={sendResponse}
        disabled={sending || !response.trim()}
        className="gap-1.5"
      >
        <Send className="w-3 h-3" />
        {sending ? 'Sending…' : 'Send response'}
      </Button>
    </div>
  )
}
