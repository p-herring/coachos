# CRM Module — Component Design
# app/(dashboard)/clients/

This document defines every component in the CRM module, its responsibilities,
data sources, and how it connects to the rest of the app.
Claude Code should read this before building any CRM component.

---

## Route Structure

```
app/(dashboard)/clients/
├── page.tsx                    → Client list + pipeline view (default: list)
├── [id]/
│   ├── page.tsx                → Client profile overview
│   ├── plan/page.tsx           → Jump to current week's plan for this client
│   └── checkins/page.tsx       → Check-in history for this client
└── new/page.tsx                → Add new client form
```

---

## page.tsx — Client List / Pipeline

### Responsibilities
- Display all clients with toggle between List view and Kanban (pipeline) view
- Filter bar: status, billing_status, client_type, checkin_overdue
- Search by name (fuzzy, debounced, uses pg_trgm index)
- Status badges: overdue check-in (orange), billing overdue (red), trial expiring (yellow)
- "Add Client" button → /clients/new
- Click any client row/card → /clients/[id]

### Data
```typescript
// Server component — fetch on server, no loading state needed
const clients = await supabase
  .from('clients')
  .select('id, full_name, email, client_type, status, billing_status, next_checkin_date, created_at')
  .eq('coach_id', coachId)
  .order('full_name')
```

### Component Tree
```
ClientsPage (server component)
├── ClientsHeader
│   ├── PageTitle ("Clients")
│   ├── ViewToggle (list | kanban)        ← client component, persists to localStorage
│   └── AddClientButton
├── ClientFilters                          ← client component
│   ├── SearchInput (debounced 300ms)
│   ├── StatusFilter (dropdown)
│   ├── BillingFilter (dropdown)
│   └── TypeFilter (dropdown)
└── ClientsContent                         ← switches based on view toggle
    ├── ClientListView                     ← table layout
    │   └── ClientRow (×n)
    │       ├── ClientAvatar (initials)
    │       ├── ClientName + email
    │       ├── ClientTypeBadge
    │       ├── StatusBadge
    │       ├── BillingBadge
    │       ├── CheckinDueIndicator        ← red dot if overdue
    │       └── QuickActions (⋯ menu: View, Add Note, Mark Checked In)
    └── ClientKanbanView                   ← columns: Lead | Trial | Active | Paused | Alumni
        └── KanbanColumn (×5)
            └── ClientCard (×n)
                ├── ClientName
                ├── ClientTypeBadge
                ├── BillingBadge
                └── CheckinDueIndicator
```

### UI Notes
- List view: dense table, sortable columns (name, status, next check-in)
- Kanban: drag-and-drop between columns updates client.status via optimistic update
- Both views: clicking a row/card navigates to /clients/[id]
- Empty state: friendly prompt to add first client (shown when no clients exist)
- Overdue badge logic: `next_checkin_date < today` AND status = 'active'

---

## [id]/page.tsx — Client Profile

### Responsibilities
- Full client information at a glance
- Quick-edit inline for key fields (status, billing, next check-in date)
- Health notes shown in a prominent warning banner if not null
- Tab navigation: Overview | Plan | Check-ins
- Communication log (client_notes) — append-only, newest first
- "Add Note" inline form in log
- "Open in Command Centre" button → pre-fills Command Centre with client context

### Data
```typescript
// Server component
const { data: client } = await supabase
  .from('clients')
  .select(`
    *,
    programs (*),
    checkins (id, submitted_at, energy, sleep, stress, nutrition, coach_response, responded_at),
    client_notes (id, note, note_type, created_at)
  `)
  .eq('id', clientId)
  .single()
```

### Component Tree
```
ClientProfilePage (server component)
├── ClientProfileHeader
│   ├── ClientAvatar (large, initials)
│   ├── ClientName + email + phone
│   ├── ClientTypeBadge + StatusBadge + BillingBadge
│   ├── OnboardedDate
│   └── HeaderActions
│       ├── EditClientButton → opens EditClientSheet
│       ├── ViewPlanButton → /clients/[id]/plan
│       └── CommandCentreButton → /command?client=[id]
│
├── HealthNotesBanner                      ← shown only if health_notes not null
│   └── ⚠ warning colour, prominent, cannot be dismissed
│
├── ClientStatsRow                         ← quick stats bar
│   ├── CheckinStreak (consecutive on-time check-ins)
│   ├── LastCheckin (relative time)
│   ├── ActiveWeeks (weeks since onboarding)
│   └── CompletionRate (sessions completed / planned, last 4 weeks)
│
├── ClientProfileTabs                      ← client component
│   ├── Tab: Overview
│   │   ├── ClientDetailsCard
│   │   │   ├── Goals (tags)
│   │   │   ├── Billing info
│   │   │   ├── Check-in cadence
│   │   │   └── TrainingPeaks username
│   │   ├── LatestCheckinCard              ← most recent check-in scores + notes
│   │   │   ├── ScoreGrid (energy/sleep/stress/nutrition radial or bar)
│   │   │   ├── ClientNotes text
│   │   │   └── CoachResponseSection
│   │   │       ├── ResponseText (if responded)
│   │   │       └── DraftResponseButton (if not responded) → opens ResponseSheet
│   │   └── CurrentProgramCard
│   │       ├── ProgramName + phase
│   │       ├── StartDate + EndDate
│   │       └── ViewPlanLink
│   │
│   ├── Tab: Check-ins
│   │   ├── CheckinTrendChart              ← line chart: scores over last 8 check-ins
│   │   └── CheckinList
│   │       └── CheckinItem (×n)
│   │           ├── SubmittedDate
│   │           ├── ScoreChips
│   │           ├── NotesPreview (truncated)
│   │           ├── PhotoCount badge
│   │           └── ResponseStatus
│   │
│   └── Tab: Notes (communication log)
│       ├── AddNoteForm                    ← inline, expandable
│       │   ├── NoteTextarea
│       │   ├── NoteTypeSelect
│       │   └── SaveNoteButton
│       └── NotesList
│           └── NoteItem (×n)
│               ├── NoteTypeBadge (colour coded)
│               ├── NoteText
│               └── CreatedAt
│
└── EditClientSheet                        ← slide-over panel, client component
    ├── All editable client fields
    ├── Validation via Zod
    └── SaveButton → PATCH /api/internal/clients/update
```

