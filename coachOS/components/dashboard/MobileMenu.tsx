'use client'

import { Menu, LogOut, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SidebarLink } from '@/components/dashboard/SidebarLink'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface MobileMenuProps {
  items: NavItem[]
}

export function MobileMenu({ items }: MobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg font-bold tracking-tight">
            coach<span className="text-brand-blue">OS</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map((item) => (
              <SidebarLink key={item.href} {...item} />
            ))}
          </nav>
          <div className="space-y-1 border-t p-3">
            <ThemeToggle className="w-full" />
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
