export type SessionType = 'swim' | 'bike' | 'run' | 'strength' | 'conditioning' | 'mobility' | 'rest' | 'other'
export type SessionSource = 'trainingpeaks' | 'coachOS' | 'ai_generated'
export type Intensity = 'easy' | 'moderate' | 'hard' | 'race'
export type Equipment = 'gym' | 'home' | 'hotel' | 'minimal'
export type PlanStatus = 'draft' | 'published' | 'archived'

export interface Exercise {
  name: string
  sets: number
  reps: string
  duration_seconds?: number
  rest_seconds: number
  notes?: string
  video_url?: string
}

export interface Session {
  id: string
  coach_id: string
  client_id: string
  program_id?: string
  weekly_plan_id?: string
  name: string
  session_date: string
  session_type: SessionType
  source: SessionSource
  duration_minutes?: number
  intensity?: Intensity
  exercises: Exercise[]
  tp_workout_id?: string
  tp_raw?: Record<string, unknown>
  notes?: string
  coach_notes?: string
  completed: boolean
  completed_at?: string
  rpe?: number
  completion_notes?: string
  created_at: string
  updated_at: string
}

export interface WeeklyPlan {
  id: string
  coach_id: string
  client_id: string
  week_start: string
  week_end: string
  status: PlanStatus
  coach_notes?: string
  published_at?: string
  created_at: string
  updated_at: string
  sessions?: Session[]
}

export interface Template {
  id: string
  coach_id: string
  name: string
  session_type: 'strength' | 'conditioning' | 'mobility' | 'other'
  equipment?: Equipment
  duration_minutes?: number
  exercises: Exercise[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Checkin {
  id: string
  client_id: string
  coach_id: string
  submitted_at: string
  energy?: number
  sleep?: number
  stress?: number
  nutrition?: number
  notes?: string
  photo_urls: string[]
  weight_kg?: number
  ai_draft?: string
  coach_response?: string
  responded_at?: string
}
