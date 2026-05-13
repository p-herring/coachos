import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { MessageSquare, CalendarDays, CheckCircle2 } from 'lucide-react'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default async function PortalHomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-muted-foreground">Your portal is being set up. Check back soon.</p>
      </div>
    )
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id, full_name, goals, health_notes, status, checkin_cadence, next_checkin_date')
    .eq('portal_user_id', user.id)
    .single()

  if (!client) redirect('/portal/not-linked')
  if (client.status === 'paused' || client.status === 'alumni') redirect('/portal/inactive')

  const thisWeek = getMondayOfWeek(new Date())
  const today = new Date().toISOString().split('T')[0]

  const [{ data: plan }, { data: recentCheckins }] = await Promise.all([
    service.from('weekly_plans').select('id, status, week_start, week_end').eq('client_id', client.id).eq('status', 'published').eq('week_start', thisWeek).maybeSingle(),
    service.from('checkins').select('id, submitted_at').eq('client_id', client.id).order('submitted_at', { ascending: false }).limit(1),
  ])

  const lastCheckin = recentCheckins?.[0]
  const isOverdue = client.next_checkin_date && client.next_checkin_date <= today
  const checkedInRecently = lastCheckin && new Date(lastCheckin.submitted_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Hey, {client.full_name.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Check-in status */}
      <div className={`rounded-2xl border p-5 space-y-3 ${isOverdue && !checkedInRecently ? 'border-brand-orange/40 bg-brand-orange/5' : 'bg-card'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue && !checkedInRecently ? 'bg-brand-orange/10' : 'bg-green-100 dark:bg-green-900/30'}`}>
            {checkedInRecently
              ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              : <MessageSquare className={`w-5 h-5 ${isOverdue ? 'text-brand-orange' : 'text-muted-foreground'}`} />
            }
          </div>
          <div>
            <p className="font-medium">
              {checkedInRecently ? 'Check-in submitted' : isOverdue ? 'Check-in overdue' : 'Weekly check-in'}
            </p>
            <p className="text-sm text-muted-foreground">
              {checkedInRecently
                ? `Last: ${new Date(lastCheckin!.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                : isOverdue
                ? `Due ${new Date(client.next_checkin_date! + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                : client.next_checkin_date
                ? `Due ${new Date(client.next_checkin_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                : `${client.checkin_cadence}`
              }
            </p>
          </div>
        </div>
        {!checkedInRecently && (
          <Link
            href="/portal/checkin"
            className={`flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-medium transition ${
              isOverdue
                ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                : 'bg-brand-blue text-white hover:bg-brand-blue/90'
            }`}
          >
            Submit check-in
          </Link>
        )}
      </div>

      {/* This week's plan */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-brand-purple" />
          </div>
          <div>
            <p className="font-medium">This week&apos;s plan</p>
            <p className="text-sm text-muted-foreground">
              {new Date(thisWeek + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} –{' '}
              {new Date(new Date(thisWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        {plan ? (
          <Link
            href="/portal/plan"
            className="flex items-center justify-center w-full py-2.5 rounded-xl bg-brand-purple text-white text-sm font-medium hover:bg-brand-purple/90 transition"
          >
            View plan
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">No plan published for this week yet.</p>
        )}
      </div>

      {/* Goals reminder */}
      {client.goals && client.goals.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 space-y-2">
          <p className="text-sm font-semibold">Your goals</p>
          <ul className="space-y-1">
            {client.goals.map((g: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
