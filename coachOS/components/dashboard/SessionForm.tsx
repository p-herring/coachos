'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
  session_type: z.enum(['swim', 'bike', 'run', 'strength', 'conditioning', 'mobility', 'rest', 'other']),
  duration_minutes: z.number().int().min(1).optional(),
  intensity: z.enum(['easy', 'moderate', 'hard', 'race']).optional(),
  notes: z.string().optional(),
  coach_notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface SessionFormProps {
  clientId: string
  weeklyPlanId: string
  defaultDate?: string
  sessionId?: string
  defaultValues?: Partial<FormValues>
  onSuccess: () => void
  onCancel: () => void
}

const SESSION_TYPES = [
  { value: 'swim', label: 'Swim' },
  { value: 'bike', label: 'Bike' },
  { value: 'run', label: 'Run' },
  { value: 'strength', label: 'Strength' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'rest', label: 'Rest day' },
  { value: 'other', label: 'Other' },
]

export function SessionForm({ clientId, weeklyPlanId, defaultDate, sessionId, defaultValues, onSuccess, onCancel }: SessionFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(sessionId)

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      session_type: 'other',
      session_date: defaultDate ?? '',
      ...defaultValues,
    },
  })

  async function onSubmit(values: FormValues) {
    setSaving(true)
    setError(null)
    try {
      const url = isEdit
        ? '/api/internal/sessions/update'
        : '/api/internal/sessions/create'

      const body = isEdit
        ? { session_id: sessionId, ...values }
        : { client_id: clientId, weekly_plan_id: weeklyPlanId, ...values }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save session')
        return
      }
      onSuccess()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Session name *</Label>
          <Input id="name" {...register('name')} placeholder="Morning run" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="session_date">Date *</Label>
          <Input id="session_date" type="date" {...register('session_date')} />
          {errors.session_date && <p className="text-xs text-destructive">{errors.session_date.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Controller
            name="session_type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="duration_minutes">Duration (mins)</Label>
          <Input
            id="duration_minutes"
            type="number"
            min={1}
            {...register('duration_minutes', {
              setValueAs: (v: string) => v === '' || v === undefined ? undefined : parseInt(v, 10),
            })}
            placeholder="60"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Intensity</Label>
          <Controller
            name="intensity"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="race">Race</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="notes">Session notes (visible to client)</Label>
          <Textarea id="notes" {...register('notes')} placeholder="Workout description…" rows={3} />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="coach_notes">Coach notes (private)</Label>
          <Textarea id="coach_notes" {...register('coach_notes')} placeholder="Your internal notes…" rows={2} />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Add session'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
