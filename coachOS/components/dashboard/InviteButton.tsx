'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

interface Props {
  clientId: string
}

export function InviteButton({ clientId }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleInvite() {
    if (!confirm('Send portal invite to this client?')) return
    setStatus('loading')
    const res = await fetch('/api/internal/clients/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setStatus('error')
      setMessage(json.error ?? 'Failed to send invite')
    } else {
      setStatus('sent')
      setMessage(json.message ?? 'Invite sent')
    }
  }

  if (status === 'sent') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-brand-green font-medium">
        <Mail className="w-4 h-4" />
        Invite sent
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleInvite}
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition disabled:opacity-60"
      >
        <Mail className="w-4 h-4" />
        <span className="hidden sm:inline">Invite to portal</span>
      </button>
      {status === 'error' && message && (
        <p className="text-xs text-red-500">{message}</p>
      )}
    </div>
  )
}
