// middleware.ts (project root)
//
// Handles:
//   1. Supabase session refresh on every request
//   2. Route protection for /dashboard (coach only)
//   3. Route protection for /portal (clients only)
//   4. Redirect logic after login (coach → /dashboard, client → /portal)

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasCoachUserId, hasSupabaseEnv, isBootstrapMode } from '@/lib/env'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create a response we can mutate (to set cookies)
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Preview mode: allow the app to render without auth until Supabase is configured.
  if (!hasSupabaseEnv()) {
    return response
  }

  // Initialise Supabase client with cookie access
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session — MUST be called on every request
  const { data: { session } } = await supabase.auth.getSession()

  // ── /dashboard routes — coach only ───────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Verify this is Pete's account
    if (hasCoachUserId() && session.user.id !== process.env.COACH_USER_ID) {
      // Authenticated but not the coach — redirect to portal
      // (they might be a client who stumbled onto the wrong URL)
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  // ── /portal routes — clients only ────────────────────────────────────────
  if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/not-linked') && !pathname.startsWith('/portal/inactive')) {
    if (isBootstrapMode()) {
      return response
    }

    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check they have a linked client record
    const { data: client } = await supabase
      .from('clients')
      .select('id, status')
      .eq('portal_user_id', session.user.id)
      .single()

    if (!client) {
      return NextResponse.redirect(new URL('/portal/not-linked', request.url))
    }

    if (client.status === 'paused' || client.status === 'alumni') {
      return NextResponse.redirect(new URL('/portal/inactive', request.url))
    }
  }

  // ── /login — redirect if already authenticated ────────────────────────────
  if (pathname === '/login' && session) {
    if (isBootstrapMode()) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Coach → dashboard
    if (session.user.id === process.env.COACH_USER_ID) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Client → portal
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Auth callback ─────────────────────────────────────────────────────────
  // Allow /auth/callback through unconditionally — Supabase handles it
  if (pathname.startsWith('/auth/callback')) {
    return response
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except static files and API routes that handle their own auth
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
}
