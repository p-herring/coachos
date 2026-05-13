import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ChevronLeft, CalendarDays, MessageSquare, Pencil, AlertTriangle, Phone, Mail } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ClientTypeBadge } from '@/components/shared/ClientTypeBadge'
import { AddNoteForm } from '@/components/dashboard/AddNoteForm'
import { InviteButton } from '@/components/dashboard/InviteButton'

const NOTE_TYPE_LABELS: Record<string, string> = {
  general: 'Note',
  call: 'Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  billing: 'Billing',
  flag: 'Flag',
}

function ScoreBar({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-muted-foreground/50 text-xs">—</span>
  const pct = (value / max) * 100
  const colour = pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium">{value}/{max}</span>
    </div>
  )
}

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const coachId = user.id

  const [{ data: client }, { data: recentCheckins }, { data: notes }, { data: activePlan }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('coach_id', coachId).single(),
    supabase.from('checkins').select('*').eq('client_id', id).eq('coach_id', coachId).order('submitted_at', { ascending: false }).limit(5),
    supabase.from('client_notes').select('*').eq('client_id', id).eq('coach_id', coachId).order('created_at', { ascending: false }).limit(10),
    supabase.from('weekly_plans').select('*').eq('client_id', id).eq('coach_id', coachId).in('status', ['draft', 'published']).gte('week_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('week_start', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!client) notFound()

  const unansweredCount = (recentCheckins ?? []).filter(c => !c.coach_response).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <Link
        href="/dashboard/clients"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-brand-blue">
              {client.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={client.status} />
              <ClientTypeBadge type={client.client_type as 'general' | 'triathlon' | 'mixed'} />
              {client.portal_user_id && (
                <span className="text-xs text-brand-green font-medium">Portal active</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!client.portal_user_id && <InviteButton clientId={client.id} />}
          <Link
            href={`/dashboard/planner/${client.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition"
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Planner</span>
          </Link>
          <Link
            href={`/dashboard/clients/${client.id}/checkins`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition relative ${unansweredCount > 0 ? 'border-brand-orange/50' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Check-ins</span>
            {unansweredCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-orange text-white text-[10px] flex items-center justify-center font-bold">
                {unansweredCount}
              </span>
            )}
          </Link>
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
        </div>
      </div>

      {/* Health notes alert */}
      {client.health_notes && (
        <div className="flex gap-3 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-4">
          <AlertTriangle className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-orange">Health notes</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{client.health_notes}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: profile details */}
        <div className="space-y-4">

          {/* Contact */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Contact</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {client.phone}
                </div>
              )}
            </div>
          </div>

          {/* Key stats */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billing</dt>
                <dd><StatusBadge status={client.billing_status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-medium capitalize">{client.billing_model.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Check-ins</dt>
                <dd className="font-medium capitalize">{client.checkin_cadence}</dd>
              </div>
              {client.next_checkin_date && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Next due</dt>
                  <dd className="font-medium">
                    {new Date(client.next_checkin_date + 'T00:00:00').toLocaleDateString('en-AU')}
                  </dd>
                </div>
              )}
              {client.date_of_birth && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">DOB</dt>
                  <dd className="font-medium">
                    {new Date(client.date_of_birth + 'T00:00:00').toLocaleDateString('en-AU')}
                  </dd>
                </div>
              )}
              {client.tp_username && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">TrainingPeaks</dt>
                  <dd className="font-mono text-xs">{client.tp_username}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Goals */}
          {client.goals && client.goals.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">Goals</h2>
              <ul className="space-y-1.5">
                {client.goals.map((g: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-4 h-4 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current plan */}
          {activePlan && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Current plan</h2>
                <StatusBadge status={activePlan.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Week of {new Date(activePlan.week_start + 'T00:00:00').toLocaleDateString('en-AU')}
              </p>
              <Link
                href={`/dashboard/planner/${client.id}`}
                className="text-xs text-brand-blue hover:underline"
              >
                Open planner →
              </Link>
            </div>
          )}
        </div>

        {/* Right column: checkins + notes */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent check-ins */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent check-ins</h2>
              <Link
                href={`/dashboard/clients/${client.id}/checkins`}
                className="text-xs text-brand-blue hover:underline"
              >
                View all →
              </Link>
            </div>
            {(recentCheckins ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <div className="space-y-3">
                {(recentCheckins ?? []).map(c => (
                  <div key={c.id} className="flex items-start justify-between gap-4 pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {new Date(c.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                        {!c.coach_response && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange font-medium">
                            Unanswered
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {c.energy !== null && <span className="text-xs text-muted-foreground">Energy {c.energy}/5</span>}
                        {c.sleep !== null && <span className="text-xs text-muted-foreground">Sleep {c.sleep}/5</span>}
                        {c.stress !== null && <span className="text-xs text-muted-foreground">Stress {c.stress}/5</span>}
                        {c.weight_kg !== null && <span className="text-xs text-muted-foreground">{c.weight_kg}kg</span>}
                      </div>
                      {c.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{c.notes}</p>}
                    </div>
                    <Link
                      href={`/dashboard/clients/${client.id}/checkins`}
                      className="text-xs text-brand-blue hover:underline shrink-0"
                    >
                      {c.coach_response ? 'Responded' : 'Respond →'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Communication log */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold">Notes</h2>
            <AddNoteForm clientId={client.id} />
            {(notes ?? []).length > 0 && (
              <div className="space-y-3 pt-2">
                {(notes ?? []).map(n => (
                  <div key={n.id} className="flex items-start gap-3 text-sm pb-3 border-b last:border-0 last:pb-0">
                    <span className={`mt-0.5 text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                      n.note_type === 'flag' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      n.note_type === 'billing' ? 'bg-brand-orange/10 text-brand-orange' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {NOTE_TYPE_LABELS[n.note_type] ?? n.note_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                          timeZone: 'Australia/Perth',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