---

## new/page.tsx — Add New Client

### Responsibilities
- Multi-step form (3 steps, not all on one page — reduces overwhelm)
- Step 1: Identity (name, email, phone, DOB, emergency contact)
- Step 2: Coaching profile (client type, goals, health notes, TP username)
- Step 3: Admin (billing model, check-in cadence, onboarding date, invite to portal now or later)
- On submit: creates client row + optionally sends portal invite email

### Component Tree
```
NewClientPage
└── NewClientForm                          ← client component (multi-step state)
    ├── StepIndicator (1 / 2 / 3)
    ├── Step1_Identity
    │   └── fields: full_name, email, phone, date_of_birth, emergency_contact
    ├── Step2_CoachingProfile
    │   └── fields: client_type, goals (tag input), health_notes, tp_username
    ├── Step3_Admin
    │   ├── fields: billing_model, billing_status, checkin_cadence, onboarded_at
    │   └── SendPortalInviteToggle
    ├── BackButton / NextButton / SubmitButton
    └── FormErrorSummary
```

### Validation (Zod schema)
```typescript
// types/client.ts
export const newClientSchema = z.object({
  full_name:          z.string().min(2).max(100),
  email:              z.string().email(),
  phone:              z.string().optional(),
  date_of_birth:      z.string().optional(),    // ISO date
  emergency_contact:  z.object({
    name:             z.string(),
    phone:            z.string(),
    relationship:     z.string(),
  }).optional(),
  client_type:        z.enum(['general', 'triathlon', 'mixed']),
  goals:              z.array(z.string()).default([]),
  health_notes:       z.string().optional(),
  tp_username:        z.string().optional(),
  billing_model:      z.enum(['trial', 'subscription', 'one_time', 'retainer']),
  billing_status:     z.enum(['pending', 'active', 'overdue', 'cancelled']).default('pending'),
  checkin_cadence:    z.enum(['weekly', 'fortnightly']).default('weekly'),
  onboarded_at:       z.string().optional(),
  send_invite:        z.boolean().default(false),
})
```

---

## Client Onboarding Flow (End-to-End)

```
1. Pete fills in New Client form (3 steps above)
   └── On submit → POST /api/internal/clients/create
       ├── Validates with newClientSchema
       ├── Inserts into clients table (coach_id from session)
       └── If send_invite = true:
           └── POST /api/internal/clients/invite
               ├── Generates a Supabase Auth invite link (supabase.auth.admin.generateLink)
               ├── Sends email via Resend with:
               │   Subject: "Your [Pete's coaching] portal is ready"
               │   Body: personalised welcome + "Create your account" button
               │   Link: expires 7 days
               └── Records note in client_notes: "Portal invite sent"

2. Client receives email, clicks link
   └── Supabase Auth handles the sign-up flow
       ├── If OAuth: Google or Apple login
       ├── If email: set password screen
       └── On completion → redirect to /portal

3. On first login (auth.users insert trigger fires)
   └── link_portal_user() function runs automatically
       └── Matches new auth.users.email → clients.email
           └── Sets clients.portal_user_id = new user's id

4. Client lands on /portal
   └── Portal middleware checks:
       ├── Is user authenticated? (Supabase session)
       └── Does a clients row exist with portal_user_id = auth.uid()?
           ├── YES → show portal home (this week's plan)
           └── NO  → show "Account not linked" error page
               └── (Pete needs to check the email matches)

5. Pete sees portal_user_id populated on client profile
   └── Status indicator: "Portal: Active ✓"
```

---

## Status Badge Colour Reference

| Status       | Colour       | Tailwind class                        |
|---|---|---|
| lead         | blue         | `bg-blue-100 text-blue-700`           |
| trial        | purple       | `bg-purple-100 text-purple-700`       |
| active       | green        | `bg-green-100 text-green-700`         |
| paused       | yellow       | `bg-yellow-100 text-yellow-700`       |
| alumni       | grey         | `bg-gray-100 text-gray-600`           |
| billing: overdue | red      | `bg-red-100 text-red-700`             |
| checkin overdue  | orange   | `bg-orange-100 text-orange-700`       |
| portal: active   | green    | `bg-green-50 text-green-600 text-xs`  |
| portal: pending  | gray     | `bg-gray-50 text-gray-500 text-xs`    |

---

## API Routes for CRM Module

```
POST /api/internal/clients/create          → insert client
POST /api/internal/clients/list            → query clients with filters
POST /api/internal/clients/get             → fetch single client + relations
POST /api/internal/clients/update          → patch client fields
POST /api/internal/clients/invite          → send portal invite email
POST /api/internal/clients/notes/add       → insert client_note
```

All routes:
- Require Bearer token (Supabase session JWT) in Authorization header
- Validate coach_id = COACH_USER_ID (env var) as a belt-and-suspenders check
- Return { data } on success, { error: string } with appropriate HTTP status on failure
- Never return 200 with an error body
