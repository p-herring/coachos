# Social Media Hub — Component Design
# app/(dashboard)/content/

---

## Route Structure

```
app/(dashboard)/content/
├── page.tsx                    → Content calendar (default view)
├── post/
│   ├── new/page.tsx            → Create new post
│   └── [id]/page.tsx           → Edit existing post
└── analytics/page.tsx          → Performance dashboard
```

---

## page.tsx — Content Calendar

Monthly calendar view of all posts across all platforms.

### Component Tree
```
ContentCalendarPage (server component)
├── ContentHeader
│   ├── MonthNavigator (← | "May 2026" | →)
│   ├── ViewToggle: Calendar | List
│   ├── PlatformFilter: All | Instagram | TikTok | YouTube
│   ├── PillarFilter: All | Training | Client Wins | Education | Personal Brand
│   └── Actions:
│       ├── "New Post" button → /content/post/new
│       └── "Generate Week with AI" button → opens GenerateWeekSheet
│
├── [Calendar view]
│   └── CalendarGrid (7 cols, 4-5 rows)
│       └── CalendarDay (×28-31)
│           ├── DayNumber
│           └── PostChips (stacked, up to 3 visible + "n more")
│               └── PostChip
│                   ├── PlatformIcon(s)
│                   ├── StatusDot (colour by status)
│                   └── PostTitle (truncated)
│
├── [List view]
│   └── PostList
│       └── PostListItem (×n)
│           ├── ScheduledDate + time
│           ├── PostTitle
│           ├── PlatformIcons
│           ├── PillarBadge
│           ├── StatusBadge
│           ├── AssetThumbnail (if image attached)
│           └── Actions: Edit | Duplicate | Delete
│
└── GenerateWeekSheet (slide-over)
    ├── PillarSelector (multi-select which pillars to include)
    ├── PostCountInput (how many posts this week, default 4)
    ├── ContextInput ("anything specific to focus on this week?")
    ├── Generate button → calls Claude (list_clients + analyse_content_performance → drafts posts)
    ├── GeneratedPostsPreviews (×n)
    │   └── Each shows: caption draft, suggested platform, pillar, suggested post day
    └── Actions: "Create All Drafts" | "Regenerate" | "Cancel"
```

### Status Colour Coding
```
draft       → gray
scheduled   → blue
publishing  → yellow (animated)
published   → green
failed      → red
```

---

## post/new/page.tsx — Create / Edit Post

The post editor. Same component used for new and edit (edit pre-fills form).

### Component Tree
```
PostEditorPage (client component)
├── PostEditorHeader
│   ├── Back button
│   ├── PostTitle input (internal label)
│   └── HeaderActions
│       ├── "Save Draft" button
│       ├── "Schedule" button → opens ScheduleSheet
│       └── StatusBadge
│
├── PostEditorLayout (two-column on desktop, stacked on mobile)
│   │
│   ├── LEFT: Editor
│   │   ├── PlatformSelector (multi-select: IG | TikTok | YouTube)
│   │   ├── ContentPillarSelect
│   │   │
│   │   ├── CaptionEditor
│   │   │   ├── Textarea (platform-aware character count)
│   │   │   ├── CharacterCountBar (changes colour near limit)
│   │   │   ├── HashtagSuggestions (auto-generated based on pillar)
│   │   │   └── AIActions row:
│   │   │       ├── "Draft with AI" → opens AIDraftSheet
│   │   │       ├── "Improve" → Claude rewrites current caption
│   │   │       └── "Shorten" → Claude compresses to under X chars
│   │   │
│   │   └── AssetSection
│   │       ├── AssetUploader (drag-drop or click, max 10 files)
│   │       │   └── Accepts: jpg, png, mp4, mov
│   │       ├── AssetGrid (uploaded files, sortable)
│   │       │   └── AssetThumb (×n)
│   │       │       ├── Thumbnail / video preview
│   │       │       └── Remove button
│   │       └── GenerateImageSection
│   │           ├── ImagePromptInput
│   │           ├── StyleSelect (photorealistic | graphic | illustration | minimal)
│   │           ├── AspectRatioSelect (square | portrait | landscape)
│   │           └── "Generate with DALL-E" button
│   │               └── [loading] → shows spinner + "Generating..."
│   │               └── [result] → shows image preview + "Use this image" | "Regenerate"
│   │
│   └── RIGHT: Preview
│       ├── PreviewPlatformTabs: Instagram | TikTok | YouTube
│       └── PlatformPreview (per tab)
│           ├── [Instagram] — square/portrait card mock
│           │   ├── Profile header (pete.in.progress avatar + handle)
│           │   ├── Image/video placeholder
│           │   └── Caption (first 125 chars + "more")
│           ├── [TikTok] — portrait card mock
│           │   ├── Side action bar (like, comment, share icons)
│           │   └── Caption overlay at bottom
│           └── [YouTube Shorts] — portrait card mock
│               └── Title line below thumbnail
│
└── Sheets
    ├── AIDraftSheet
    │   ├── BriefInput ("What's this post about?")
    │   ├── ToneSelect (educational | personal story | motivational | behind-the-scenes)
    │   ├── PlatformSelect (which platform to optimise for)
    │   └── Generate → streams caption draft, user can accept or re-generate
    │
    └── ScheduleSheet
        ├── DateTimePicker (AWST timezone)
        ├── BestTimeHint (based on past post performance, if data available)
        └── Confirm Schedule button
```

