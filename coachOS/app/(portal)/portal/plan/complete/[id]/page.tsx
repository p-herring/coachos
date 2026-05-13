import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { SessionCompleteForm } from '@/components/portal/SessionCompleteForm'

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

export default async function CompleteSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <p className="text-muted-foreground">Portal not yet configured.</p>
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id')
    .eq('portal_user_id', session.user.id)
    .single()

  if (!client) redirect('/portal/not-linked')

  const { data: workout } = await service
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('client_id', client.id)
    .single()

  if (!workout) notFound()

  if (workout.completed) redirect('/portal/plan')

  const colorClass = SESSION_TYPE_COLORS[workout.session_type] ?? SESSION_TYPE_COLORS.other

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href="/portal/plan"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to plan
        </Link>
        <h1 className="text-2xl font-bold">Log session</h1>
      </div>

      {/* Session card */}
      <div className={`rounded-2xl border p-4 ${colorClass}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{workout.name}</p>
            <div className="flex gap-3 mt-1 text-xs opacity-70">
              <span className="capitalize">{workout.session_type}</span>
              {workout.duration_minutes && <span>{workout.duration_minutes}min</span>}
              {workout.intensity && <span className="capitalize">{workout.intensity}</span>}
            </div>
            {workout.notes && (
              <p className="text-sm mt-2 opacity-80 leading-relaxed whitespace-pre-wrap">
                {workout.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      <SessionCompleteForm sessionId={id} />
    </div>
  )
}
