# Client Portal — Component Design
# app/(portal)/

The portal is the client-facing surface. Clients never see the dashboard.
Design principles:
- Mobile-first. Clients will primarily use this on their phones.
- Simple. No data overload. One clear job per screen.
- Warm. This is their coaching experience, not a software tool.

---

## Route Structure

```
app/(portal)/
├── layout.tsx                  → Portal shell: minimal header, bottom nav (mobile)
├── page.tsx                    → Home: this week's plan overview
├── plan/page.tsx               → Full weekly plan view
├── checkin/page.tsx            → Submit check-in form
├── checkin/history/page.tsx    → Past check-ins + coach responses
└── progress/page.tsx           → Progress photos + trend charts
```

---

## layout.tsx — Portal Shell

Minimal header (logo + client name + logout) and bottom navigation bar on mobile.
No sidebar. No dense menus. Clients should never feel lost.

```
PortalLayout
├── PortalHeader (sticky top)
│   ├── Logo / "coachOS" wordmark (small)
│   ├── ClientName (greeting: "Hey Sarah 👋")
│   └── LogoutButton (icon only on mobile)
│
└── BottomNav (mobile) / TopNav (desktop)
    ├── NavItem: Home (house icon)
    ├── NavItem: Plan (calendar icon)
    ├── NavItem: Check-in (clipboard icon) + badge if overdue
    └── NavItem: Progress (chart icon)
```

---

## page.tsx — Portal Home

The first thing a client sees. This week at a glance.

### Component Tree
```
PortalHomePage (server component)
├── WeekGreeting
│   ├── "Good morning, Sarah" (time-aware)
│   └── WeekSummaryLine: "You have 6 sessions this week · 2 complete"
│
├── CheckinPromptCard (shown if check-in is due or overdue)
│   ├── "Time for your weekly check-in"
│   ├── LastCheckinDate
│   └── "Check in now" button → /portal/checkin
│
├── TodaysSessionCard (highlighted, shown if session today)
│   ├── SessionTypeIcon + SessionName
│   ├── Duration + Intensity badges
│   ├── Notes (first 100 chars)
│   └── "Mark Complete" button (quick action)
│
├── WeekAtAGlance
│   └── MiniDayRow (×7, Mon–Sun)
│       ├── DayLabel (M/T/W etc)
│       ├── SessionDot(s) (coloured by type, stacked if multiple)
│       └── CompletedTick (if all sessions that day marked done)
│
└── CoachMessageCard (shown if Pete has sent a check-in response)
    ├── "Message from Pete"
    ├── ResponseText (full)
    └── RespondedDate
```

---

## plan/page.tsx — Weekly Plan

Full plan view with session details and completion logging.

### Component Tree
```
PortalPlanPage (server component + client interactivity)
├── PlanHeader
│   ├── WeekLabel: "Week of May 13–19"
│   ├── WeekNavigator (← prev | next →) — shows past weeks, not future
│   └── CompletionSummary: "4 / 7 sessions complete"
│
├── WeekProgressBar (visual fill by completion %)
│
└── DayList
    └── DaySection (×7)
        ├── DayHeader: "Monday 13 May" + RestDayLabel if rest
        └── SessionCards (×n)
            └── SessionCard (expandable)
                ├── [Collapsed state]
                │   ├── SessionTypeIcon (colour coded)
                │   ├── SessionName
                │   ├── DurationBadge + IntensityBadge
                │   ├── CompletionCheckbox (tappable)
                │   └── ChevronDown (expand)
                │
                └── [Expanded state]
                    ├── SessionNotes (full text)
                    ├── [If strength session]: ExerciseList
                    │   └── ExerciseRow (×n)
                    │       ├── ExerciseName
                    │       ├── Sets × Reps
                    │       ├── Rest time
                    │       └── ExerciseNotes
                    ├── CompletionSection (shown if not yet complete)
                    │   ├── RPESlider (1–10, labelled Easy→Max)
                    │   ├── NotesTextarea ("How did it feel?")
                    │   └── "Mark Complete" button
                    └── CompletedBadge + RPE + Notes (shown if already complete)
```

### Session completion flow
```
Client taps "Mark Complete" or checkbox
└── POST /api/portal/sessions/complete
    ├── Body: { session_id, rpe?, completion_notes? }
    ├── RLS verified: client can only update their own sessions
    ├── Sets: completed=true, completed_at=now(), rpe, completion_notes
    └── Returns updated session
        └── Optimistic UI update (no page reload)
```

---

## checkin/page.tsx — Submit Check-in

Clean, one-screen form. Friendly language throughout.

