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
  on clients for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

-- Clients cannot access this table directly
-- (portal reads client data via server-side service role in specific API routes)


-- ─── programs ────────────────────────────────────────────────────────────────

alter table programs enable row level security;

create policy "coach_full_access_programs"
  on programs for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));


-- ─── templates ───────────────────────────────────────────────────────────────

alter table templates enable row level security;

create policy "coach_full_access_templates"
  on templates for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));


-- ─── weekly_plans ────────────────────────────────────────────────────────────

alter table weekly_plans enable row level security;

create policy "plans_visible_to_owner_or_client"
  on weekly_plans for select to authenticated
  using (
    coach_id = (select auth.uid())
    or (
      status = 'published'
      and client_id in (
        select id from clients
        where portal_user_id = (select auth.uid())
      )
    )
  );

create policy "coach_insert_plans"
  on weekly_plans for insert to authenticated
  with check (coach_id = (select auth.uid()));

create policy "coach_update_plans"
  on weekly_plans for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create policy "coach_delete_plans"
  on weekly_plans for delete to authenticated
  using (coach_id = (select auth.uid()));


-- ─── sessions ────────────────────────────────────────────────────────────────

alter table sessions enable row level security;

create policy "sessions_visible_to_owner_or_client"
  on sessions for select to authenticated
  using (
    coach_id = (select auth.uid())
    or (
      client_id in (
        select id from clients
        where portal_user_id = (select auth.uid())
      )
      and weekly_plan_id in (
        select id from weekly_plans
        where status = 'published'
      )
    )
  );
-- Session completion updates should go through a server-side route using the
-- service role. PostgreSQL RLS cannot safely enforce field-level updates here,
-- so we intentionally keep direct client updates disabled for now.

create policy "coach_insert_sessions"
  on sessions for insert to authenticated
  with check (coach_id = (select auth.uid()));

create policy "coach_update_sessions"
  on sessions for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create policy "coach_delete_sessions"
  on sessions for delete to authenticated
  using (coach_id = (select auth.uid()));


-- ─── checkins ────────────────────────────────────────────────────────────────

alter table checkins enable row level security;

create policy "checkins_visible_to_coach_or_client"
  on checkins for select to authenticated
  using (
    coach_id = (select auth.uid())
    or client_id in (
      select id from clients
      where portal_user_id = (select auth.uid())
    )
  );

create policy "checkins_insertable_by_coach_or_client"
  on checkins for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    or client_id in (
      select id from clients
      where portal_user_id = (select auth.uid())
        and coach_id = checkins.coach_id
    )
  );

create policy "coach_update_checkins"
  on checkins for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create policy "coach_delete_checkins"
  on checkins for delete to authenticated
  using (coach_id = (select auth.uid()));


-- ─── client_notes ────────────────────────────────────────────────────────────

alter table client_notes enable row level security;

-- Coach only — clients never see the communication log
create policy "coach_full_access_notes"
  on client_notes for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));


-- ─── posts ───────────────────────────────────────────────────────────────────

alter table posts enable row level security;

-- Coach only — social content is never exposed to clients
create policy "coach_full_access_posts"
  on posts for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));


-- ─── ai_conversations ────────────────────────────────────────────────────────

alter table ai_conversations enable row level security;

-- Coach only
create policy "coach_full_access_ai_conversations"
  on ai_conversations for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
