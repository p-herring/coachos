import { z } from 'zod'

export type ClientType = 'general' | 'triathlon' | 'mixed'
export type ClientStatus = 'lead' | 'trial' | 'active' | 'paused' | 'alumni'
export type BillingModel = 'trial' | 'subscription' | 'one_time' | 'retainer'
export type BillingStatus = 'pending' | 'active' | 'overdue' | 'cancelled'
export type CheckinCadence = 'weekly' | 'fortnightly'

export interface Client {
  id: string
  coach_id: string
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  emergency_contact?: EmergencyContact
  client_type: ClientType
  goals: string[]
  health_notes?: string
  tp_username?: string
  status: ClientStatus
  billing_model: BillingModel
  billing_status: BillingStatus
  billing_notes?: string
  checkin_cadence: CheckinCadence
  next_checkin_date?: string
  portal_user_id?: string
  onboarded_at?: string
  created_at: string
  updated_at: string
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface ClientSummary {
  id: string
  full_name: string
  email: string
  client_type: ClientType
  status: ClientStatus
  billing_status: BillingStatus
  next_checkin_date?: string
  portal_user_id?: string
  created_at: string
}

export interface ClientNote {
  id: string
  coach_id: string
  client_id: string
  note: string
  note_type: 'general' | 'call' | 'email' | 'whatsapp' | 'billing' | 'flag'
  created_at: string
}

export const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
})

export const newClientSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  emergency_contact: emergencyContactSchema.optional(),
  client_type: z.enum(['general', 'triathlon', 'mixed']),
  goals: z.array(z.string()).default([]),
  health_notes: z.string().optional(),
  tp_username: z.string().optional(),
  billing_model: z.enum(['trial', 'subscription', 'one_time', 'retainer']),
  billing_status: z.enum(['pending', 'active', 'overdue', 'cancelled']).default('pending'),
  checkin_cadence: z.enum(['weekly', 'fortnightly']).default('weekly'),
  onboarded_at: z.string().optional(),
  send_invite: z.boolean().default(false),
})

export const updateClientSchema = newClientSchema.partial().omit({ send_invite: true })

export type NewClientInput = z.infer<typeof newClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
