# Workout Planner Module — Component Design
# app/(dashboard)/planner/

---

## Route Structure

```
app/(dashboard)/planner/
├── page.tsx                    → Weekly planner overview (all clients, current week)
├── [clientId]/
│   ├── page.tsx                → Single client planner (week navigation)
│   └── templates/page.tsx      → Session template library for this client type
└── templates/page.tsx          → All templates library
```

---

## page.tsx — Planner Overview

Shows all active clients and their current week status at a glance.
Coach can see who has a published plan, who is draft, and who has nothing yet.

### Component Tree
```
PlannerOverviewPage (server component)
├── PlannerHeader
│   ├── WeekNavigator (← prev week | "Week of May 13" | next week →)
│   └── BulkActions: "Build all drafts with AI"
└── ClientPlanGrid
    └── ClientPlanCard (×n, one per active client)
        ├── ClientName + type badge
        ├── PlanStatusBadge: No Plan | Draft | Published
        ├── SessionCountSummary (e.g. "5 sessions · 2 strength · 3 endurance")
        ├── CompletionBar (% sessions completed this week, if published)
        └── Actions:
            ├── "Open Plan" → /planner/[clientId]
            ├── "Build with AI" (if no plan)
            └── "Publish" (if draft)
```

---

## [clientId]/page.tsx — Single Client Planner

The main planning workspace. Week view with drag-and-drop sessions.

### Component Tree
```
ClientPlannerPage (server + client hybrid)
├── PlannerClientHeader
│   ├── ClientName + health notes warning (if any)
│   ├── WeekNavigator
│   ├── PlanStatusBadge
│   └── PlanActions
│       ├── "Build Week with AI" button → opens BuildWeekSheet
│       ├── "Add Session" button → opens AddSessionSheet
│       ├── "Import from TrainingPeaks" (Phase 1: CSV; Phase 2: API)
│       ├── "Save Draft" button
│       └── "Publish to Portal" button (confirm dialog)
│
├── WeeklyPlanGrid (client component — drag and drop)
│   └── DayColumn (×7, Mon–Sun)
│       ├── DayHeader (day name, date, load indicator dot)
│       └── SessionCards (droppable zone)
│           └── SessionCard (draggable)
│               ├── SessionTypeIcon (colour coded by type)
│               ├── SessionName
│               ├── DurationBadge
│               ├── IntensityBadge
│               ├── SourceBadge (TP | coachOS | AI)
│               ├── CompletionStatus (if published)
│               └── CardActions (⋯ menu)
│                   ├── Edit → opens EditSessionSheet
│                   ├── Duplicate → to another day
│                   └── Delete (confirm)
│
├── WeekSummaryBar
│   ├── TotalSessions count
│   ├── TotalVolume (hours)
│   ├── TypeBreakdown (swim/bike/run/strength counts)
│   └── LoadWarning (if heavy TP days conflict with strength sessions)
│
├── BuildWeekSheet (slide-over)
│   ├── ContextInput textarea ("Any notes for this week?")
│   ├── AI loading state ("Building week plan...")
│   ├── ProposedPlanPreview (read-only week view)
│   └── Actions: "Accept & Load" | "Regenerate" | "Cancel"
│
├── AddSessionSheet (slide-over)
│   ├── SessionTypeSelect
│   ├── SourceSelect: Manual | From Template | Generate with AI
│   ├── [if Manual]: full session form
│   ├── [if From Template]: TemplateSelector → loads exercises into form
│   └── [if Generate with AI]: BriefInput → calls generate_session tool
│
└── EditSessionSheet (slide-over)
    ├── All session fields editable
    └── ExerciseEditor (for strength sessions)
        └── ExerciseRow (×n, sortable)
            ├── ExerciseName input
            ├── Sets / Reps inputs
            ├── Rest input
            ├── Notes input
            └── Delete row button
        └── AddExerciseButton
```

