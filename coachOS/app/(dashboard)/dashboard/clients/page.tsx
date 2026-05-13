import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Plus, ChevronRight, MessageSquare, CalendarDays, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ClientTypeBadge } from '@/components/shared/ClientTypeBadge'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'lead', label: 'Leads' },
  { value: 'paused', label: 'Paused' },
  { value: 'alumni', label: 'Alumni' },
]

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const status = STATUS_TABS.find(t => t.value === rawStatus)?.value ?? 'all'

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const coachId = user.id
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('clients')
    .select('id, full_name, email, client_type, status, billing_status, next_checkin_date, health_notes, portal_user_id')
    .eq('coach_id', coachId)
    .order('full_name')

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: clients } = await query
  const rows = clients ?? []

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} {status === 'all' ? 'total' : status}</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition"
        >
          <Plus className="w-4 h-4" />
          Add client
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/dashboard/clients' : `/dashboard/clients?status=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              status === tab.value
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No clients yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first client to get started.</p>
          <Link
            href="/dashboard/clients/new"
            className="mt-4 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition"
          >
            Add client
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Billing</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Next check-in</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((client, i) => {
                const isOverdue = client.next_checkin_date && client.next_checkin_date < today && client.status === 'active'
                return (
                  <tr key={client.id} className={`border-b last:border-0 hover:bg-muted/20 transition ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/clients/${client.id}`} className="group flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-brand-blue">
                            {client.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-brand-blue transition">
                            {client.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{client.email}</div>
                        </div>
                        {client.health_notes && (
                          <span title="Health notes present">
                            <AlertTriangle className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <ClientTypeBadge type={client.client_type as 'general' | 'triathlon' | 'mixed'} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <StatusBadge status={client.billing_status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {client.next_checkin_date ? (
                        <span className={isOverdue ? 'text-brand-orange font-medium' : 'text-muted-foreground'}>
                          {isOverdue && '⚠ '}
                          {new Date(client.next_checkin_date + 'T00:00:00').toLocaleDateString('en-AU')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/dashboard/clients/${client.id}/checkins`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                          title="Check-ins"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/planner/${client.id}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                          title="Planner"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                          title="Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
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
