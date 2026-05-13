-- Migration 005: Security and performance hardening
-- Brings existing databases in line with the hardened function, index, and RLS setup.

alter function public.handle_updated_at() set search_path = public;
alter function public.link_portal_user() set search_path = public;
alter function public.is_checkin_overdue(date) set search_path = public;

revoke all on function public.link_portal_user() from public, anon, authenticated;

drop index if exists public.clients_name_trgm_idx;
drop extension if exists pg_trgm;
create extension if not exists pg_trgm with schema extensions;
create index if not exists clients_name_trgm_idx
  on public.clients using gin (full_name extensions.gin_trgm_ops);

create index if not exists sessions_program_idx
  on public.sessions (program_id)
  where program_id is not null;

create index if not exists client_notes_coach_idx
  on public.client_notes (coach_id);

drop policy if exists coach_full_access_clients on public.clients;
create policy "coach_full_access_clients"
  on public.clients for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_programs on public.programs;
create policy "coach_full_access_programs"
  on public.programs for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_templates on public.templates;
create policy "coach_full_access_templates"
  on public.templates for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_plans on public.weekly_plans;
drop policy if exists client_read_own_plans on public.weekly_plans;
drop policy if exists plans_visible_to_owner_or_client on public.weekly_plans;
drop policy if exists coach_insert_plans on public.weekly_plans;
drop policy if exists coach_update_plans on public.weekly_plans;
drop policy if exists coach_delete_plans on public.weekly_plans;

create policy "plans_visible_to_owner_or_client"
  on public.weekly_plans for select to authenticated
  using (
    coach_id = (select auth.uid())
    or (
      status = 'published'
      and client_id in (
        select id from public.clients
        where portal_user_id = (select auth.uid())
      )
    )
  );

create policy "coach_insert_plans"
  on public.weekly_plans for insert to authenticated
  with check (coach_id = (select auth.uid()));

create policy "coach_update_plans"
  on public.weekly_plans for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create policy "coach_delete_plans"
  on public.weekly_plans for delete to authenticated
  using (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_sessions on public.sessions;
drop policy if exists client_read_own_sessions on public.sessions;
drop policy if exists sessions_visible_to_owner_or_client on public.sessions;
drop policy if exists coach_insert_sessions on public.sessions;
drop policy if exists coach_update_sessions on public.sessions;
drop policy if exists coach_delete_sessions on public.sessions;

create policy "sessions_visible_to_owner_or_client"
  on public.sessions for select to authenticated
  using (
    coach_id = (select auth.uid())
    or (
      client_id in (
        select id from public.clients
        where portal_user_id = (select auth.uid())
      )
      and weekly_plan_id in (
        select id from public.weekly_plans
        where status = 'published'
      )
    )
  );

create policy "coach_insert_sessions"
  on public.sessions for insert to authenticated
  with check (coach_id = (select auth.uid()));

create policy "coach_update_sessions"
  on public.sessions for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create policy "coach_delete_sessions"
  on public.sessions for delete to authenticated
  using (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_checkins on public.checkins;
drop policy if exists client_insert_checkin on public.checkins;
drop policy if exists client_read_own_checkins on public.checkins;
drop policy if exists checkins_visible_to_coach_or_client on public.checkins;
drop policy if exists checkins_insertable_by_coach_or_client on public.checkins;
drop policy if exists coach_update_checkins on public.checkins;
drop policy if exists coach_delete_checkins on public.checkins;

create policy "checkins_visible_to_coach_or_client"
  on public.checkins for select to authenticated
  using (
    coach_id = (select auth.uid())
    or client_id in (
      select id from public.clients
      where portal_user_id = (select auth.uid())
    )
  );

create policy "checkins_insertable_by_coach_or_client"
  on public.checkins for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    or client_id in (
      select id from public.clients
      where portal_user_id = (select auth.uid())
        and coach_id = checkins.coach_id
    )
  );

create policy "coach_update_checkins"
  on public.checkins for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create policy "coach_delete_checkins"
  on public.checkins for delete to authenticated
  using (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_notes on public.client_notes;
create policy "coach_full_access_notes"
  on public.client_notes for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_posts on public.posts;
create policy "coach_full_access_posts"
  on public.posts for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists coach_full_access_ai_conversations on public.ai_conversations;
create policy "coach_full_access_ai_conversations"
  on public.ai_conversations for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
