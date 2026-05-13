'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
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
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  client_type: z.enum(['general', 'triathlon', 'mixed']),
  status: z.enum(['lead', 'trial', 'active', 'paused', 'alumni']),
  billing_model: z.enum(['trial', 'subscription', 'one_time', 'retainer']),
  billing_status: z.enum(['pending', 'active', 'overdue', 'cancelled']),
  billing_notes: z.string().optional(),
  health_notes: z.string().optional(),
  goals_raw: z.string().optional(),
  checkin_cadence: z.enum(['weekly', 'fortnightly']),
  next_checkin_date: z.string().optional(),
  tp_username: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ClientFormProps {
  defaultValues?: Partial<FormValues & { goals: string[] }>
  clientId?: string
}

export function ClientForm({ defaultValues, clientId }: ClientFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(clientId)

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_type: 'general',
      status: 'lead',
      billing_model: 'retainer',
      billing_status: 'pending',
      checkin_cadence: 'weekly',
      ...defaultValues,
      goals_raw: defaultValues?.goals?.join('\n') ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    setSaving(true)
    setError(null)

    const goals = values.goals_raw
      ? values.goals_raw.split('\n').map(g => g.trim()).filter(Boolean)
      : []

    const { goals_raw: _, ...rest } = values
    const payload = { ...rest, goals }

    const url = isEdit ? '/api/internal/clients/update' : '/api/internal/clients/create'
    const body = isEdit ? { client_id: clientId, ...payload } : payload

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      router.push(`/dashboard/clients/${data.client.id}`)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

      {/* Personal info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Personal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name *</Label>
            <Input id="full_name" {...register('full_name')} placeholder="Jane Smith" />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} placeholder="jane@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} placeholder="+61 400 000 000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
          </div>
        </div>
      </section>

      {/* Coaching */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Coaching</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Client type</Label>
            <Controller
              name="client_type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General fitness</SelectItem>
                    <SelectItem value="triathlon">Triathlon / endurance</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Check-in cadence</Label>
            <Controller
              name="checkin_cadence"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next_checkin_date">Next check-in date</Label>
            <Input id="next_checkin_date" type="date" {...register('next_checkin_date')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="health_notes">
            Health notes <span className="text-brand-orange text-xs font-normal">(injuries, conditions — shown prominently everywhere)</span>
          </Label>
          <Textarea
            id="health_notes"
            {...register('health_notes')}
            placeholder="e.g. Left knee injury — avoid high-impact loading. History of lower back pain."
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goals_raw">Goals <span className="text-xs text-muted-foreground font-normal">(one per line)</span></Label>
          <Textarea
            id="goals_raw"
            {...register('goals_raw')}
            placeholder={"Complete first Ironman 70.3\nLose 10kg by December\nImprove run pace"}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tp_username">TrainingPeaks username</Label>
          <Input id="tp_username" {...register('tp_username')} placeholder="janesmith_tp" />
        </div>
      </section>

      {/* Billing */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Billing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Billing model</Label>
            <Controller
              name="billing_model"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retainer">Monthly retainer</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Billing status</Label>
            <Controller
              name="billing_status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billing_notes">Billing notes</Label>
          <Textarea id="billing_notes" {...register('billing_notes')} placeholder="e.g. Pays via bank transfer on 1st of month" rows={2} />
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add client'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
