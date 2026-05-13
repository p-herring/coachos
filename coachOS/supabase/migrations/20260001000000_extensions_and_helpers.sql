-- Migration 001: Extensions and helper functions
-- Run this first. Sets up UUID generation, updated_at trigger,
-- and the client invite function used in onboarding.

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy client name search


-- ─── updated_at trigger ───────────────────────────────────────────────────────
-- Attach to any table that has an updated_at column.

create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ─── Client invite + portal linking function ──────────────────────────────────
-- Called after a client signs up via OAuth/email.
-- Matches their auth.users email to a clients row and sets portal_user_id.
-- This fires automatically — Pete never has to do it manually.

create or replace function link_portal_user()
returns trigger as $$
begin
  update clients
  set portal_user_id = new.id
  where email = new.email
    and portal_user_id is null;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure link_portal_user();


-- ─── Checkin overdue helper ───────────────────────────────────────────────────
-- Returns true if a client's next_checkin_date has passed.
-- Used in CRM to flag overdue clients without a separate query.

create or replace function is_checkin_overdue(next_date date)
returns boolean as $$
begin
  return next_date < current_date;
end;
$$ language plpgsql immutable;
