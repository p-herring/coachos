-- Migration 002: Core tables
-- Creates all primary tables in dependency order.
-- Foreign keys reference auth.users for coach_id and portal_user_id.

-- ─── Clients ─────────────────────────────────────────────────────────────────

create table clients (
  id                  uuid primary key default gen_random_uuid(),
  coach_id            uuid not null references auth.users(id) on delete cascade,

  -- Identity
  full_name           text not null,
  email               text not null,
  phone               text,
  date_of_birth       date,
  emergency_contact   jsonb default '{}',
  -- shape: { name: string, phone: string, relationship: string }

  -- Coaching profile
  client_type         text not null default 'general'
                        check (client_type in ('general', 'triathlon', 'mixed')),
  goals               text[] default '{}',
  health_notes        text,               -- injuries/conditions; shown with warning in UI
  tp_username         text,               -- TrainingPeaks username (Phase 2)

  -- Pipeline
  status              text not null default 'lead'
                        check (status in ('lead','trial','active','paused','alumni')),

  -- Billing
  billing_model       text not null default 'retainer'
                        check (billing_model in ('trial','subscription','one_time','retainer')),
  billing_status      text not null default 'pending'
                        check (billing_status in ('pending','active','overdue','cancelled')),
  billing_notes       text,

  -- Check-in settings
  checkin_cadence     text not null default 'weekly'
                        check (checkin_cadence in ('weekly','fortnightly')),
  next_checkin_date   date,

  -- Portal
  portal_user_id      uuid references auth.users(id) on delete set null,
  -- null = invite not yet accepted; set automatically by link_portal_user() trigger

  -- Timestamps
  onboarded_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Constraints
  unique (coach_id, email)
);

create trigger clients_updated_at
  before update on clients
  for each row execute procedure handle_updated_at();

create index clients_coach_id_idx on clients (coach_id);
create index clients_status_idx on clients (coach_id, status);
create index clients_portal_user_idx on clients (portal_user_id);
-- Trigram index for fuzzy name search in CRM
create index clients_name_trgm_idx on clients using gin (full_name extensions.gin_trgm_ops);


-- ─── Programs ─────────────────────────────────────────────────────────────────

create table programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,

  name        text not null,
  phase       text,
  start_date  date not null,
  end_date    date,
  notes       text,
  is_active   boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger programs_updated_at
  before update on programs
  for each row execute procedure handle_updated_at();

create index programs_client_idx on programs (client_id);
create index programs_active_idx on programs (coach_id, is_active);


-- ─── Session Templates ────────────────────────────────────────────────────────

create table templates (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,

  name          text not null,
  session_type  text not null
                  check (session_type in ('strength','conditioning','mobility','other')),
  equipment     text
                  check (equipment in ('gym','home','hotel','minimal')),
  duration_minutes int,
  exercises     jsonb not null default '[]',
  -- exercise shape:
  -- [{
  --   name: string,
  --   sets: number,
  --   reps: string,         -- e.g. "8-10" or "to failure"
  --   duration_seconds: number | null,
  --   rest_seconds: number,
  --   notes: string,
  --   video_url: string | null
  -- }]
  tags          text[] default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger templates_updated_at
  before update on templates
  for each row execute procedure handle_updated_at();

create index templates_coach_idx on templates (coach_id);
create index templates_type_idx on templates (coach_id, session_type);


-- ─── Weekly Plans ─────────────────────────────────────────────────────────────

create table weekly_plans (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id) on delete cascade,
  client_id    uuid not null references clients(id) on delete cascade,

  week_start   date not null, -- always a Monday  (enforced by check below)
  week_end     date not null, -- always a Sunday
  status       text not null default 'draft'
                 check (status in ('draft','published','archived')),
  coach_notes  text,
  published_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (client_id, week_start),
  -- week_start must be a Monday (dow = 1)
  check (extract(dow from week_start) = 1),
  -- week_end must be exactly 6 days after week_start
  check (week_end = week_start + interval '6 days')
);

create trigger weekly_plans_updated_at
  before update on weekly_plans
  for each row execute procedure handle_updated_at();

create index weekly_plans_client_idx on weekly_plans (client_id, week_start desc);
create index weekly_plans_status_idx on weekly_plans (coach_id, status);


-- ─── Sessions ─────────────────────────────────────────────────────────────────

