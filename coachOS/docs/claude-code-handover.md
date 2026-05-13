# coachOS Handover for Claude Code

This document is the operational handover for the current `coachOS` repo state.
Read this together with [CLAUDE.md](/Users/peter.herring/Documents/APP%20DEV/Codex/Personal/coachos/coachOS/CLAUDE.md) before making changes.

## Project Intent

`coachOS` is Pete's solo-coach operating system with two surfaces:

- `/dashboard` for Pete only
- `/portal` for clients

The architecture is intentionally single-coach first. All primary tables include `coach_id`, but multi-coach features are explicitly out of scope for now.

## Repo + Infra State

Repo:
- GitHub: [p-herring/coachos](https://github.com/p-herring/coachos)
- Active branch: `main`

Recent commits:
- `c0ad97a` Fix coach account creation input handling
- `21df9d0` Harden Supabase migrations and RLS policies
- `ce2bcb3` Fix auth bootstrap and provision Supabase schema
- `3e6568e` Add Supabase bootstrap auth flow
- `f39c0a4` Add preview-mode fallback without Supabase config
- `cca6e71` Scaffold coachOS phase 1 foundation

Vercel:
- Project: `p-herrings-projects/coachos`
- Public alias: [coachos-brown.vercel.app](https://coachos-brown.vercel.app)
- Root directory: `coachOS`

Supabase:
- Project ref: `xgbpkunuuobxmolpyudj`
- URL: `https://xgbpkunuuobxmolpyudj.supabase.co`

## Current Environment State

Known Vercel env vars already added:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Known Vercel env vars still missing:
- `COACH_USER_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- all Phase 2 provider/API keys

Important consequence:
- coach bootstrap cannot complete until the first auth user exists and that UUID is saved as `COACH_USER_ID`

## Database State

Repo migrations present:
- `20260001000000_extensions_and_helpers.sql`
- `20260002000000_core_tables.sql`
- `20260003000000_rls_policies.sql`
- `20260004000000_seed_data.sql`
- `20260005000000_security_and_performance_hardening.sql`

Live Supabase state:
- migrations `001`, `002`, and `003` were applied successfully
- tables now exist in `public`
- `005` was added to the repo after Supabase advisor review, but may not yet be applied live
- `004` seed data has not been applied live and should not be applied blindly to production

Important live DB fact at last check:
- `auth.users` was empty, so there was no coach account yet

## What Has Been Implemented

Scaffold:
- Next.js app structure exists
- shadcn/ui installed
- dashboard, portal, auth, and API route directories exist
- TypeScript, Tailwind, middleware, Supabase clients, AI clients, and shared utilities are in place

Auth/bootstrap:
- `/login` exists and supports email/password sign-in plus a `Create coach account` action
- OAuth buttons exist, but Google/Apple are not enabled in Supabase yet
- `/auth/callback` exists
- `/auth/signout` now exists
- bootstrap mode exists when Supabase is configured but `COACH_USER_ID` is not yet set

Dashboard:
- dashboard shell is implemented
- overview page is implemented and queries real tables
- command centre UI is implemented
- AI chat route is implemented

AI:
- Anthropic/Claude route exists
- OpenAI image route exists
- tool schema exists
- conversation persistence was partially improved so new conversation IDs can be surfaced to the client

Infrastructure:
- GitHub repo linked
- Vercel project linked and configured to the correct root directory
- Supabase project created and base schema applied

## What Is Still Stubbed

Most of Phase 1 is still scaffolded rather than fully functional.

At review time:
- many dashboard and portal pages still show `Coming soon.`
- most internal API routes still return `501 Not implemented`

Examples:
- client CRUD/list/detail routes
- plan create/get/publish/build-week
- session create/update/delete/generate
- checkin list/draft-response/send-response
- post list/create/update/schedule/metrics
- template list/create/update
- portal `me`, `checkins/submit`, `sessions/complete`

Treat the current app as:
- good scaffold
- partially working auth/bootstrap
- partially working dashboard shell
- real database foundation
- not yet feature-complete

## Known Issues / Risks

### 1. Live login behavior may still depend on latest Vercel redeploy

I was able to push the fixes, but this environment hit temporary usage/network limits before I could fully verify the public alias HTML after the last push.

Implication:
- first task should be verifying the live `/login` page in browser

### 2. Google and Apple OAuth are expected to fail

Supabase auth logs showed:
- `provider is not enabled`

Implication:
- do not treat Google/Apple sign-in failure as a code bug yet
- email/password bootstrap is the intended first path

### 3. `COACH_USER_ID` is still unset

Until this is set:
- coach-only lock is incomplete
- bootstrap banner/flow remains active

### 4. `SUPABASE_SERVICE_ROLE_KEY` is still unset

Implication:
- any future route that relies on service-role access will need Vercel env setup before production use

### 5. Supabase hardening migration may still need applying live

`20260005000000_security_and_performance_hardening.sql` was created after Supabase advisor findings:
- function `search_path` hardening
- revoke public execute on `link_portal_user()`
- move `pg_trgm` usage to `extensions` schema
- improve indexes
- tighten RLS role scopes and policy structure

Apply this carefully to the live project before relying on current DB security posture.

## Most Likely Immediate Next Steps

1. Verify live login page on Vercel
- confirm `Create coach account` actually submits now
- confirm sign-in form is interactive
- confirm preview-mode banner is gone when envs are present

2. Create the first coach account
- use email/password
- if email confirmation is required, complete it

3. Fetch the new auth user UUID
- read it from dashboard bootstrap page or Supabase `auth.users`

4. Add `COACH_USER_ID` to Vercel
- redeploy after setting it

5. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel
- needed for future portal/server-side operations

6. Apply migration `005` to live Supabase

7. Re-run live verification
- `/login`
- `/dashboard`
- sign out
- bootstrap banner behavior

## Recommended Immediate Engineering Tasks

These are the highest-value development tasks after bootstrap is working:

### Task A. Finish client roster / CRM backbone

Implement:
- `app/api/internal/clients/list/route.ts`
- `app/api/internal/clients/get/route.ts`
- `app/api/internal/clients/create/route.ts`
- `app/api/internal/clients/update/route.ts`
- `app/api/internal/clients/notes/add/route.ts`
- `app/(dashboard)/dashboard/clients/page.tsx`
- `app/(dashboard)/dashboard/clients/[id]/page.tsx`

Goal:
- make the CRM surface genuinely usable first

### Task B. Finish portal identity API

Implement:
- `app/api/portal/me/route.ts`

This is the clean starting point for:
- linked client detection
- portal status logic
- future portal home hydration

### Task C. Finish check-in loop

Implement:
- `app/api/portal/checkins/submit/route.ts`
- `app/api/internal/checkins/list/route.ts`
- `app/api/internal/checkins/draft-response/route.ts`
- `app/api/internal/checkins/send-response/route.ts`
- portal check-in pages
- dashboard check-in review surfaces

This is one of the best early end-to-end workflows for proving the product.

### Task D. Finish planner minimum viable flow

Implement:
- plan get/create/publish routes
- session CRUD routes
- planner pages

Do not start with AI generation first.
Start with manual plan/session CRUD and publishing.

## Suggested Development Order

Recommended order for Claude Code:

1. stabilize bootstrap and production auth
2. apply live migration `005`
3. implement CRM list/detail/create/update
4. implement portal `me`
5. implement check-in submission and coach review
6. implement planner manual CRUD + publish
7. implement command centre tools against real internal routes
8. add AI keys and image generation
9. add TrainingPeaks and social integrations

## Future Phases

The future phases below synthesize the repo spec, prompt, and module docs.

### Phase 1 Completion

Goal:
- finish the scaffold into a usable internal alpha

Includes:
- auth bootstrap completed
- CRM module functional
- basic planner functional
- basic portal functional
- check-in loop functional
- command centre can call real tools

Success condition:
- Pete can manage clients, publish plans, and respond to check-ins from one app

### Phase 2 Integrations

Goal:
- remove manual double-entry and external publishing friction

Includes:
- TrainingPeaks OAuth/API integration
- CSV import fallback maintained
- social publishing integrations
- content metrics ingestion
- storage-backed uploads for portal and social assets
- service-role routes fully wired

Success condition:
- external systems start feeding and receiving real data

### Phase 3 AI Operational Layer

Goal:
- make Claude the primary orchestration layer rather than a side feature

Includes:
- finish all tool endpoints used by `lib/ai/tools.ts`
- strong auditability of tool results
- better conversation persistence/history
- human-in-the-loop approvals for client-facing and publish actions
- richer context linking between clients, plans, posts, and conversations

Success condition:
- Pete can reliably use Command Centre for real work, not demo flows

### Phase 4 Automation + Realtime

Goal:
- reduce manual follow-up work

Includes:
- realtime dashboard updates for new check-ins
- automated reminders / scheduling
- recurring plan and content workflows
- internal notifications
- possibly Vercel cron/automation hooks where appropriate

Success condition:
- the app actively drives Pete's workflow instead of passively storing data

### Phase 5 Refinement / Production Hardening

Goal:
- improve resilience, polish, and maintainability

Includes:
- complete DB type generation and drift checks
- tighten RLS and permissions further if needed
- add tests around critical auth/API flows
- remove remaining stub warnings and TODOs
- finish responsive polish and UX smoothing
- review migration hygiene and data seeding patterns

Success condition:
- stable production-ready internal tool with low operational surprise

## Module References

Use these docs when implementing their corresponding areas:

- [CRM module design](/Users/peter.herring/Documents/APP%20DEV/Codex/Personal/coachos/coachOS/docs/crm-module-design.md)
- [Planner module design](/Users/peter.herring/Documents/APP%20DEV/Codex/Personal/coachos/coachOS/docs/planner-module-design.md)
- [Portal design](/Users/peter.herring/Documents/APP%20DEV/Codex/Personal/coachos/coachOS/docs/portal-design.md)
- [Social hub design](/Users/peter.herring/Documents/APP%20DEV/Codex/Personal/coachos/coachOS/docs/social-hub-design.md)

## Practical Notes for Claude Code

- Prefer implementing real vertical slices over adding more scaffolding.
- Do not redesign architecture away from `CLAUDE.md`.
- Preserve the single-coach assumption.
- Do not enable Google/Apple sign-in in code as a workaround; that is a Supabase provider config task.
- Avoid applying seed data to production without replacing the placeholder coach UUID and confirming intent.
- If you regenerate Supabase types, update [types/database.ts](/Users/peter.herring/Documents/APP%20DEV/Codex/Personal/coachos/coachOS/types/database.ts) and re-run typecheck.
- Be careful around existing user-created or infrastructure-related changes; this repo has already gone through live setup steps.

## Short Version

If you only need the immediate baton-pass:

- verify production `/login`
- get first coach account created
- set `COACH_USER_ID` in Vercel
- add `SUPABASE_SERVICE_ROLE_KEY`
- apply migration `005`
- finish CRM first
- then finish portal/check-ins
- then planner
- then command centre tool wiring

