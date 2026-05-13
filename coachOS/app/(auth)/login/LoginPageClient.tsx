'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Apple, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type OAuthProvider = 'google' | 'apple'

function getFriendlyAuthError(message: string) {
  if (message.toLowerCase().includes('provider is not enabled')) {
    return 'Google and Apple sign-in are not enabled in Supabase yet. Use email and password for now.'
  }

  return message
}

export function LoginPageClient({
  isSupabaseConfigured,
}: {
  isSupabaseConfigured: boolean
}) {
  return (
    <Suspense fallback={<LoginPageShell isSupabaseConfigured={isSupabaseConfigured} />}>
      <LoginPageContent isSupabaseConfigured={isSupabaseConfigured} />
    </Suspense>
  )
}

function LoginPageShell({
  isSupabaseConfigured,
}: {
  isSupabaseConfigured: boolean
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10">
            <span className="text-lg font-bold tracking-tight text-brand-blue">
              cOS
            </span>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight">
              coach<span className="text-brand-blue">OS</span>
            </CardTitle>
            <CardDescription>
              Sign in to the coaching dashboard or client portal.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 px-3 py-2 text-sm text-brand-blue">
            {isSupabaseConfigured
              ? 'Loading sign-in...'
              : 'Preview mode is active. Supabase auth has not been configured yet.'}
          </div>
          <Button type="button" variant="outline" className="w-full" disabled>
            <Globe className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled>
            <Apple className="mr-2 h-4 w-4" />
            Sign in with Apple
          </Button>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loading-email">Email</Label>
              <Input id="loading-email" type="email" placeholder="you@example.com" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loading-password">Password</Label>
              <Input id="loading-password" type="password" placeholder="••••••••" disabled />
            </div>
            <Button type="button" className="w-full" disabled>
              Sign in with email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoginPageContent({
  isSupabaseConfigured,
}: {
  isSupabaseConfigured: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createBrowserSupabaseClient() : null),
    [isSupabaseConfigured]
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const redirect = searchParams.get('redirect')
  const configError = searchParams.get('error') === 'supabase_not_configured'

  async function handleOAuth(provider: OAuthProvider) {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured for this deployment yet.')
      return
    }

    setError(null)
    setNotice(null)
    setIsLoading(true)

    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (redirect) {
      callbackUrl.searchParams.set('redirect', redirect)
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    })

    if (authError) {
      setError(getFriendlyAuthError(authError.message))
      setIsLoading(false)
    }
  }

  async function handlePasswordSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured for this deployment yet.')
      return
    }

    setError(null)
    setNotice(null)
    setIsLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(getFriendlyAuthError(authError.message))
      setIsLoading(false)
      return
    }

    router.replace(redirect?.startsWith('/') ? redirect : '/dashboard')
    router.refresh()
  }

  async function handleCreateCoachAccount() {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured for this deployment yet.')
      return
    }

    setError(null)
    setNotice(null)
    setIsLoading(true)

    const callbackUrl = redirect?.startsWith('/') ? redirect : '/dashboard'
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL('/dashboard', window.location.origin).toString(),
      },
    })

    if (authError) {
      setError(getFriendlyAuthError(authError.message))
      setIsLoading(false)
      return
    }

    if (data.session) {
      router.replace(callbackUrl)
      router.refresh()
      return
    }

    setNotice('Account created. Check your email for the Supabase confirmation link if required, then sign in.')
    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10">
            <span className="text-lg font-bold tracking-tight text-brand-blue">
              cOS
            </span>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight">
              coach<span className="text-brand-blue">OS</span>
            </CardTitle>
            <CardDescription>
              Sign in to the coaching dashboard or client portal.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured && (
            <div className="rounded-lg border border-brand-orange/20 bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
              Preview mode is active. Supabase auth hasn&apos;t been configured in Vercel yet,
              so sign-in is temporarily disabled.
            </div>
          )}
          {isSupabaseConfigured && (
            <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 px-3 py-2 text-sm text-brand-blue">
              Email and password sign-in is ready now. Google and Apple can be enabled next in Supabase.
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || !isSupabaseConfigured}
            onClick={() => handleOAuth('google')}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
            Sign in with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || !isSupabaseConfigured}
            onClick={() => handleOAuth('apple')}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Apple className="mr-2 h-4 w-4" />}
            Sign in with Apple
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form className="space-y-4" onSubmit={handlePasswordSignIn}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {(configError || error) && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {configError ? 'Supabase is not configured for this deployment yet.' : error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-brand-green/20 bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
                {notice}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || !isSupabaseConfigured}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in with email
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={isLoading || !isSupabaseConfigured || !email || !password}
              onClick={handleCreateCoachAccount}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create coach account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
