import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { CheckinResponseForm } from '@/components/dashboard/CheckinResponseForm'

function ScoreBlock({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  const pct = (value / 5) * 100
  const colour = pct >= 60 ? 'text-green-600 dark:text-green-400' : pct >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${colour}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default async function ClientCheckinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const coachId = user.id

  const [{ data: client }, { data: checkins }] = await Promise.all([
    supabase.from('clients').select('id, full_name, status').eq('id', id).eq('coach_id', coachId).single(),
    supabase.from('checkins').select('*').eq('client_id', id).eq('coach_id', coachId).order('submitted_at', { ascending: false }),
  ])

  if (!client) notFound()

  const all = checkins ?? []
  const unanswered = all.filter(c => !c.coach_response)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="space-y-1">
        <Link
          href={`/dashboard/clients/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="w-4 h-4" />
          {client.full_name}
        </Link>
        <h1 className="text-2xl font-bold">Check-ins</h1>
        {unanswered.length > 0 && (
          <p className="text-sm text-brand-orange font-medium">
            {unanswered.length} unanswered
          </p>
        )}
      </div>

      {all.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No check-ins yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {all.map(checkin => (
            <div
              key={checkin.id}
              className={`rounded-xl border bg-card p-5 space-y-4 ${!checkin.coach_response ? 'border-brand-orange/30' : ''}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {new Date(checkin.submitted_at).toLocaleDateString('en-AU', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      timeZone: 'Australia/Perth',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(checkin.submitted_at).toLocaleTimeString('en-AU', {
                      hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Perth',
                    })}
                  </p>
                </div>
                {!checkin.coach_response ? (
                  <span className="text-xs px-2 py-1 rounded-lg bg-brand-orange/10 text-brand-orange font-medium">
                    Needs response
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-lg bg-brand-green/10 text-brand-green font-medium">
                    Responded
                  </span>
                )}
              </div>

              {/* Scores */}
              <div className="flex gap-6 py-3 border-y">
                <ScoreBlock label="Energy" value={checkin.energy} />
                <ScoreBlock label="Sleep" value={checkin.sleep} />
                <ScoreBlock label="Stress" value={checkin.stress} />
                <ScoreBlock label="Nutrition" value={checkin.nutrition} />
                {checkin.weight_kg !== null && (
                  <div className="text-center">
                    <div className="text-lg font-bold">{checkin.weight_kg}kg</div>
                    <div className="text-xs text-muted-foreground">Weight</div>
                  </div>
                )}
              </div>

              {/* Client notes */}
              {checkin.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Client notes</p>
                  <p className="text-sm whitespace-pre-wrap">{checkin.notes}</p>
                </div>
              )}

              {/* Response form */}
              <CheckinResponseForm
                checkinId={checkin.id}
                existingDraft={checkin.ai_draft}
                existingResponse={checkin.coach_response}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
