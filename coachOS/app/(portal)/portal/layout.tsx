import Link from 'next/link'
import { Home, CalendarDays, MessageSquare, LineChart } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const NAV_ITEMS = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/plan', label: 'Plan', icon: CalendarDays },
  { href: '/portal/checkin', label: 'Check-in', icon: MessageSquare },
  { href: '/portal/progress', label: 'Progress', icon: LineChart },
]

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/portal" className="font-bold tracking-tight">
            coach<span className="text-brand-blue">OS</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
