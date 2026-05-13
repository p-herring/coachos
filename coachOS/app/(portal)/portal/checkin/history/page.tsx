import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'

function ScoreBlock({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  const pct = (value / 5) * 100
  const colour = pct >= 60 ? 'text-green-600 dark:text-green-400' : pct >= 40 ? 'text-yellow-500' : 'text-red-500'
  return (
    <div className="text-center">
      <div className={`text-base font-bold ${colour}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default async function PortalCheckinHistoryPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <p className="text-muted-foreground">Not yet configured.</p>
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id')
    .eq('portal_user_id', session.user.id)
    .single()

  if (!client) redirect('/portal/not-linked')

  const { data: checkins } = await service
    .from('checkins')
    .select('*')
    .eq('client_id', client.id)
    .order('submitted_at', { ascending: false })

  const all = checkins ?? []

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/portal" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="w-4 h-4" />
          Home
        </Link>
        <h1 className="text-2xl font-bold">Check-in history</h1>
        <p className="text-muted-foreground mt-1">{all.length} check-ins total</p>
      </div>

      {all.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No check-ins yet.</p>
          <Link href="/portal/checkin" className="mt-3 inline-block text-sm text-brand-blue hover:underline">
            Submit your first check-in
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map(c => (
            <div key={c.id} className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  {new Date(c.submitted_at).toLocaleDateString('en-AU', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
                {c.coach_response ? (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-brand-green/10 text-brand-green font-medium">Responded</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-medium">Pending</span>
                )}
              </div>

              <div className="flex gap-4">
                <ScoreBlock label="Energy" value={c.energy} />
                <ScoreBlock label="Sleep" value={c.sleep} />
                <ScoreBlock label="Stress" value={c.stress} />
                <ScoreBlock label="Nutrition" value={c.nutrition} />
                {c.weight_kg !== null && (
                  <div className="text-center">
                    <div className="text-base font-bold">{c.weight_kg}</div>
                    <div className="text-xs text-muted-foreground">kg</div>
                  </div>
                )}
              </div>

              {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}

              {c.coach_response && (
                <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/20 p-3">
                  <p className="text-xs font-medium text-brand-blue mb-1">Coach response</p>
                  <p className="text-sm">{c.coach_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
