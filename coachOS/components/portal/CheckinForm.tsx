'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

function ScorePicker({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-bold text-brand-blue">{value}/5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition border-2 ${
              value === n
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-card border-border text-muted-foreground hover:border-brand-blue/50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

export function CheckinForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(3)
  const [stress, setStress] = useState(3)
  const [nutrition, setNutrition] = useState(3)
  const [notes, setNotes] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      energy, sleep, stress, nutrition,
    }
    if (notes.trim()) payload.notes = notes.trim()
    if (weightKg) {
      const w = parseFloat(weightKg)
      if (!isNaN(w) && w > 0) payload.weight_kg = w
    }

    try {
      const res = await fetch('/api/portal/checkins/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit check-in')
        return
      }
      router.push('/portal?submitted=1')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ScorePicker label="Energy levels" value={energy} onChange={setEnergy} lowLabel="Exhausted" highLabel="Energised" />
      <ScorePicker label="Sleep quality" value={sleep} onChange={setSleep} lowLabel="Terrible" highLabel="Great" />
      <ScorePicker label="Stress levels" value={stress} onChange={setStress} lowLabel="Very stressed" highLabel="Chilled" />
      <ScorePicker label="Nutrition" value={nutrition} onChange={setNutrition} lowLabel="Off track" highLabel="On point" />

      <div className="space-y-1.5">
        <Label htmlFor="weight">Weight (optional)</Label>
        <div className="relative">
          <Input
            id="weight"
            type="number"
            step="0.1"
            min="0"
            max="500"
            value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
            placeholder="75.0"
            className="pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">How&apos;s everything going?</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any wins, struggles, things you want Pete to know about…"
          rows={4}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Submitting…' : 'Submit check-in'}
      </Button>
    </form>
  )
}
