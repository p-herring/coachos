import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hasSupabaseEnv, isBootstrapMode } from '@/lib/env'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'supabase_not_configured')
    return NextResponse.redirect(loginUrl)
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  // Support both 'next' and 'redirect' param names for flexibility
  const next = url.searchParams.get('next') ?? url.searchParams.get('redirect')

  const supabase = await createServerClient()

  // Invite / magic link flow (token_hash + type)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'invite_verification_failed')
      return NextResponse.redirect(loginUrl)
    }
    // Re-fetch session after verification
    const { data: { user } } = await supabase.auth.getUser()
    return NextResponse.redirect(new URL(resolveNext(next, user?.id), request.url))
  }

  // PKCE / OAuth flow (code)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'oauth_callback_failed')
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.redirect(new URL(resolveNext(next, data.user.id), request.url))
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

function resolveNext(next: string | null, userId: string | undefined): string {
  if (isBootstrapMode()) return '/dashboard'

  const isCoach = userId === process.env.COACH_USER_ID
  const defaultDest = isCoach ? '/dashboard' : '/portal'

  if (!next) return defaultDest

  // Only allow redirects to paths owned by the right surface
  if (isCoach && next.startsWith('/dashboard')) return next
  if (!isCoach && next.startsWith('/portal')) return next

  return defaultDest
}
