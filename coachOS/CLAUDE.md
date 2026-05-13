# CLAUDE.md — coachOS

> This file is the authoritative specification for the coachOS project.
> Read it in full at the start of every session before writing any code.
> When in doubt, refer back here. Never make architectural decisions that
> contradict this file without explicit instruction from Pete.

---

## Project Overview

**coachOS** is an AI-native coaching operations platform built for Pete, a solo
online coach with a mixed client roster (general fitness + endurance/triathlon
athletes). It replaces fragmented tools (spreadsheets, TrainingPeaks, WhatsApp,
Later, HubSpot) with a single platform where Claude is the primary orchestration
layer.

The platform has two distinct surfaces:
- `/dashboard` — Coach admin UI (Pete only)
- `/portal` — Client-facing portal (clients log in here)

**This is a solo-operator tool first.** Do not over-engineer for multi-tenancy
or scale. Design the DB with a `coach_id` column on all primary tables so
white-labelling is possible later, but do not build multi-coach features yet.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Use server components by default; client components only when needed |
| Hosting | Vercel | Preview deployments on every PR |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + Realtime |
| Styling | Tailwind CSS | Dark/light mode toggle via `next-themes` |
| UI Components | shadcn/ui | Install components as needed, do not bulk install |
| AI — Primary | Anthropic Claude API (`claude-sonnet-4-20250514`) | Orchestration, content, coaching logic |
| AI — Images | OpenAI API (DALL-E 3) | Social media image generation only |
| State | Zustand (client), TanStack Query (server) | Keep server state in TanStack Query |
| Forms | React Hook Form + Zod | All forms validated with Zod schemas |
| Icons | Lucide React | Consistent icon set |

---

## Repository Structure

```
coachOS/
├── CLAUDE.md                  ← this file
├── .env.local                 ← never commit; see .env.example
├── .env.example               ← committed; shows required keys without values
├── app/
│   ├── layout.tsx             ← root layout, ThemeProvider, fonts
│   ├── (auth)/                ← login, OAuth callback routes
│   │   ├── login/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (dashboard)/           ← coach admin surface
│   │   ├── layout.tsx         ← dashboard shell: sidebar + header
│   │   ├── page.tsx           ← dashboard home / overview
│   │   ├── clients/           ← CRM module
│   │   ├── planner/           ← Workout Planner module
│   │   ├── content/           ← Social Media Hub module
│   │   └── command/           ← AI Command Centre
│   └── (portal)/              ← client-facing surface
│       ├── layout.tsx         ← portal shell: minimal header + nav
│       ├── page.tsx           ← client home / this week
│       ├── plan/              ← weekly plan view
│       ├── checkin/           ← check-in form
│       └── progress/          ← progress photos + charts
├── components/
│   ├── ui/                    ← shadcn/ui components (auto-generated)
│   ├── dashboard/             ← coach UI components
│   ├── portal/                ← client portal components
│   └── shared/                ← used in both surfaces
├── lib/
│   ├── supabase/
│   │   ├── client.ts          ← browser Supabase client
│   │   ├── server.ts          ← server Supabase client (cookies)
│   │   └── middleware.ts      ← session refresh middleware
│   ├── ai/
│   │   ├── claude.ts          ← Anthropic client + system prompt builder
│   │   ├── tools.ts           ← Claude tool definitions (function calling)
│   │   ├── openai.ts          ← OpenAI client (DALL-E only)
│   │   └── prompts/           ← prompt templates as .ts files
│   ├── trainingpeaks/
│   │   ├── csv-parser.ts      ← Phase 1: CSV import parser
│   │   └── api.ts             ← Phase 2: TP OAuth + API client (stub in Phase 1)
│   └── utils.ts               ← shared utilities
├── hooks/                     ← custom React hooks
├── types/                     ← TypeScript types (never use `any`)
│   ├── database.ts            ← generated Supabase types
│   ├── client.ts
│   ├── workout.ts
│   └── content.ts
├── supabase/
│   ├── migrations/            ← all DB migrations, numbered sequentially
│   └── seed.sql               ← development seed data
└── api/                       ← Next.js API routes
    ├── ai/
    │   ├── chat/route.ts      ← Command Centre streaming endpoint
    │   └── generate-image/route.ts ← DALL-E proxy
    ├── webhooks/
    │   └── social/route.ts    ← social platform callbacks
    └── internal/              ← coachOS tool-call API (called by Claude)
        ├── clients/
        ├── plans/
        ├── sessions/
        ├── checkins/
        └── posts/
```

