// app/(dashboard)/layout.tsx
//
// Coach dashboard shell.
// Sidebar navigation + top header.
// All /dashboard/* routes render inside this layout.

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  Users, CalendarDays, ImagePlay, Bot,
  LayoutDashboard, LogOut
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { MobileMenu } from '@/components/dashboard/MobileMenu'
import { SidebarLink } from '@/components/dashboard/SidebarLink'

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Overview',        icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clients',         icon: Users },
  { href: '/dashboard/planner', label: 'Planner',         icon: CalendarDays },
  { href: '/dashboard/content', label: 'Content',         icon: ImagePlay },
  { href: '/dashboard/command', label: 'Command Centre',  icon: Bot },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.id !== process.env.COACH_USER_ID) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 border-r bg-muted/20 shrink-0">

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <span className="font-bold text-lg tracking-tight">
            coach<span className="text-brand-blue">OS</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <SidebarLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-1">
          <ThemeToggle className="w-full" />
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top header (mobile nav + breadcrumb area) */}
        <header className="h-16 border-b bg-background flex items-center px-6 gap-4 shrink-0">
          <div className="md:hidden">
            <MobileMenu items={NAV_ITEMS} />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Header right */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="md:hidden" />
            {/* Notification bell — Phase 2 */}
            <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-blue">P</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