create table sessions (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null references auth.users(id) on delete cascade,
  client_id        uuid not null references clients(id) on delete cascade,
  program_id       uuid references programs(id) on delete set null,
  weekly_plan_id   uuid references weekly_plans(id) on delete set null,

  name             text not null,
  session_date     date not null,
  session_type     text not null
                     check (session_type in (
                       'swim','bike','run',
                       'strength','conditioning','mobility',
                       'rest','other'
                     )),
  source           text not null default 'coachOS'
                     check (source in ('trainingpeaks','coachOS','ai_generated')),

  duration_minutes int,
  intensity        text check (intensity in ('easy','moderate','hard','race')),

  -- Strength session data (null for endurance sessions)
  exercises        jsonb default '[]',
  -- same shape as template exercises

  -- TrainingPeaks fields (Phase 2; null in Phase 1)
  tp_workout_id    text,
  tp_raw           jsonb,

  notes            text,         -- visible to client in portal
  coach_notes      text,         -- coach-only

  -- Completion (filled in by client via portal)
  completed        boolean not null default false,
  completed_at     timestamptz,
  rpe              int check (rpe between 1 and 10),
  completion_notes text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger sessions_updated_at
  before update on sessions
  for each row execute procedure handle_updated_at();

create index sessions_client_date_idx on sessions (client_id, session_date desc);
create index sessions_plan_idx on sessions (weekly_plan_id);
create index sessions_program_idx on sessions (program_id) where program_id is not null;
create index sessions_type_idx on sessions (coach_id, session_type);


-- ─── Check-ins ────────────────────────────────────────────────────────────────

create table checkins (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  coach_id        uuid not null references auth.users(id) on delete cascade,

  submitted_at    timestamptz not null default now(),

  -- Scores (1-5)
  energy          int check (energy between 1 and 5),
  sleep           int check (sleep between 1 and 5),
  stress          int check (stress between 1 and 5),
  nutrition       int check (nutrition between 1 and 5),

  notes           text,
  photo_urls      text[] default '{}',
  weight_kg       numeric(5,2),

  -- Coach response
  ai_draft        text,           -- Claude-generated draft for Pete to review
  coach_response  text,           -- Pete's final response (edited from ai_draft or written fresh)
  responded_at    timestamptz
);

create index checkins_client_idx on checkins (client_id, submitted_at desc);
create index checkins_coach_idx on checkins (coach_id, submitted_at desc);
-- For finding unanswered check-ins
create index checkins_unresponded_idx on checkins (coach_id)
  where coach_response is null;


-- ─── Client Notes (Communication Log) ────────────────────────────────────────

create table client_notes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,

  note        text not null,
  note_type   text not null default 'general'
                check (note_type in ('general','call','email','whatsapp','billing','flag')),

  created_at  timestamptz not null default now()
  -- no updated_at: notes are append-only, never edited
);

create index client_notes_client_idx on client_notes (client_id, created_at desc);
create index client_notes_coach_idx on client_notes (coach_id);


-- ─── Posts (Social Media Hub) ─────────────────────────────────────────────────

create table posts (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references auth.users(id) on delete cascade,

  title             text,                   -- internal label only, not published
  caption           text,
  platforms         text[] not null default '{}',
  -- valid values: 'instagram', 'tiktok', 'youtube_shorts'

  content_pillar    text
                      check (content_pillar in (
                        'training','client_wins','education','personal_brand'
                      )),
  asset_urls        text[] default '{}',    -- Supabase Storage URLs
  status            text not null default 'draft'
                      check (status in (
                        'draft','scheduled','publishing','published','failed'
                      )),
  scheduled_at      timestamptz,
  published_at      timestamptz,

  -- Per-platform post IDs returned after publishing
  platform_post_ids jsonb not null default '{}',
  -- shape: { instagram: "...", tiktok: "...", youtube_shorts: "..." }

  -- Per-platform metrics pulled back after publishing
  metrics           jsonb not null default '{}',
  -- shape: { instagram: { likes, reach, impressions, saves }, tiktok: { views, likes, shares }, ... }
  metrics_updated_at timestamptz,

  ai_generated      boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger posts_updated_at
  before update on posts
  for each row execute procedure handle_updated_at();

create index posts_status_idx on posts (coach_id, status);
create index posts_scheduled_idx on posts (coach_id, scheduled_at)
  where status = 'scheduled';


-- ─── AI Conversations (Command Centre) ───────────────────────────────────────

create table ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,

  title       text,   -- auto-generated from first user message (truncated to 60 chars)
  messages    jsonb not null default '[]',
  -- message shape:
  -- [{
  --   role: 'user' | 'assistant',
  --   content: string,
  --   timestamp: string (ISO),
  --   tool_calls?: [...] -- stored for debugging
  -- }]

  -- Optional links to entities this conversation is about
  context     jsonb not null default '{}',
  -- shape: { client_id?: string, post_id?: string, plan_id?: string }

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger ai_conversations_updated_at
  before update on ai_conversations
  for each row execute procedure handle_updated_at();

create index ai_conversations_coach_idx on ai_conversations (coach_id, updated_at desc);
