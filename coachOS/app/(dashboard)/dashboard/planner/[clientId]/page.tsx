import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { WeekPlannerView } from '@/components/dashboard/WeekPlannerView'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default async function ClientPlannerPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const coachId = session.user.id
  const thisWeek = getMondayOfWeek(new Date())

  const [{ data: client }, { data: plan }, planSessionsResult] = await Promise.all([
    supabase.from('clients').select('id, full_name, status, health_notes').eq('id', clientId).eq('coach_id', coachId).single(),
    supabase.from('weekly_plans').select('*').eq('client_id', clientId).eq('coach_id', coachId).eq('week_start', thisWeek).maybeSingle(),
    supabase.from('sessions').select('*').eq('client_id', clientId).eq('coach_id', coachId).gte('session_date', thisWeek).lte('session_date', new Date(new Date(thisWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('session_date'),
  ])

  if (!client) notFound()

  const sessions = plan ? (planSessionsResult.data ?? []).filter(s => s.weekly_plan_id === plan.id) : []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/dashboard/planner"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Planner
        </Link>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{client.full_name}</h1>
              <StatusBadge status={client.status} />
            </div>
            {client.health_notes && (
              <p className="text-sm text-brand-orange mt-0.5">⚠ {client.health_notes}</p>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              View profile →
            </Link>
          </div>
        </div>
      </div>

      <WeekPlannerView
        clientId={client.id}
        clientName={client.full_name}
        initialPlan={plan ?? null}
        initialSessions={sessions as Parameters<typeof WeekPlannerView>[0]['initialSessions']}
        initialWeekStart={thisWeek}
      />
    </div>
  )
}