### Session Type Colour Coding
```
swim        → blue-400
bike        → yellow-500
run         → orange-400
strength    → purple-500
conditioning → green-500
mobility    → teal-400
rest        → gray-300
other       → gray-400
```

### TrainingPeaks CSV Import (Phase 1)
```
ImportTPCSVButton
└── Opens file picker (accepts .csv)
    └── On file select:
        ├── POST /api/internal/plans/import-tp-csv
        │   ├── Parses CSV (lib/trainingpeaks/csv-parser.ts)
        │   ├── Maps TP fields → sessions schema
        │   └── Returns array of session objects (NOT saved yet)
        └── Shows ImportPreviewModal
            ├── Lists detected sessions with dates + names
            ├── "Import X sessions" confirm button
            └── On confirm: creates sessions via create_session for each
```

### Expected TrainingPeaks CSV columns (export format)
```
Title, Date, Type, Distance, Duration, TSS, NP, IF, Description
```
The parser maps: Title→name, Date→session_date, Type→session_type, Duration→duration_minutes, Description→notes

---

## templates/page.tsx — Template Library

### Component Tree
```
TemplatesPage (server component)
├── TemplatesHeader
│   ├── FilterTabs: All | Strength | Conditioning | Mobility
│   ├── EquipmentFilter: All | Gym | Home | Hotel | Minimal
│   └── "New Template" button → /planner/templates/new (or slide-over)
└── TemplateGrid
    └── TemplateCard (×n)
        ├── TemplateName
        ├── TypeBadge + EquipmentBadge
        ├── DurationBadge
        ├── ExerciseCount
        ├── TagList
        └── Actions: "Use Template" | "Edit" | "Duplicate" | "Delete"
```

---

## API Routes for Planner Module

```
POST /api/internal/plans/get              → fetch weekly plan + sessions
POST /api/internal/plans/create           → create new weekly plan (draft)
POST /api/internal/plans/publish          → publish plan to portal
POST /api/internal/plans/build-week       → AI plan proposal (calls Claude internally)
POST /api/internal/plans/import-tp-csv    → parse + preview TP CSV import
POST /api/internal/sessions/create        → add session to plan
POST /api/internal/sessions/update        → edit session
POST /api/internal/sessions/delete        → delete session
POST /api/internal/sessions/generate      → AI session generation
POST /api/internal/sessions/reorder       → update session_date after drag-and-drop
POST /api/internal/templates/list         → fetch templates
POST /api/internal/templates/create       → create template
POST /api/internal/templates/update       → edit template
POST /api/internal/templates/delete       → delete template
```

---

## generate_session Internal Logic
# lib/ai/session-generator.ts

When Claude calls the generate_session tool, the internal API route:

1. Fetches the client profile (goals, health_notes, client_type)
2. Fetches the current week's TP sessions (if any) to understand load context
3. Fetches the last 2 check-ins to understand fatigue/energy
4. If template_id provided: fetches template as base
5. Calls Claude with a focused prompt:

```
System: You are an expert strength and conditioning coach for {client_type} athletes.
Generate a {session_type} session for the following client.

Client: {name}
Goals: {goals}
HEALTH NOTES (mandatory constraints): {health_notes ?? "None"}
Equipment: {equipment}
Duration: {duration_minutes} minutes
Brief: {brief}

Current week training load:
{tp_sessions_summary}

Recent check-in data:
{checkin_summary}

{if template: "Use this template as a base and adapt it: {template_exercises}"}

Return ONLY a valid JSON object with this exact shape:
{
  "name": string,
  "session_type": string,
  "duration_minutes": number,
  "intensity": "easy" | "moderate" | "hard",
  "exercises": [
    {
      "name": string,
      "sets": number,
      "reps": string,
      "duration_seconds": number | null,
      "rest_seconds": number,
      "notes": string
    }
  ],
  "notes": string,       // client-facing session notes
  "coach_notes": string  // any flags or rationale for Pete
}
```

6. Parses JSON response
7. Returns session object (NOT saved — tool response goes back to Claude,
   who presents it to Pete for approval before calling create_session)
```
