-- Migration 003: Row Level Security policies
-- Enables RLS on all tables and defines access rules for:
--   - Coach (Pete): full access to all his own data
--   - Clients: read-only access to their own portal data
--   - No public access anywhere

-- ─── Helper: is the current user Pete's coach account? ────────────────────────
-- We check coach_id = auth.uid() on every coach policy.
-- The COACH_USER_ID env var is used app-side as a belt-and-suspenders check,
-- but RLS is the real enforcement layer.


-- ─── clients ─────────────────────────────────────────────────────────────────

alter table clients enable row level security;

-- Coach: full access to their own clients
create policy "coach_full_access_clients"
  on clients for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Clients cannot access this table directly
-- (portal reads client data via server-side service role in specific API routes)


-- ─── programs ────────────────────────────────────────────────────────────────

alter table programs enable row level security;

create policy "coach_full_access_programs"
  on programs for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


-- ─── templates ───────────────────────────────────────────────────────────────

alter table templates enable row level security;

create policy "coach_full_access_templates"
  on templates for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


-- ─── weekly_plans ────────────────────────────────────────────────────────────

alter table weekly_plans enable row level security;

-- Coach: full access
create policy "coach_full_access_plans"
  on weekly_plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Client: read their own published plans
create policy "client_read_own_plans"
  on weekly_plans for select
  using (
    status = 'published'
    and client_id in (
      select id from clients
      where portal_user_id = auth.uid()
    )
  );


-- ─── sessions ────────────────────────────────────────────────────────────────

alter table sessions enable row level security;

-- Coach: full access
create policy "coach_full_access_sessions"
  on sessions for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Client: read sessions that belong to their published plans
create policy "client_read_own_sessions"
  on sessions for select
  using (
    client_id in (
      select id from clients
      where portal_user_id = auth.uid()
    )
    and weekly_plan_id in (
      select id from weekly_plans
      where status = 'published'
    )
  );
-- Session completion updates should go through a server-side route using the
-- service role. PostgreSQL RLS cannot safely enforce field-level updates here,
-- so we intentionally keep direct client updates disabled for now.


-- ─── checkins ────────────────────────────────────────────────────────────────

alter table checkins enable row level security;

-- Coach: full access
create policy "coach_full_access_checkins"
  on checkins for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Client: insert their own check-ins
create policy "client_insert_checkin"
  on checkins for insert
  with check (
    client_id in (
      select id from clients
      where portal_user_id = auth.uid()
    )
    -- Ensure client_id matches the authenticated user; coach_id must be set server-side
  );

-- Client: read their own check-ins (so they can see history + coach response)
create policy "client_read_own_checkins"
  on checkins for select
  using (
    client_id in (
      select id from clients
      where portal_user_id = auth.uid()
    )
  );


-- ─── client_notes ────────────────────────────────────────────────────────────

alter table client_notes enable row level security;

-- Coach only — clients never see the communication log
create policy "coach_full_access_notes"
  on client_notes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


-- ─── posts ───────────────────────────────────────────────────────────────────

alter table posts enable row level security;

-- Coach only — social content is never exposed to clients
create policy "coach_full_access_posts"
  on posts for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


-- ─── ai_conversations ────────────────────────────────────────────────────────

alter table ai_conversations enable row level security;

-- Coach only
create policy "coach_full_access_ai_conversations"
  on ai_conversations for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
