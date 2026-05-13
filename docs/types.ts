// types/client.ts
// All client-related TypeScript types.
// Import these everywhere — never use `any` or inline object types.

import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ClientType    = 'general' | 'triathlon' | 'mixed'
export type ClientStatus  = 'lead' | 'trial' | 'active' | 'paused' | 'alumni'
export type BillingModel  = 'trial' | 'subscription' | 'one_time' | 'retainer'
export type BillingStatus = 'pending' | 'active' | 'overdue' | 'cancelled'
export type CheckinCadence = 'weekly' | 'fortnightly'

// ─── Core types ───────────────────────────────────────────────────────────────

export interface Client {
  id:                 string
  coach_id:           string
  full_name:          string
  email:              string
  phone?:             string
  date_of_birth?:     string
  emergency_contact?: EmergencyContact
  client_type:        ClientType
  goals:              string[]
  health_notes?:      string
  tp_username?:       string
  status:             ClientStatus
  billing_model:      BillingModel
  billing_status:     BillingStatus
  billing_notes?:     string
  checkin_cadence:    CheckinCadence
  next_checkin_date?: string
  portal_user_id?:    string
  onboarded_at?:      string
  created_at:         string
  updated_at:         string
}

export interface EmergencyContact {
  name:         string
  phone:        string
  relationship: string
}

// Lightweight version for list views
export interface ClientSummary {
  id:                string
  full_name:         string
  email:             string
  client_type:       ClientType
  status:            ClientStatus
  billing_status:    BillingStatus
  next_checkin_date?: string
  portal_user_id?:   string
  created_at:        string
}

export interface ClientNote {
  id:         string
  coach_id:   string
  client_id:  string
  note:       string
  note_type:  'general' | 'call' | 'email' | 'whatsapp' | 'billing' | 'flag'
  created_at: string
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const emergencyContactSchema = z.object({
  name:         z.string().min(1),
  phone:        z.string().min(1),
  relationship: z.string().min(1),
})

export const newClientSchema = z.object({
  full_name:          z.string().min(2).max(100),
  email:              z.string().email(),
  phone:              z.string().optional(),
  date_of_birth:      z.string().optional(),
  emergency_contact:  emergencyContactSchema.optional(),
  client_type:        z.enum(['general', 'triathlon', 'mixed']),
  goals:              z.array(z.string()).default([]),
  health_notes:       z.string().optional(),
  tp_username:        z.string().optional(),
  billing_model:      z.enum(['trial', 'subscription', 'one_time', 'retainer']),
  billing_status:     z.enum(['pending', 'active', 'overdue', 'cancelled']).default('pending'),
  checkin_cadence:    z.enum(['weekly', 'fortnightly']).default('weekly'),
  onboarded_at:       z.string().optional(),
  send_invite:        z.boolean().default(false),
})

export const updateClientSchema = newClientSchema.partial().omit({ send_invite: true })

export type NewClientInput    = z.infer<typeof newClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>


// ─────────────────────────────────────────────────────────────────────────────
// types/workout.ts
// ─────────────────────────────────────────────────────────────────────────────

export type SessionType = 'swim' | 'bike' | 'run' | 'strength' | 'conditioning' | 'mobility' | 'rest' | 'other'
export type SessionSource = 'trainingpeaks' | 'coachOS' | 'ai_generated'
export type Intensity = 'easy' | 'moderate' | 'hard' | 'race'
export type Equipment = 'gym' | 'home' | 'hotel' | 'minimal'
export type PlanStatus = 'draft' | 'published' | 'archived'

export interface Exercise {
  name:              string
  sets:              number
  reps:              string       // e.g. "8-10", "to failure", "45 seconds"
  duration_seconds?: number
  rest_seconds:      number
  notes?:            string
  video_url?:        string
}

export interface Session {
  id:                string
  coach_id:          string
  client_id:         string
  program_id?:       string
  weekly_plan_id?:   string
  name:              string
  session_date:      string
  session_type:      SessionType
  source:            SessionSource
  duration_minutes?: number
  intensity?:        Intensity
  exercises:         Exercise[]
  tp_workout_id?:    string
  tp_raw?:           Record<string, unknown>
  notes?:            string
  coach_notes?:      string
  completed:         boolean
  completed_at?:     string
  rpe?:              number
  completion_notes?: string
  created_at:        string
  updated_at:        string
}

export interface WeeklyPlan {
  id:            string
  coach_id:      string
  client_id:     string
  week_start:    string
  week_end:      string
  status:        PlanStatus
  coach_notes?:  string
  published_at?: string
  created_at:    string
  updated_at:    string
  sessions?:     Session[]   // populated when fetched with join
}

export interface Template {
  id:               string
  coach_id:         string
  name:             string
  session_type:     'strength' | 'conditioning' | 'mobility' | 'other'
  equipment?:       Equipment
  duration_minutes?: number
  exercises:        Exercise[]
  tags:             string[]
  created_at:       string
  updated_at:       string
}

export interface Checkin {
  id:               string
  client_id:        string
  coach_id:         string
  submitted_at:     string
  energy?:          number
  sleep?:           number
  stress?:          number
  nutrition?:       number
  notes?:           string
  photo_urls:       string[]
  weight_kg?:       number
  ai_draft?:        string
  coach_response?:  string
  responded_at?:    string
}


// ─────────────────────────────────────────────────────────────────────────────
// types/content.ts
// ─────────────────────────────────────────────────────────────────────────────

export type Platform      = 'instagram' | 'tiktok' | 'youtube_shorts'
export type ContentPillar = 'training' | 'client_wins' | 'education' | 'personal_brand'
export type PostStatus    = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'

export interface Post {
  id:                  string
  coach_id:            string
  title?:              string
  caption?:            string
  platforms:           Platform[]
  content_pillar?:     ContentPillar
  asset_urls:          string[]
  status:              PostStatus
  scheduled_at?:       string
  published_at?:       string
  platform_post_ids:   Partial<Record<Platform, string>>
  metrics:             Partial<Record<Platform, PlatformMetrics>>
  metrics_updated_at?: string
  ai_generated:        boolean
  created_at:          string
  updated_at:          string
}

export interface PlatformMetrics {
  // Instagram
  likes?:       number
  reach?:       number
  impressions?: number
  saves?:       number
  comments?:    number
  // TikTok
  views?:       number
  shares?:      number
  // YouTube
  watch_time_seconds?: number
}

export interface AiConversation {
  id:         string
  coach_id:   string
  title?:     string
  messages:   ConversationMessage[]
  context:    ConversationContext
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role:       'user' | 'assistant'
  content:    string
  timestamp:  string
  tool_calls?: Array<{ tool: string; input: unknown; result?: unknown }>
}

export interface ConversationContext {
  client_id?: string
  post_id?:   string
  plan_id?:   string
}
