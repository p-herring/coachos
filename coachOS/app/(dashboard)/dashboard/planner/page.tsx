import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CalendarDays, ChevronRight, Plus } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default async function PlannerPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const coachId = session.user.id
  const thisWeek = getMondayOfWeek(new Date())

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, client_type, status')
    .eq('coach_id', coachId)
    .in('status', ['active', 'trial'])
    .order('full_name')

  const activeClients = clients ?? []

  // Fetch current week plans for all active clients
  const planMap = new Map<string, { status: string; week_start: string }>()
  if (activeClients.length > 0) {
    const { data: plans } = await supabase
      .from('weekly_plans')
      .select('client_id, status, week_start')
      .eq('coach_id', coachId)
      .eq('week_start', thisWeek)
      .in('client_id', activeClients.map(c => c.id))

    for (const p of plans ?? []) {
      planMap.set(p.client_id, p)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Week of {new Date(thisWeek + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {activeClients.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="font-medium">No active clients</p>
          <p className="text-sm text-muted-foreground">Add active clients to start planning their weeks.</p>
          <Link href="/dashboard/clients/new" className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline">
            <Plus className="w-3.5 h-3.5" />
            Add client
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">This week</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {activeClients.map(client => {
                const plan = planMap.get(client.id)
                return (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-muted/20 transition">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/planner/${client.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-brand-purple">
                            {client.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium group-hover:text-brand-blue transition">{client.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-3">
                      {plan ? (
                        <StatusBadge status={plan.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground/60">No plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/planner/${client.id}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition inline-flex"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
