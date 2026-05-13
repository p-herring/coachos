# coachOS — Codex Build Prompt
# Phase 1: Project Scaffold + Database + Auth
#
# Paste this entire prompt into Codex to kick off the build.
# All architectural decisions are final — do not deviate from them.
# Reference files (CLAUDE.md, migrations, types, etc.) are in the repo root and /docs.

---

## Your job

Scaffold the coachOS Next.js project exactly as specified below.
Do not make architectural decisions not covered here — follow the spec.
Do not install packages not listed here.
Do not create files not listed here unless they are required boilerplate
(e.g. .gitignore, tsconfig.json, next.config.ts).

---

## Step 1 — Initialise the project

```bash
npx create-next-app@latest coachOS \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

Then install all dependencies in one pass:

```bash
cd coachOS

npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @anthropic-ai/sdk \
  openai \
  next-themes \
  zod \
  react-hook-form \
  @hookform/resolvers \
  zustand \
  @tanstack/react-query \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority \
  date-fns

npm install -D \
  supabase \
  @types/node \
  @types/react \
  @types/react-dom
```

Initialise shadcn/ui:
```bash
npx shadcn@latest init
```
When prompted:
- Style: Default
- Base colour: Slate
- CSS variables: Yes

Install these shadcn components:
```bash
npx shadcn@latest add button input label textarea select badge card sheet dialog tabs
npx shadcn@latest add dropdown-menu avatar separator skeleton toast
```

---

## Step 2 — Directory structure

Create this exact directory and file structure.
Create empty files where content is not specified below —
they will be filled in subsequent steps.

```
coachOS/
├── CLAUDE.md                          ← copy from repo root (already exists)
├── .env.example                       ← create with content below
├── .env.local                         ← create empty (gitignored)
├── .gitignore                         ← standard Next.js gitignore + add .env.local
│
├── app/
│   ├── globals.css                    ← Tailwind directives + CSS variables
│   ├── layout.tsx                     ← root layout with ThemeProvider
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx               ← login page
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts           ← Supabase OAuth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx                 ← dashboard shell (sidebar + header)
│   │   ├── page.tsx                   ← overview page
│   │   ├── clients/
│   │   │   ├── page.tsx               ← client list
│   │   │   ├── new/
│   │   │   │   └── page.tsx           ← add client form
│   │   │   └── [id]/
│   │   │       ├── page.tsx           ← client profile
│   │   │       ├── plan/
│   │   │       │   └── page.tsx       ← redirect to planner
│   │   │       └── checkins/
│   │   │           └── page.tsx       ← check-in history
│   │   ├── planner/
│   │   │   ├── page.tsx               ← planner overview (all clients)
│   │   │   └── [clientId]/
│   │   │       └── page.tsx           ← single client planner
│   │   ├── content/
│   │   │   ├── page.tsx               ← content calendar
│   │   │   └── post/
│   │   │       ├── new/
│   │   │       │   └── page.tsx       ← create post
│   │   │       └── [id]/
│   │   │           └── page.tsx       ← edit post
│   │   └── command/
│   │       └── page.tsx               ← AI command centre
│   ├── (portal)/
│   │   ├── layout.tsx                 ← portal shell
│   │   ├── page.tsx                   ← portal home
│   │   ├── plan/
│   │   │   └── page.tsx               ← weekly plan view
│   │   ├── checkin/
│   │   │   ├── page.tsx               ← submit check-in
│   │   │   └── history/
│   │   │       └── page.tsx           ← check-in history
│   │   ├── progress/
│   │   │   └── page.tsx               ← progress tracking
│   │   ├── not-linked/
│   │   │   └── page.tsx               ← account not linked error
│   │   └── inactive/
│   │       └── page.tsx               ← paused/alumni client
│   └── api/
│       ├── ai/
│       │   ├── chat/
│       │   │   └── route.ts           ← Claude streaming endpoint
│       │   └── generate-image/
│       │       └── route.ts           ← DALL-E proxy
│       ├── internal/
│       │   ├── clients/
│       │   │   ├── get/route.ts
│       │   │   ├── list/route.ts
│       │   │   ├── create/route.ts
│       │   │   ├── update/route.ts
│       │   │   ├── invite/route.ts
│       │   │   └── notes/
│       │   │       └── add/route.ts
│       │   ├── plans/
│       │   │   ├── get/route.ts
│       │   │   ├── create/route.ts
│       │   │   ├── publish/route.ts
│       │   │   └── build-week/route.ts
│       │   ├── sessions/
│       │   │   ├── create/route.ts
│       │   │   ├── update/route.ts
│       │   │   ├── delete/route.ts
│       │   │   └── generate/route.ts
│       │   ├── checkins/
│       │   │   ├── list/route.ts
│       │   │   ├── draft-response/route.ts
│       │   │   └── send-response/route.ts
│       │   ├── posts/
│       │   │   ├── list/route.ts
│       │   │   ├── create/route.ts
│       │   │   ├── update/route.ts
│       │   │   ├── schedule/route.ts
│       │   │   └── metrics/route.ts
│       │   └── templates/
│       │       ├── list/route.ts
│       │       ├── create/route.ts
│       │       └── update/route.ts
│       └── portal/
│           ├── me/route.ts
│           ├── sessions/
│           │   └── complete/route.ts
│           └── checkins/
│               └── submit/route.ts
│
├── components/
│   ├── ui/                            ← shadcn auto-generated (do not edit)
│   ├── dashboard/
│   │   ├── SidebarLink.tsx            ← active-state nav link (client component)
│   │   ├── MobileMenu.tsx             ← mobile nav sheet
│   │   └── ThemeToggle.tsx            ← dark/light toggle button
│   ├── portal/
│   │   └── SessionCard.tsx            ← expandable session card
│   └── shared/
│       ├── StatusBadge.tsx            ← coloured status chips
│       ├── ClientTypeBadge.tsx
│       └── LoadingSpinner.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  ← browser Supabase client
│   │   └── server.ts                  ← server + service role clients
│   ├── ai/
│   │   ├── claude.ts                  ← Anthropic client + system prompt + streamChat
│   │   ├── tools.ts                   ← Claude tool definitions + executeTool
│   │   ├── openai.ts                  ← OpenAI client (DALL-E only)
│   │   └── prompts/
│   │       └── social.ts              ← caption prompt builder
│   ├── trainingpeaks/
│   │   └── csv-parser.ts              ← TP CSV → session objects
│   └── utils.ts                       ← cn() helper + shared utilities
│
├── hooks/
│   ├── useSupabase.ts                 ← browser client singleton
│   └── useCoachSession.ts             ← verify coach auth in client components
│
├── types/
│   ├── database.ts                    ← placeholder (generated by supabase CLI)
│   ├── client.ts                      ← client types + Zod schemas
│   ├── workout.ts                     ← session, plan, template, checkin types
│   └── content.ts                     ← post, platform, metrics types
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260001000000_extensions_and_helpers.sql
│   │   ├── 20260002000000_core_tables.sql
│   │   ├── 20260003000000_rls_policies.sql
│   │   └── 20260004000000_seed_data.sql
│   └── seed.sql                       ← symlink or copy of migration 004
│
├── docs/
│   ├── crm-module-design.md
│   ├── planner-module-design.md
│   ├── social-hub-design.md
│   └── portal-design.md
│
├── middleware.ts                       ← auth + routing middleware
├── tailwind.config.ts                 ← with brand colour extensions
├── next.config.ts
└── tsconfig.json                      ← strict mode enabled
```

---

## Step 3 — File contents to implement now

Implement the following files with full working code.
For files marked "stub", create the file with the correct function signature
and a TODO comment — do not leave them completely empty.

### tailwind.config.ts
Extend the default config with brand colours:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:   '#2563EB',
          purple: '#7C3AED',
          green:  '#059669',
          orange: '#EA580C',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

### .env.example
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# OpenAI (DALL-E)
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
COACH_USER_ID=

# TrainingPeaks (Phase 2)
TP_CLIENT_ID=
TP_CLIENT_SECRET=

# Social APIs (Phase 2)
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
```

