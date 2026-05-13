import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { CheckCircle2 } from 'lucide-react'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  swim: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  bike: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  run: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  strength: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  conditioning: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
  mobility: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  rest: 'bg-muted text-muted-foreground border-border',
  other: 'bg-muted text-muted-foreground border-border',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default async function PortalPlanPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <p className="text-muted-foreground">Portal not yet configured.</p>
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id, full_name')
    .eq('portal_user_id', session.user.id)
    .single()

  if (!client) redirect('/portal/not-linked')

  const thisWeek = getMondayOfWeek(new Date())

  const { data: plan } = await service
    .from('weekly_plans')
    .select('*')
    .eq('client_id', client.id)
    .eq('status', 'published')
    .eq('week_start', thisWeek)
    .maybeSingle()

  if (!plan) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">This week&apos;s plan</h1>
        <div className="rounded-2xl border bg-card p-8 text-center space-y-2">
          <p className="text-muted-foreground">No plan published for this week yet.</p>
          <p className="text-sm text-muted-foreground">Check back later or contact your coach.</p>
        </div>
      </div>
    )
  }

  const { data: sessions } = await service
    .from('sessions')
    .select('*')
    .eq('weekly_plan_id', plan.id)
    .order('session_date')

  const allSessions = sessions ?? []
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">This week&apos;s plan</h1>
        <p className="text-muted-foreground mt-1">
          {new Date(plan.week_start + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} –{' '}
          {new Date(plan.week_end + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {plan.coach_notes && (
        <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/20 p-4 text-sm">
          <p className="font-medium text-brand-blue text-xs uppercase tracking-wide mb-1">Coach notes</p>
          <p className="whitespace-pre-wrap">{plan.coach_notes}</p>
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date(new Date(plan.week_start + 'T00:00:00').getTime() + i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]
          const daySessions = allSessions.filter(s => s.session_date === dateStr)
          const isToday = dateStr === today
          const isPast = dateStr < today

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border p-4 ${isToday ? 'border-brand-blue/50 bg-brand-blue/5' : 'bg-card'} ${isPast ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{DAY_NAMES[i]}</span>
                  <span className="text-sm text-muted-foreground">
                    {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                  {isToday && (
                    <span className="text-xs text-brand-blue font-medium">Today</span>
                  )}
                </div>
              </div>

              {daySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">Rest day</p>
              ) : (
                <div className="space-y-2">
                  {daySessions.map(s => (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-3 ${SESSION_TYPE_COLORS[s.session_type] ?? SESSION_TYPE_COLORS.other}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{s.name}</p>
                            {s.completed && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs opacity-70">
                            {s.duration_minutes && <span>{s.duration_minutes}min</span>}
                            {s.intensity && <span className="capitalize">{s.intensity}</span>}
                          </div>
                          {s.notes && <p className="text-xs mt-2 opacity-80 leading-relaxed">{s.notes}</p>}
                        </div>
                        {!s.completed && (
                          <Link
                            href={`/portal/plan/complete/${s.id}`}
                            className="text-xs font-medium underline shrink-0 mt-0.5"
                          >
                            Done
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
