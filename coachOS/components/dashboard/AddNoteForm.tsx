'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'billing', label: 'Billing' },
  { value: 'flag', label: 'Flag' },
]

export function AddNoteForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/internal/clients/notes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, note: note.trim(), note_type: noteType }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add note')
        return
      }
      setNote('')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="flex-1 resize-none"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={saving || !note.trim()}>
        {saving ? 'Adding…' : 'Add note'}
      </Button>
    </form>
  )
}
