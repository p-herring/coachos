'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarLinkProps {
  href: string
  label: string
  icon: LucideIcon
}

export function SidebarLink({
  href,
  label,
  icon: Icon,
}: SidebarLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
        isActive
          ? 'bg-brand-blue/10 font-medium text-brand-blue'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-3 w-3 opacity-0 transition group-hover:opacity-50" />
    </Link>
  )
}