### lib/utils.ts
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function formatDateAU(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Australia/Perth',
  })
}

export function relativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDateAU(date)
}
```

### app/layout.tsx
Root layout with ThemeProvider from next-themes.
Wrap children in ThemeProvider with attribute="class" defaultTheme="system" enableSystem.
Use Inter font from next/font/google.
Include Toaster from shadcn/ui.

### app/(auth)/login/page.tsx
Login page with:
- coachOS logo/wordmark centred
- "Sign in with Google" button (calls supabase.auth.signInWithOAuth provider: 'google')
- "Sign in with Apple" button (calls supabase.auth.signInWithOAuth provider: 'apple')
- Divider "or"
- Email + password form (calls supabase.auth.signInWithPassword)
- Clean, centred card layout, works in dark and light mode

### app/(auth)/auth/callback/route.ts
Standard Supabase PKCE OAuth callback handler.
Exchange code for session, redirect to /dashboard if coach, /portal if client.
Check user.id against COACH_USER_ID env var to determine which redirect.

### lib/supabase/client.ts
Browser Supabase client using createBrowserClient from @supabase/ssr.
Export a singleton via a module-level variable to avoid multiple instances.

### lib/supabase/server.ts
Copy exactly from the file already in the repo (server.ts provided in docs).
Exports createServerClient() and createServiceClient().

### middleware.ts
Copy exactly from the file already in the repo (middleware.ts provided in docs).

### lib/ai/claude.ts
Copy exactly from the file already in the repo (claude.ts provided in docs).

### lib/ai/tools.ts
Copy exactly from the file already in the repo (tools.ts provided in docs).

### lib/ai/openai.ts
```typescript
import OpenAI from 'openai'

