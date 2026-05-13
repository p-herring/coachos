import { hasSupabaseEnv } from '@/lib/env'
import { LoginPageClient } from './LoginPageClient'

export default function LoginPage() {
  return <LoginPageClient isSupabaseConfigured={hasSupabaseEnv()} />
}