### Platform Caption Constraints
```
Instagram:      2,200 chars, 30 hashtags max, best in caption body
TikTok:         2,200 chars, hashtags in caption
YouTube Shorts: Title 100 chars, Description 5,000 chars (separate fields)
```
Handle platform differences in caption editor:
- When YouTube Shorts selected: show separate Title and Description fields
- When IG or TikTok: single caption field with hashtag support

---

## analytics/page.tsx — Performance Dashboard

### Component Tree
```
AnalyticsPage (server component, data fetched fresh each load)
├── AnalyticsHeader
│   ├── DateRangePicker (last 7 / 14 / 30 / 90 days)
│   └── PlatformFilter
│
├── TopMetricsRow (4 stat cards)
│   ├── TotalPosts published
│   ├── TotalReach / Views (summed across platforms)
│   ├── AvgEngagementRate
│   └── TopPerformingPillar
│
├── PerformanceChart
│   └── Line chart: reach over time, by platform
│
├── TopPostsTable
│   ├── Header: Rank | Post | Platform | Pillar | Metric
│   └── TopPostRow (×10)
│       ├── Rank number
│       ├── PostThumbnail + title
│       ├── PlatformIcon
│       ├── PillarBadge
│       └── PrimaryMetric (reach for IG, views for TikTok/YT)
│
└── AIInsightsCard
    ├── "What's working" summary (Claude-generated, cached daily)
    ├── Top 3 content observations
    └── "Suggested next 5 posts" list
        └── Each: pillar, format, hook idea
```

---

## Caption Prompt Templates
# lib/ai/prompts/social.ts

```typescript
export function buildCaptionPrompt(params: {
  brief: string
  pillar: 'training' | 'client_wins' | 'education' | 'personal_brand'
  platform: 'instagram' | 'tiktok' | 'youtube_shorts'
  tone: 'educational' | 'personal_story' | 'motivational' | 'behind_the_scenes'
  recentPerformers?: string  // summary of what's working
}): string {

  const pillarContext = {
    training:       "Pete's own training (triathlete, training 6 days/week, racing age group events)",
    client_wins:    "A client achievement or transformation (anonymised unless client consents)",
    education:      "A training, nutrition, or coaching tip that delivers genuine value",
    personal_brand: "Pete's story, journey, or perspective (pete.in.progress brand)",
  }

  const platformGuide = {
    instagram:       "Punchy opening line. Conversational. 3-5 short paragraphs. 5-10 relevant hashtags at end.",
    tiktok:          "Hook in first 3 words. Ultra-short. Single idea. 3-5 hashtags max.",
    youtube_shorts:  "Write a Title (under 60 chars) and a Description separately. Description: 2-3 sentences + keywords.",
  }

  return `
Write a social media caption for pete.in.progress.

Platform: ${params.platform}
Platform guidance: ${platformGuide[params.platform]}

Content pillar: ${pillarContext[params.pillar]}
Brief: ${params.brief}
Tone: ${params.tone}

Pete's voice:
- First person, authentic, not performative
- Perth-based Australian — natural Australian English
- Triathlete and coach — knows the sport and the lifestyle deeply
- Does NOT use: "crush it", "beast mode", "level up", "no excuses", "hustle"
- DOES use: honest observations, specific details, genuine encouragement

${params.recentPerformers ? `What's been performing well recently:\n${params.recentPerformers}\n` : ''}

Write the caption only. No preamble, no explanation.
  `.trim()
}
```

---

## API Routes for Social Hub

```
POST /api/internal/posts/list             → query content calendar
POST /api/internal/posts/create           → create post draft
POST /api/internal/posts/update           → edit post
POST /api/internal/posts/delete           → delete post
POST /api/internal/posts/schedule         → set scheduled_at + status
POST /api/internal/posts/publish          → trigger immediate publish (Phase 2)
POST /api/internal/posts/metrics          → fetch metrics for a post
POST /api/internal/posts/analyse          → AI content performance analysis
POST /api/assets/upload                   → upload image/video to Supabase Storage
```

---

## Social Publishing (Phase 2 Implementation Notes)

### Instagram Graph API
- Requires Facebook Business account + connected Instagram Professional account
- Two-step publish: create container → publish container
- Reels: upload video to container, then publish
- Apply for `instagram_content_publish` permission in Meta App Review

### TikTok Content Posting API
- Requires TikTok for Business account
- Direct post (video) or inbox upload (draft sent to TikTok app)
- Phase 2: use Direct Post for automation; requires `video.publish` scope
- TikTok API approval process is slower than Meta — apply early

### YouTube Data API v3
- OAuth 2.0 via Google Cloud Console
- Shorts: upload video with `#Shorts` in title or description
- Use `videos.insert` endpoint
- No special approval required beyond OAuth consent screen verification

### Phase 1 fallback (no publish APIs yet)
- "Scheduled" posts show in calendar
- At scheduled time: send push notification to Pete's phone (via Supabase Realtime + PWA notification)
- Notification contains: caption (copy-ready), asset URL
- Pete pastes and posts manually
```
