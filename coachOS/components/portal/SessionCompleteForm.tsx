'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  sessionId: string
}

export function SessionCompleteForm({ sessionId }: Props) {
  const router = useRouter()
  const [rpe, setRpe] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/portal/sessions/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        rpe: rpe ?? undefined,
        completion_notes: notes.trim() || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      setLoading(false)
      return
    }
    router.push('/portal/plan')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* RPE selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium">How hard was it? (RPE 1–10)</label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRpe(n === rpe ? null : n)}
              className={`w-10 h-10 rounded-xl text-sm font-semibold border transition ${
                rpe === n
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-card text-foreground border-border hover:border-brand-blue/50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {rpe !== null && (
          <p className="text-xs text-muted-foreground">
            {rpe <= 3 ? 'Easy — well within comfort zone' :
             rpe <= 5 ? 'Moderate — sustainable effort' :
             rpe <= 7 ? 'Hard — challenging but manageable' :
             rpe <= 9 ? 'Very hard — at or near your limit' :
             'Maximum effort — all out'}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          How did it go? <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Any notes for your coach — how you felt, what went well, anything to flag..."
          className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blue/90 transition disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Mark as complete'}
      </button>
    </form>
  )
}