---

## Environment Variables

All secrets live in `.env.local`. Never hardcode keys. Never expose them
client-side (prefix with `NEXT_PUBLIC_` only when genuinely needed client-side).

```bash
# .env.example — copy to .env.local and fill in values

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only, never client-side

# Anthropic
ANTHROPIC_API_KEY=                # server-side only

# OpenAI (DALL-E)
OPENAI_API_KEY=                   # server-side only

# App
NEXT_PUBLIC_APP_URL=              # e.g. https://coachOS.vercel.app
COACH_USER_ID=                    # Pete's Supabase user UUID (set after first login)

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

---

## Database Schema

All migrations live in `supabase/migrations/`. Run `supabase db push` to apply.
Generate TypeScript types after any migration: `supabase gen types typescript --local > types/database.ts`

### Core Tables

```sql
-- All tables include coach_id for future multi-tenancy.
-- Phase 1: COACH_USER_ID env var is used as the single coach_id.

-- Clients
create table clients (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id),
  full_name     text not null,
  email         text not null,
  phone         text,
  date_of_birth date,
  emergency_contact jsonb,          -- {name, phone, relationship}
  client_type   text not null check (client_type in ('general', 'triathlon', 'mixed')),
  goals         text[],             -- array of goal tags
  health_notes  text,               -- injuries, conditions — shown prominently in UI
  tp_username   text,               -- TrainingPeaks username (Phase 2)
  status        text not null default 'lead'
                  check (status in ('lead','trial','active','paused','alumni')),
  billing_model text not null default 'retainer'
                  check (billing_model in ('trial','subscription','one_time','retainer')),
  billing_status text not null default 'pending'
                  check (billing_status in ('pending','active','overdue','cancelled')),
  onboarded_at  timestamptz,
  next_checkin_date date,
  checkin_cadence text default 'weekly' check (checkin_cadence in ('weekly','fortnightly')),
  portal_user_id uuid references auth.users(id),  -- null until client creates portal account
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Programs
create table programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  phase       text,
  start_date  date not null,
  end_date    date,
  notes       text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Session Templates (reusable by coach)
create table templates (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id),
  name        text not null,
  session_type text not null check (session_type in ('strength','conditioning','mobility','other')),
  equipment   text check (equipment in ('gym','home','hotel','minimal')),
  duration_minutes int,
  exercises   jsonb not null default '[]',
  -- exercise shape: [{name, sets, reps, duration_seconds, rest_seconds, notes, video_url}]
  tags        text[],
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Individual Sessions
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references auth.users(id),
  client_id       uuid not null references clients(id) on delete cascade,
  program_id      uuid references programs(id),
  weekly_plan_id  uuid references weekly_plans(id),
  name            text not null,
  session_date    date not null,
  session_type    text not null check (session_type in ('swim','bike','run','strength','conditioning','mobility','rest','other')),
  source          text not null check (source in ('trainingpeaks','coachOS','ai_generated')),
  duration_minutes int,
  intensity       text check (intensity in ('easy','moderate','hard','race')),
  exercises       jsonb default '[]',     -- for strength sessions
  tp_workout_id   text,                   -- TrainingPeaks workout ID (Phase 2)
  tp_raw          jsonb,                  -- raw TP data blob (Phase 2)
  notes           text,
  coach_notes     text,                   -- visible only to coach
  completed       boolean default false,
  completed_at    timestamptz,
  rpe             int check (rpe between 1 and 10),
  completion_notes text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Weekly Plans
