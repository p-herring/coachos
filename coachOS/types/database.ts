export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          coach_id: string
          context: Json
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          context?: Json
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          context?: Json
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          ai_draft: string | null
          client_id: string
          coach_id: string
          coach_response: string | null
          energy: number | null
          id: string
          notes: string | null
          nutrition: number | null
          photo_urls: string[] | null
          responded_at: string | null
          sleep: number | null
          stress: number | null
          submitted_at: string
          weight_kg: number | null
        }
        Insert: {
          ai_draft?: string | null
          client_id: string
          coach_id: string
          coach_response?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          nutrition?: number | null
          photo_urls?: string[] | null
          responded_at?: string | null
          sleep?: number | null
          stress?: number | null
          submitted_at?: string
          weight_kg?: number | null
        }
        Update: {
          ai_draft?: string | null
          client_id?: string
          coach_id?: string
          coach_response?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          nutrition?: number | null
          photo_urls?: string[] | null
          responded_at?: string | null
          sleep?: number | null
          stress?: number | null
          submitted_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          id: string
          note: string
          note_type: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
          note: string
          note_type?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          note?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_model: string
          billing_notes: string | null
          billing_status: string
          checkin_cadence: string
          client_type: string
          coach_id: string
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_contact: Json | null
          full_name: string
          goals: string[] | null
          health_notes: string | null
          id: string
          next_checkin_date: string | null
          onboarded_at: string | null
          phone: string | null
          portal_user_id: string | null
          status: string
          tp_username: string | null
          updated_at: string
        }
        Insert: {
          billing_model?: string
          billing_notes?: string | null
          billing_status?: string
          checkin_cadence?: string
          client_type?: string
          coach_id: string
          created_at?: string
          date_of_birth?: string | null
          email: string
          emergency_contact?: Json | null
          full_name: string
          goals?: string[] | null
          health_notes?: string | null
          id?: string
          next_checkin_date?: string | null
          onboarded_at?: string | null
          phone?: string | null
          portal_user_id?: string | null
          status?: string
          tp_username?: string | null
          updated_at?: string
        }
        Update: {
          billing_model?: string
          billing_notes?: string | null
          billing_status?: string
          checkin_cadence?: string
          client_type?: string
          coach_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string
          emergency_contact?: Json | null
          full_name?: string
          goals?: string[] | null
          health_notes?: string | null
          id?: string
          next_checkin_date?: string | null
          onboarded_at?: string | null
          phone?: string | null
          portal_user_id?: string | null
          status?: string
          tp_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          ai_generated: boolean
          asset_urls: string[] | null
          caption: string | null
          coach_id: string
          content_pillar: string | null
          created_at: string
          id: string
          metrics: Json
          metrics_updated_at: string | null
          platform_post_ids: Json
          platforms: string[]
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          asset_urls?: string[] | null
          caption?: string | null
          coach_id: string
          content_pillar?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          metrics_updated_at?: string | null
          platform_post_ids?: Json
          platforms?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          asset_urls?: string[] | null
          caption?: string | null
          coach_id?: string
          content_pillar?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          metrics_updated_at?: string | null
          platform_post_ids?: Json
          platforms?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phase: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phase?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phase?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          client_id: string
          coach_id: string
          coach_notes: string | null
          completed: boolean
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          duration_minutes: number | null
          exercises: Json | null
          id: string
          intensity: string | null
          name: string
          notes: string | null
          program_id: string | null
          rpe: number | null
          session_date: string
          session_type: string
          source: string
          tp_raw: Json | null
          tp_workout_id: string | null
          updated_at: string
          weekly_plan_id: string | null
        }
        Insert: {
          client_id: string
          coach_id: string
          coach_notes?: string | null
          completed?: boolean
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          intensity?: string | null
          name: string
          notes?: string | null
          program_id?: string | null
          rpe?: number | null
          session_date: string
          session_type: string
          source?: string
          tp_raw?: Json | null
          tp_workout_id?: string | null
          updated_at?: string
          weekly_plan_id?: string | null
        }
        Update: {
          client_id?: string
          coach_id?: string
          coach_notes?: string | null
          completed?: boolean
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          intensity?: string | null
          name?: string
          notes?: string | null
          program_id?: string | null
          rpe?: number | null
          session_date?: string
          session_type?: string
          source?: string
          tp_raw?: Json | null
          tp_workout_id?: string | null
          updated_at?: string
          weekly_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          coach_id: string
          created_at: string
          duration_minutes: number | null
          equipment: string | null
          exercises: Json
          id: string
          name: string
          session_type: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          duration_minutes?: number | null
          equipment?: string | null
          exercises?: Json
          id?: string
          name: string
          session_type: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          duration_minutes?: number | null
          equipment?: string | null
          exercises?: Json
          id?: string
          name?: string
          session_type?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          client_id: string
          coach_id: string
          coach_notes: string | null
          created_at: string
          id: string
          published_at: string | null
          status: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          client_id: string
          coach_id: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_checkin_overdue: { Args: { next_date: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
