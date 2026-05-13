// lib/supabase/server.ts
//
// Server-side Supabase client.
// Uses cookies for session management (required for App Router SSR).
// Use this in Server Components, Route Handlers, and Server Actions.

import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

// Service role client — for operations that bypass RLS (server-only, never client-side)
// Use sparingly: portal API routes that need to read coach_id from clients table
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/client.ts
//
// Browser-side Supabase client.
// Use this in Client Components only.
// ─────────────────────────────────────────────────────────────────────────────

// IMPORTANT: This is a separate file — lib/supabase/client.ts
// Shown here for reference. In the project, split into two files.

/*
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
*/