create table weekly_plans (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id),
  client_id    uuid not null references clients(id) on delete cascade,
  week_start   date not null,             -- always a Monday
  week_end     date not null,             -- always a Sunday
  status       text not null default 'draft'
                 check (status in ('draft','published','archived')),
  coach_notes  text,
  published_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(client_id, week_start)
);

-- Check-ins
create table checkins (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  coach_id        uuid not null references auth.users(id),
  submitted_at    timestamptz default now(),
  energy          int check (energy between 1 and 5),
  sleep           int check (sleep between 1 and 5),
  stress          int check (stress between 1 and 5),
  nutrition       int check (nutrition between 1 and 5),
  notes           text,
  photo_urls      text[],
  weight_kg       numeric(5,2),
  coach_response  text,
  responded_at    timestamptz,
  ai_draft        text                    -- Claude-generated response draft for coach review
);

-- Posts (Social Media Hub)
create table posts (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references auth.users(id),
  title           text,                   -- internal label only
  caption         text,
  platforms       text[] not null,        -- ['instagram','tiktok','youtube_shorts']
  content_pillar  text check (content_pillar in ('training','client_wins','education','personal_brand')),
  asset_urls      text[],                 -- images/video stored in Supabase Storage
  status          text not null default 'draft'
                    check (status in ('draft','scheduled','publishing','published','failed')),
  scheduled_at    timestamptz,
  published_at    timestamptz,
  platform_post_ids jsonb default '{}',  -- {instagram: "...", tiktok: "...", youtube: "..."}
  metrics         jsonb default '{}',    -- {instagram: {likes, reach, ...}, ...}
  metrics_updated_at timestamptz,
  ai_generated    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- AI Conversations (Command Centre history)
create table ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id),
  title        text,                      -- auto-generated summary of first message
  messages     jsonb not null default '[]',
  -- message shape: [{role: 'user'|'assistant', content: '...', timestamp: '...'}]
  context      jsonb default '{}',        -- {client_id, post_id, plan_id} for linked context
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Communication Log
create table client_notes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id),
  client_id   uuid not null references clients(id) on delete cascade,
  note        text not null,
  note_type   text default 'general' check (note_type in ('general','call','email','whatsapp','billing','flag')),
  created_at  timestamptz default now()
);
```

### Row Level Security

Every table must have RLS enabled. Apply these policies:

```sql
-- Pattern for coach-owned tables:
alter table clients enable row level security;
create policy "coach_owns" on clients
  using (coach_id = auth.uid());

-- Pattern for client portal access (checkins, sessions, weekly_plans):
-- Clients can SELECT their own records only; coach can do everything.
create policy "client_read_own" on checkins
  for select using (
    client_id in (
      select id from clients where portal_user_id = auth.uid()
    )
  );
create policy "coach_full" on checkins
  using (coach_id = auth.uid());
