'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, addWeeks, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Pencil, Trash2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionForm } from '@/components/dashboard/SessionForm'

interface Session {
  id: string
  name: string
  session_date: string
  session_type: string
  duration_minutes: number | null
  intensity: string | null
  notes: string | null
  coach_notes: string | null
  completed: boolean
}

interface Plan {
  id: string
  status: string
  week_start: string
  week_end: string
  coach_notes: string | null
}

interface WeekPlannerViewProps {
  clientId: string
  clientName: string
  initialPlan: Plan | null
  initialSessions: Session[]
  initialWeekStart: string
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  swim: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  bike: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  run: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  strength: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  conditioning: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  mobility: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rest: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  other: 'bg-muted text-muted-foreground',
}

function getMondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function WeekPlannerView({ clientId, clientName, initialPlan, initialSessions, initialWeekStart }: WeekPlannerViewProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState<Date>(parseISO(initialWeekStart))
  const [plan, setPlan] = useState<Plan | null>(initialPlan)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [addingForDate, setAddingForDate] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const fetchWeek = useCallback(async (ws: Date) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/plans/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, week_start: format(ws, 'yyyy-MM-dd') }),
      })
      const data = await res.json()
      if (res.ok) {
        setPlan(data.plan)
        setSessions(data.sessions ?? [])
      }
    } catch {
      setError('Failed to load week')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Only re-fetch when week changes (not on initial render, since we have initialData)
    if (weekStartStr !== initialWeekStart) {
      fetchWeek(weekStart)
    }
  }, [weekStartStr, initialWeekStart, weekStart, fetchWeek])

  async function createPlan() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, week_start: weekStartStr }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create plan'); return }
      setPlan(data.plan)
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function publishPlan() {
    if (!plan) return
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/plans/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to publish'); return }
      setPlan(data.plan)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setPublishing(false)
    }
  }

  async function deleteSession(sessionId: string) {
    const res = await fetch('/api/internal/sessions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    }
  }

  function onSessionSaved() {
    setAddingForDate(null)
    setEditingSession(null)
    fetchWeek(weekStart)
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setWeekStart(prev => subWeeks(prev, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-medium">
          {format(weekStart, 'dd MMM')} – {format(addDays(weekStart, 6), 'dd MMM yyyy')}
        </div>
        <button
          onClick={() => setWeekStart(prev => addWeeks(prev, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <Button
          variant="outline"
          size="sm"
          className="ml-2 text-xs h-7"
          onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
        >
          This week
        </Button>

        <div className="flex-1" />

        {plan ? (
          <div className="flex items-center gap-2">
            {plan.status === 'published' ? (
              <span className="flex items-center gap-1.5 text-xs text-brand-green font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Published
              </span>
            ) : (
              <Button
                size="sm"
                onClick={publishPlan}
                disabled={publishing || sessions.length === 0}
                className="gap-1.5 bg-brand-green hover:bg-brand-green/90 text-white"
              >
                <Globe className="w-3.5 h-3.5" />
                {publishing ? 'Publishing…' : 'Publish plan'}
              </Button>
            )}
          </div>
        ) : !loading && (
          <Button size="sm" variant="outline" onClick={createPlan} disabled={creating} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'Create plan'}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && <div className="text-sm text-muted-foreground py-4">Loading…</div>}

      {/* Week grid */}
      {!loading && (
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySessions = sessions.filter(s => s.session_date === dateStr)
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

            return (
              <div
                key={dateStr}
                className={`rounded-xl border p-3 min-h-[140px] flex flex-col gap-2 ${
                  isToday ? 'border-brand-blue/50 bg-brand-blue/5' : 'bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-sm font-bold ${isToday ? 'text-brand-blue' : ''}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  {plan && plan.status !== 'published' && (
                    <button
                      onClick={() => setAddingForDate(dateStr)}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      title="Add session"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {daySessions.map(s => (
                  <div
                    key={s.id}
                    className={`rounded-lg px-2 py-1.5 text-xs ${SESSION_TYPE_COLORS[s.session_type] ?? SESSION_TYPE_COLORS.other}`}
                  >
                    <div className="font-medium truncate">{s.name}</div>
                    {s.duration_minutes && (
                      <div className="opacity-70 mt-0.5">{s.duration_minutes}min{s.intensity ? ` · ${s.intensity}` : ''}</div>
                    )}
                    {plan?.status !== 'published' && (
                      <div className="flex gap-1 mt-1.5">
                        <button
                          onClick={() => setEditingSession(s)}
                          className="p-0.5 rounded hover:bg-black/10 transition"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="p-0.5 rounded hover:bg-black/10 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {s.completed && (
                      <CheckCircle2 className="w-3 h-3 mt-1 opacity-70" />
                    )}
                  </div>
                ))}

                {daySessions.length === 0 && !plan && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/50">—</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Session form dialog */}
      {(addingForDate || editingSession) && plan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-lg p-6">
            <h3 className="font-semibold mb-4">
              {editingSession ? 'Edit session' : `Add session — ${format(parseISO(addingForDate!), 'EEE d MMM')}`}
            </h3>
            <SessionForm
              clientId={clientId}
              weeklyPlanId={plan.id}
              defaultDate={addingForDate ?? editingSession?.session_date}
              sessionId={editingSession?.id}
              defaultValues={editingSession ? {
                name: editingSession.name,
                session_date: editingSession.session_date,
                session_type: editingSession.session_type as 'swim' | 'bike' | 'run' | 'strength' | 'conditioning' | 'mobility' | 'rest' | 'other',
                duration_minutes: editingSession.duration_minutes ?? undefined,
                intensity: editingSession.intensity as 'easy' | 'moderate' | 'hard' | 'race' | undefined,
                notes: editingSession.notes ?? undefined,
                coach_notes: editingSession.coach_notes ?? undefined,
              } : undefined}
              onSuccess={onSessionSaved}
              onCancel={() => { setAddingForDate(null); setEditingSession(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
