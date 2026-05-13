// app/(dashboard)/page.tsx
//
// Dashboard home — quick overview of what needs attention today.
// Server component: all data fetched at render time.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Users, CalendarDays, MessageSquare, Bot, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const coachId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  // ── Fetch dashboard data ─────────────────────────────────────────────────

  const [
    { count: activeClients },
    { data: overdueCheckins },
    { data: recentCheckins },
    { data: draftPlans },
    { count: scheduledPosts },
    { data: upcomingPosts },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId).eq('status', 'active'),

    supabase.from('clients').select('id, full_name, next_checkin_date')
      .eq('coach_id', coachId).eq('status', 'active')
      .lt('next_checkin_date', today).order('next_checkin_date').limit(5),

    supabase.from('checkins').select('id, client_id, submitted_at, coach_response, clients(full_name)')
      .eq('coach_id', coachId).is('coach_response', null)
      .order('submitted_at', { ascending: false }).limit(5),

    supabase.from('weekly_plans').select('id, client_id, week_start, clients(full_name)')
      .eq('coach_id', coachId).eq('status', 'draft')
      .order('week_start').limit(5),

    supabase.from('posts').select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId).eq('status', 'scheduled'),

    supabase.from('posts').select('id, title, platforms, scheduled_at, status')
      .eq('coach_id', coachId).eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at').limit(3),
  ])

  const overdueCount          = overdueCheckins?.length ?? 0
  const unansweredCheckinCount = recentCheckins?.length ?? 0
  const draftPlanCount        = draftPlans?.length ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-AU', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Australia/Perth',
          })}
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Clients"
          value={activeClients ?? 0}
          icon={Users}
          href="/dashboard/clients?status=active"
          colour="blue"
        />
        <StatCard
          label="Unanswered Check-ins"
          value={unansweredCheckinCount}
          icon={MessageSquare}
          href="/dashboard/clients"
          colour={unansweredCheckinCount > 0 ? "orange" : "green"}
          urgent={unansweredCheckinCount > 0}
        />
        <StatCard
          label="Draft Plans"
          value={draftPlanCount}
          icon={CalendarDays}
          href="/dashboard/planner"
          colour={draftPlanCount > 0 ? "purple" : "green"}
        />
        <StatCard
          label="Scheduled Posts"
          value={scheduledPosts ?? 0}
          icon={Clock}
          href="/dashboard/content"
          colour="blue"
        />
      </div>

      {/* ── Action items ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Overdue check-ins */}
        {overdueCount > 0 && (
          <ActionCard
            title="Overdue Check-ins"
            subtitle={`${overdueCount} client${overdueCount > 1 ? 's' : ''} haven't checked in`}
            icon={AlertCircle}
            iconColour="text-orange-500"
            items={(overdueCheckins ?? []).map(c => ({
              label: c.full_name,
              sublabel: `Due: ${new Date(c.next_checkin_date!).toLocaleDateString('en-AU')}`,
              href: `/dashboard/clients/${c.id}`,
            }))}
            ctaLabel="View all clients"
            ctaHref="/dashboard/clients"
          />
        )}

        {/* Unanswered check-ins */}
        {unansweredCheckinCount > 0 && (
          <ActionCard
            title="Check-ins Awaiting Response"
            subtitle={`${unansweredCheckinCount} submission${unansweredCheckinCount > 1 ? 's' : ''} to review`}
            icon={MessageSquare}
            iconColour="text-brand-blue"
            items={(recentCheckins ?? []).map(c => ({
              label: (c.clients as { full_name: string })?.full_name ?? 'Unknown',
              sublabel: `Submitted ${new Date(c.submitted_at).toLocaleDateString('en-AU')}`,
              href: `/dashboard/clients/${c.client_id}/checkins`,
            }))}
            ctaLabel="View all"
            ctaHref="/dashboard/clients"
          />
        )}

        {/* Draft plans */}
        {draftPlanCount > 0 && (
          <ActionCard
            title="Plans Ready to Publish"
            subtitle={`${draftPlanCount} draft plan${draftPlanCount > 1 ? 's' : ''} not yet live`}
            icon={CalendarDays}
            iconColour="text-brand-purple"
            items={(draftPlans ?? []).map(p => ({
              label: (p.clients as { full_name: string })?.full_name ?? 'Unknown',
              sublabel: `Week of ${new Date(p.week_start).toLocaleDateString('en-AU')}`,
              href: `/dashboard/planner/${p.client_id}`,
            }))}
            ctaLabel="Open planner"
            ctaHref="/dashboard/planner"
          />
        )}

        {/* Upcoming posts */}
        {(upcomingPosts?.length ?? 0) > 0 && (
          <ActionCard
            title="Upcoming Posts"
            subtitle="Scheduled for publishing"
            icon={Clock}
            iconColour="text-green-500"
            items={(upcomingPosts ?? []).map(p => ({
              label: p.title ?? 'Untitled post',
              sublabel: `${(p.platforms as string[]).join(', ')} · ${new Date(p.scheduled_at!).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Australia/Perth' })}`,
              href: `/dashboard/content/post/${p.id}`,
            }))}
            ctaLabel="Content calendar"
            ctaHref="/dashboard/content"
          />
        )}

        {/* All clear — shown when nothing needs attention */}
        {overdueCount === 0 && unansweredCheckinCount === 0 && draftPlanCount === 0 && (
          <div className="lg:col-span-2 flex items-center gap-4 p-6 rounded-xl border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">All clear — nothing urgent today</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">All check-ins answered, all plans published.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Command Centre access ─────────────────────────────────── */}
      <div className="rounded-xl border bg-gradient-to-r from-brand-blue/5 to-brand-purple/5 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
          <Bot className="w-6 h-6 text-brand-blue" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Command Centre</p>
          <p className="text-sm text-muted-foreground mt-0.5">Tell Claude what needs doing — build plans, draft responses, create content.</p>
        </div>
        <Link
          href="/dashboard/command"
          className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition shrink-0"
        >
          Open
        </Link>
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, href, colour, urgent,
}: {
  label: string
  value: number
  icon: React.ElementType
  href: string
  colour: 'blue' | 'green' | 'orange' | 'purple'
  urgent?: boolean
}) {
  const colours = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
  }

  return (
    <Link href={href} className="block rounded-xl border bg-card p-5 hover:border-brand-blue/50 transition group">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colours[colour]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={`text-2xl font-bold ${urgent ? 'text-orange-500' : ''}`}>{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
    </Link>
  )
}

// ─── ActionCard ───────────────────────────────────────────────────────────────

function ActionCard({
  title, subtitle, icon: Icon, iconColour, items, ctaLabel, ctaHref,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  iconColour: string
  items: Array<{ label: string; sublabel: string; href: string }>
  ctaLabel: string
  ctaHref: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${iconColour}`} />
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <Link href={item.href} className="flex items-center justify-between group py-1">
              <div>
                <p className="text-sm font-medium group-hover:text-brand-blue transition">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sublabel}</p>
              </div>
              <ChevronRightIcon />
            </Link>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} className="text-xs text-brand-blue hover:underline">{ctaLabel} →</Link>
    </div>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