// Singleton — only instantiated server-side
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

### lib/trainingpeaks/csv-parser.ts
Copy exactly from the file already in the repo (csv_parser.ts provided in docs).

### types/client.ts, types/workout.ts, types/content.ts
Copy from the types.ts file in the repo — split into the three separate files by section.

### types/database.ts
```typescript
// Auto-generated by Supabase CLI: supabase gen types typescript --local > types/database.ts
// Run this command after applying migrations to regenerate.
// Placeholder until migrations are applied.
export type Database = {
  public: {
    Tables: Record<string, unknown>
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
  }
}
```

### components/shared/ThemeToggle.tsx
Client component. Uses useTheme from next-themes.
Toggle between dark/light with a Sun/Moon icon from lucide-react.
Accept optional className prop.

### components/dashboard/SidebarLink.tsx
Client component. Uses usePathname from next/navigation.
Active state: bg-brand-blue/10 text-brand-blue font-medium.
Inactive state: text-muted-foreground hover:text-foreground hover:bg-muted.

### app/(dashboard)/layout.tsx
Copy from dashboard_layout.tsx in the repo.
Replace the static SidebarLink with the client component version.

### app/(dashboard)/page.tsx
Copy from dashboard_page.tsx in the repo.

### app/api/ai/chat/route.ts
Copy from chat_route.ts in the repo.

### app/api/ai/generate-image/route.ts
Copy from generate_image_route.ts in the repo.

### app/(dashboard)/command/page.tsx
Copy from command_page.tsx in the repo.

---

## Step 4 — Stub all remaining route handlers

For every API route file listed in the directory structure above that has NOT
been given full content, create it with this stub pattern:

```typescript
// app/api/internal/[module]/[action]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.id !== process.env.COACH_USER_ID) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // TODO: implement [describe what this route does]
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
```

---

## Step 5 — Stub all remaining page components

For every page.tsx file listed above that has NOT been given full content,
create it with this stub:

```typescript
// app/(surface)/[route]/page.tsx
export default function PageName() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Page Name</h1>
      <p className="text-muted-foreground mt-2">Coming soon.</p>
    </div>
  )
}
```

---

## Step 6 — Verify

After scaffolding, run:
```bash
npm run build
```

Fix any TypeScript errors. The build must pass with zero errors before stopping.
Do not suppress errors with `any` or `@ts-ignore` — fix them properly.

---

## What NOT to do

- Do not add any packages not listed in Step 1
- Do not create any pages or routes not listed in the directory structure
- Do not add authentication to the portal that differs from the spec (Google + Apple + email/password)
- Do not use the Pages Router — App Router only
- Do not use `any` TypeScript type
- Do not add placeholder lorem ipsum content to user-facing pages
- Do not deviate from the file naming conventions (kebab-case files, PascalCase components)