```

Apply equivalent policies to: `sessions`, `weekly_plans`, `programs`.
Clients have NO access to: `posts`, `templates`, `ai_conversations`, `client_notes`.

---

## Authentication

### Coach (Pete)
- Supabase Auth, email + password
- Single user — Pete's `user.id` is stored as `COACH_USER_ID` env var
- Protected by middleware: all `/dashboard/*` routes require `coach_id = COACH_USER_ID`
- If anyone else somehow registers, they get no data (RLS handles it)

### Clients (Portal)
- Supabase Auth with three providers: **Google OAuth**, **Apple OAuth**, **email + password**
- Client accounts are linked to their `clients` row via `portal_user_id`
- Onboarding flow: Pete creates the client in CRM → invites them via email → client signs up → `portal_user_id` is set on the `clients` row automatically via a Supabase function
- All `/portal/*` routes require an authenticated session where the user has a matching `clients` row

### Auth Flow Files
- `app/(auth)/login/page.tsx` — shared login page (detects coach vs client after auth)
- `app/auth/callback/route.ts` — OAuth callback handler (Supabase PKCE flow)
- `lib/supabase/middleware.ts` — refreshes sessions, redirects unauthenticated users

---

## Theming & Styling

- Dark/light mode via `next-themes` with `ThemeProvider` in root layout
- Toggle in both dashboard header and portal header
- Tailwind CSS with CSS variables for theme tokens (shadcn/ui pattern)
- Default: **system preference**, then user toggle persisted in localStorage

### Brand Colours (use as Tailwind config extensions)
```js
// tailwind.config.ts
colors: {
  brand: {
    blue:   '#2563EB',   // primary accent
    purple: '#7C3AED',   // secondary accent
    green:  '#059669',   // success / published
    orange: '#EA580C',   // warning / overdue
  }
}
```

Dashboard UI: slightly more data-dense, professional.
Portal UI: clean, minimal, mobile-first. Clients likely on phones.

---

## AI Architecture

### Claude (Primary — Orchestration + Content)

**Model:** `claude-sonnet-4-20250514` — use this for all Claude API calls.

**Client location:** `lib/ai/claude.ts` — never instantiate Anthropic client outside this file.

**System prompt** is built dynamically per session from:
1. Static persona block (Pete's coaching philosophy, platform context)
2. Dynamic context block (today's date, active clients count, any linked entity)
3. Tool manifest (injected automatically by the API)

**Command Centre endpoint:** `app/api/ai/chat/route.ts`
- Accepts `{messages, context}` — context is `{client_id?, post_id?, plan_id?}`
- Streams response using Vercel AI SDK (`ai` package)
- Calls internal coachOS tools via Claude function calling

### Claude Tool Definitions (`lib/ai/tools.ts`)

Define all tools here. Each tool maps to an internal API route.
Claude calls these; the API route executes them against Supabase.

```typescript
// Tool naming convention: verb_noun
// Tools available to Claude in the Command Centre:

get_client          // fetch single client profile
list_clients        // query CRM with filters
get_weekly_plan     // fetch assembled plan for a client + week
create_session      // add a session to a plan
update_session      // edit a session
get_checkins        // fetch recent check-ins for a client
draft_checkin_response  // generate a response draft (returns text, does not send)
list_posts          // query content calendar
create_post         // create a post draft
schedule_post       // set scheduled_at on a post
get_post_metrics    // retrieve performance data
generate_image      // call DALL-E (proxied via /api/ai/generate-image)
generate_session    // AI-create a strength session from client profile + brief
build_week          // propose a full week plan for a client
```

### OpenAI / DALL-E (Images Only)

**Client location:** `lib/ai/openai.ts`
**Endpoint:** `app/api/ai/generate-image/route.ts`
- POST `{prompt, style?}` → returns `{image_url}`
- Uploads generated image to Supabase Storage → returns permanent URL
- Never call OpenAI from the client side

---

## Module Build Order

Build in this exact order. Do not start a module until the previous one's
core functionality is tested and committed.

### Phase 1 (Build First)

1. **Project scaffold** — Next.js 14, Tailwind, shadcn/ui, next-themes, Supabase client/server setup, middleware, root layouts for dashboard + portal
2. **Auth** — Coach login (email/password), client OAuth (Google + Apple + email/password), callback handler, RLS policies
3. **Database migrations** — All tables above, RLS policies, seed data
4. **CRM Module** — Client list, client profile page, pipeline kanban, add/edit client, communication log, billing status
5. **Client Portal MVP** — Client home, weekly plan view (read-only), check-in form submission, progress photo upload
6. **Workout Planner MVP** — Session template CRUD, manual session creation, weekly plan assembly (drag-and-drop), publish to portal, CSV import for TrainingPeaks
7. **Command Centre MVP** — Chat interface, streaming Claude responses, first 4 tools wired up (get_client, list_clients, get_checkins, get_weekly_plan)

### Phase 2 (After Phase 1 is live)

8. **Social Media Hub** — Content calendar, post editor, Claude caption generation, DALL-E image generation, asset library, scheduling UI
9. **AI Session Builder** — generate_session and build_week tools, template + AI fill-in workflow, load conflict detection
10. **TrainingPeaks API** — OAuth flow, workout pull, display alongside CoachOS sessions
11. **Social Publishing** — Instagram Graph API, TikTok Content Posting API, YouTube Data API v3, auto-publish, metrics pull
12. **Full Command Centre** — All tools wired, automation recipes, conversation history

### Phase 3 (Future)

13. Stripe billing integration
14. Performance analytics dashboard
15. White-label / multi-coach groundwork

---

## Coding Conventions

- **TypeScript strict mode** — `"strict": true` in tsconfig. No `any`. Ever.
- **Server components by default.** Add `'use client'` only when you need hooks, event handlers, or browser APIs.
- **API routes are thin.** Business logic lives in `lib/`, not in route handlers.
- **Zod for all external input.** Validate every API request body with a Zod schema before touching the database.
- **Never expose service role key client-side.** Supabase service role key is server-only.
- **Error handling.** All API routes return `{error: string}` with appropriate HTTP status on failure. Never return 200 with an error in the body.
- **Naming:** files = `kebab-case`, components = `PascalCase`, functions = `camelCase`, DB columns = `snake_case`, env vars = `SCREAMING_SNAKE_CASE`.
- **Comments:** write comments for *why*, not *what*. The code explains what; comments explain intent and non-obvious decisions.
- **No inline styles.** Tailwind only.
- **Component size:** if a component exceeds ~150 lines, split it.

---

## Key Decisions & Rationale

| Decision | Choice | Why |
|---|---|---|
| App Router vs Pages Router | App Router | Server components reduce client JS; streaming for AI responses |
| Supabase Auth vs NextAuth | Supabase Auth | Already using Supabase; native OAuth + RLS integration |
| Vercel AI SDK | Yes | Streaming AI responses out of the box; tool calling support |
| shadcn/ui vs Radix direct | shadcn/ui | Opinionated defaults, copy-paste components, works with Tailwind |
| Zustand vs Context | Zustand | Simpler, no provider nesting, works well alongside TanStack Query |
| DALL-E vs Midjourney | DALL-E 3 via API | Programmable; Midjourney has no official API |
| TikTok API | Content Posting API | Only official option; requires business account approval |

---

## What NOT To Build (Phase 1-2)

- Native iOS/Android app (Next.js PWA is sufficient)
- Stripe payments (manual billing tracking only until Phase 3)
- Multi-coach / white-label UI (DB is ready for it; UI is not)
- Video editing or hosting (link to YouTube/TikTok uploads only)
- Nutrition tracking
- Garmin / Wahoo / Polar integrations
- Facebook or LinkedIn publishing
- Group coaching / cohort features

---

## Session Startup Checklist

At the start of every Claude Code session:

1. Read this file in full
2. Run `git status` — understand what was last worked on
3. Run `supabase status` — confirm local DB is running
4. Check `supabase/migrations/` — know the current schema state
5. Identify which module/phase you are in from the Build Order above
6. Ask Pete if anything has changed before writing code

---

## Contact & Context

- **Coach:** Pete — IT background, Army veteran, active triathlete, building this while working full-time
- **Brand:** pete.in.progress (on pause; may integrate later)
- **Vibe:** Pragmatic. Build what works. No over-engineering. Clean code but not precious about it.
- **Preferred feedback style:** Direct. If something is a bad idea, say so.
- **Timezone:** Perth, Western Australia (AWST, UTC+8)
