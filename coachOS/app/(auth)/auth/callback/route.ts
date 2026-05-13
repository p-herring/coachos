import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hasCoachUserId, hasSupabaseEnv } from '@/lib/env'

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv() || !hasCoachUserId()) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'supabase_not_configured')
    return NextResponse.redirect(loginUrl)
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const redirect = url.searchParams.get('redirect')

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_callback_failed')
    return NextResponse.redirect(loginUrl)
  }

  const isCoach = data.session.user.id === process.env.COACH_USER_ID
  const safeRedirect = redirect?.startsWith(isCoach ? '/dashboard' : '/portal')
    ? redirect
    : isCoach
      ? '/dashboard'
      : '/portal'

  return NextResponse.redirect(new URL(safeRedirect, request.url))
}