### Component Tree
```
CheckinPage (client component)
├── CheckinHeader
│   └── "Weekly Check-in" + date
│
└── CheckinForm
    ├── ScoreSection
    │   └── ScoreCard (×4: Energy, Sleep, Stress, Nutrition)
    │       ├── Label + emoji (⚡ 💤 😓 🥗)
    │       ├── ScoreSlider (1–5)
    │       └── ScoreLabel (1="Terrible" → 5="Great")
    │
    ├── NotesSection
    │   ├── Label: "How was your week? Anything Pete should know?"
    │   └── Textarea (min 3 rows, no character limit)
    │
    ├── WeightSection (optional)
    │   ├── Label: "Weight (optional)"
    │   └── NumberInput + "kg" suffix
    │
    ├── PhotoSection (optional)
    │   ├── Label: "Progress photo (optional)"
    │   ├── PhotoUploadZone (tap to select, shows preview)
    │   └── UploadedPhotoThumbnails (×n, removable)
    │
    └── SubmitButton: "Send check-in to Pete"
        └── On success: SuccessScreen
            ├── ✅ "Check-in sent!"
            ├── "Pete will respond within 24 hours"
            └── "Back to home" button
```

### Check-in submission flow
```
Client submits form
└── POST /api/portal/checkins/submit
    ├── Validates scores (1-5), notes, optional fields
    ├── Uploads photos to Supabase Storage (post-assets bucket, client subfolder)
    ├── Inserts checkin row (coach_id auto-filled server-side from client record)
    ├── Updates clients.next_checkin_date (+ 7 or 14 days based on cadence)
    └── Triggers: POST /api/internal/notifications/checkin-received
        └── (Phase 1: Supabase Realtime event Pete's dashboard can listen to)
        └── (Phase 2: push notification or email to Pete)
```

---

## checkin/history/page.tsx — Check-in History

Simple list of past check-ins with Pete's responses.

### Component Tree
```
CheckinHistoryPage (server component)
├── HistoryHeader: "Check-in History"
└── CheckinHistoryList
    └── CheckinHistoryItem (×n, newest first)
        ├── SubmittedDate
        ├── ScoreChipRow (energy/sleep/stress/nutrition as small chips)
        ├── NotesPreview (first 80 chars, expandable)
        ├── PhotoCount badge (if photos)
        ├── CoachResponseSection
        │   ├── [Responded]: Pete's avatar + response text + responded date
        │   └── [Pending]: "Awaiting Pete's response..." (subtle, not alarming)
        └── ExpandCollapseToggle
```

---

## progress/page.tsx — Progress Tracking

Visual progress overview. Charts + photo gallery.

### Component Tree
```
ProgressPage (server component)
├── ProgressHeader: "Your Progress"
│
├── CheckinTrendChart
│   ├── Label: "Wellbeing scores over time"
│   ├── LineChart (4 lines: energy, sleep, stress, nutrition)
│   ├── X axis: last 8 check-ins
│   └── Legend
│
├── WorkoutCompletionChart
│   ├── Label: "Session completion rate"
│   ├── BarChart (last 8 weeks, % complete per week)
│   └── AverageCompletionLine
│
├── WeightChart (shown only if client has logged weight ≥ 3 times)
│   ├── Label: "Weight over time"
│   └── LineChart
│
└── PhotoGallery
    ├── Label: "Progress photos"
    ├── Note: "Only visible to you and Pete"
    └── PhotoGrid
        └── PhotoThumb (×n, tappable to full screen)
            └── DateLabel below each photo
```

---

## Portal API Routes

```
GET  /api/portal/me                       → fetch current client's profile
POST /api/portal/sessions/complete        → mark session complete + log RPE/notes
GET  /api/portal/plan/current             → fetch current week's published plan
POST /api/portal/checkins/submit          → submit check-in + upload photos
GET  /api/portal/checkins/history         → fetch client's check-in history
GET  /api/portal/progress                 → fetch charts data (scores + completion + weight)
```

All portal routes:
- Require Supabase session with a matching `clients.portal_user_id`
- Use service role internally to fetch coach_id (client doesn't know coach_id)
- Return only the client's own data (RLS + application-level checks)

---

## Portal Auth Middleware (lib/supabase/middleware.ts additions)

```typescript
// In middleware.ts, after session check:

// For portal routes:
if (pathname.startsWith('/portal')) {
  if (!session) {
    return NextResponse.redirect(new URL('/login?redirect=/portal', req.url))
  }

  // Verify client has a linked clients row
  const { data: client } = await supabase
    .from('clients')
    .select('id, status')
    .eq('portal_user_id', session.user.id)
    .single()

  if (!client) {
    // Auth'd user but not a registered client
    return NextResponse.redirect(new URL('/portal/not-linked', req.url))
  }

  if (client.status === 'paused' || client.status === 'alumni') {
    return NextResponse.redirect(new URL('/portal/inactive', req.url))
  }
}
```

---

## Portal Not-Linked Page

Shown if someone authenticates but has no matching client record.

```
/portal/not-linked

"We couldn't find your coaching account.

Make sure you're signing in with the email address
Pete has on file for you. If you think this is a mistake,
reach out to Pete directly."

[Back to login] button
```
