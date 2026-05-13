import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function useSupabase() {
  return createBrowserSupabaseClient()
}
