// lib/ai/tools.ts
//
// Defines every tool Claude can call from the Command Centre.
// Each tool here maps 1:1 to an internal API route in /api/internal/.
//
// Naming convention: verb_noun (snake_case)
// Keep descriptions precise — Claude uses them to decide when to call each tool.
// Input schemas are Anthropic tool_input_schema format (JSON Schema subset).

import Anthropic from '@anthropic-ai/sdk'

export const coachOSTools: Anthropic.Tool[] = [

  // ─── CRM ──────────────────────────────────────────────────────────────────

  {
    name: 'get_client',
    description:
      'Fetch the full profile for a single client including their status, billing, goals, health notes, check-in cadence, and TrainingPeaks username. Use this when you need detailed information about one specific client.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'UUID of the client',
        },
      },
      required: ['client_id'],
    },
  },

  {
    name: 'list_clients',
    description:
      'Query the client roster with optional filters. Returns a summary list (id, name, status, billing_status, client_type, next_checkin_date). Use this for overviews, finding clients by status, or identifying clients who are overdue.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['lead', 'trial', 'active', 'paused', 'alumni'],
          description: 'Filter by pipeline status. Omit to return all.',
        },
        billing_status: {
          type: 'string',
          enum: ['pending', 'active', 'overdue', 'cancelled'],
          description: 'Filter by billing status.',
        },
        checkin_overdue: {
          type: 'boolean',
          description: 'If true, return only clients whose next_checkin_date has passed.',
        },
        client_type: {
          type: 'string',
          enum: ['general', 'triathlon', 'mixed'],
        },
        search: {
          type: 'string',
          description: 'Fuzzy search by client name.',
        },
      },
      required: [],
    },
  },

  {
    name: 'update_client',
    description:
      'Update fields on a client record. Use for status changes, billing updates, next check-in date adjustments, or adding health notes. Only pass fields that need changing.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        fields: {
          type: 'object',
          description: 'Key-value pairs of fields to update. Valid keys: status, billing_status, billing_model, health_notes, next_checkin_date, checkin_cadence, goals, tp_username.',
          additionalProperties: true,
        },
      },
      required: ['client_id', 'fields'],
    },
  },

  {
    name: 'add_client_note',
    description:
      'Add a note to a client\'s communication log. Use for logging calls, emails, WhatsApp conversations, billing events, or flags.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        note: { type: 'string', description: 'The note content.' },
        note_type: {
          type: 'string',
          enum: ['general', 'call', 'email', 'whatsapp', 'billing', 'flag'],
          description: 'Type of note. Default: general.',
        },
      },
      required: ['client_id', 'note'],
    },
  },


  // ─── Workout Planner ──────────────────────────────────────────────────────

  {
    name: 'get_weekly_plan',
    description:
      'Fetch the assembled weekly plan for a client, including all sessions for that week. Returns sessions with type, date, duration, intensity, exercises (for strength), and completion status.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        week_start: {
          type: 'string',
          description: 'ISO date string for the Monday of the week (e.g. "2026-05-13"). Defaults to the current week if omitted.',
        },
      },
      required: ['client_id'],
    },
  },

  {
    name: 'create_session',
    description:
      'Add a new session to a client\'s weekly plan. Use for manually adding strength, conditioning, or other sessions. For AI-generated strength sessions, use generate_session first, then pass the result here.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        weekly_plan_id: { type: 'string', description: 'UUID of the weekly plan to add the session to.' },
        name: { type: 'string' },
        session_date: { type: 'string', description: 'ISO date string (e.g. "2026-05-14").' },
        session_type: {
          type: 'string',
          enum: ['swim', 'bike', 'run', 'strength', 'conditioning', 'mobility', 'rest', 'other'],
        },
        source: {
          type: 'string',
          enum: ['trainingpeaks', 'coachOS', 'ai_generated'],
          description: 'Origin of the session. Use "ai_generated" if Claude created it.',
        },
        duration_minutes: { type: 'number' },
        intensity: {
          type: 'string',
          enum: ['easy', 'moderate', 'hard', 'race'],
        },
        exercises: {
          type: 'array',
          description: 'Array of exercise objects for strength sessions. Omit for endurance sessions.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              sets: { type: 'number' },
              reps: { type: 'string' },
              duration_seconds: { type: 'number' },
              rest_seconds: { type: 'number' },
              notes: { type: 'string' },
            },
          },
        },
        notes: { type: 'string', description: 'Visible to the client in the portal.' },
        coach_notes: { type: 'string', description: 'Coach-only notes, not visible to client.' },
      },
      required: ['client_id', 'weekly_plan_id', 'name', 'session_date', 'session_type', 'source'],
    },
  },

  {
    name: 'update_session',
    description: 'Edit an existing session. Only pass fields that need changing.',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        fields: {
          type: 'object',
          description: 'Key-value pairs to update. Valid keys: name, session_date, session_type, duration_minutes, intensity, exercises, notes, coach_notes.',
          additionalProperties: true,
        },
      },
      required: ['session_id', 'fields'],
    },
  },

  {
    name: 'publish_weekly_plan',
    description:
      'Publish a draft weekly plan to the client portal, making it visible to the client. Sets status to "published" and records published_at timestamp.',
    input_schema: {
      type: 'object',
      properties: {
        weekly_plan_id: { type: 'string' },
      },
      required: ['weekly_plan_id'],
    },
  },

  {
    name: 'generate_session',
    description:
      'Ask Claude to generate a customised strength or conditioning session for a specific client. Takes the client profile, training context, and a brief, and returns a complete session object ready to be passed to create_session. Always tell the user what was generated and ask for approval before calling create_session.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        session_type: {
          type: 'string',
          enum: ['strength', 'conditioning', 'mobility'],
        },
        brief: {
          type: 'string',
          description: 'What you want from the session. E.g. "Lower body, gym access, 45 minutes, moderate intensity, avoid heavy leg press due to knee".',
        },
        equipment: {
          type: 'string',
          enum: ['gym', 'home', 'hotel', 'minimal'],
        },
        duration_minutes: { type: 'number' },
        template_id: {
          type: 'string',
          description: 'Optional. If provided, use this template as the base and AI fills/adjusts it for the client.',
        },
      },
      required: ['client_id', 'session_type', 'brief'],
    },
  },

  {
    name: 'build_week',
    description:
      'Propose a full weekly plan for a client by reviewing their TrainingPeaks sessions (if any), goals, recent check-in data, and fatigue context. Returns a proposed plan with sessions for each day. Always show the proposal to Pete and ask for approval before creating any sessions.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        week_start: {
          type: 'string',
          description: 'ISO date string for the Monday of the target week.',
        },
        context: {
          type: 'string',
          description: 'Any additional context for this week. E.g. "Race in 2 weeks, taper starting", "Client reported fatigue in last check-in", "Big bike event on Saturday".',
        },
      },
      required: ['client_id'],
    },
  },


  // ─── Check-ins ────────────────────────────────────────────────────────────

  {
    name: 'get_checkins',
    description:
      'Fetch recent check-ins for a client. Returns scores, notes, and coach response status. Use to review client progress or before building a weekly plan.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        limit: {
          type: 'number',
          description: 'Number of most recent check-ins to return. Default: 4.',
        },
      },
      required: ['client_id'],
    },
  },

  {
    name: 'draft_checkin_response',
    description:
      'Generate a draft response to a client\'s latest check-in. Returns a suggested response for Pete to review, edit, and send. Does NOT send the response — Pete must approve it first.',
    input_schema: {
      type: 'object',
      properties: {
        checkin_id: { type: 'string' },
        tone: {
          type: 'string',
          enum: ['encouraging', 'direct', 'concerned', 'celebratory'],
          description: 'Tone of the response. Default: encouraging.',
        },
        additional_context: {
          type: 'string',
          description: 'Any extra context to include in the response, e.g. plan adjustments, race reminders.',
        },
      },
      required: ['checkin_id'],
    },
  },

  {
    name: 'send_checkin_response',
    description:
      'Save Pete\'s approved check-in response to the database. This makes it visible to the client in the portal and records responded_at. Only call this after Pete has reviewed and approved the response.',
    input_schema: {
      type: 'object',
      properties: {
        checkin_id: { type: 'string' },
        response: { type: 'string', description: 'The final response text to send.' },
      },
      required: ['checkin_id', 'response'],
    },
  },


  // ─── Social Media Hub ─────────────────────────────────────────────────────

  {
    name: 'list_posts',
    description:
      'Query the content calendar. Returns posts with status, platforms, scheduled time, and performance metrics. Use for calendar overviews or finding posts in a specific state.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'],
        },
        platform: {
          type: 'string',
          enum: ['instagram', 'tiktok', 'youtube_shorts'],
        },
        content_pillar: {
          type: 'string',
          enum: ['training', 'client_wins', 'education', 'personal_brand'],
        },
        from_date: { type: 'string', description: 'ISO date string.' },
        to_date: { type: 'string', description: 'ISO date string.' },
        limit: { type: 'number', description: 'Default: 20.' },
      },
      required: [],
    },
  },

  {
    name: 'create_post',
    description:
      'Create a new post draft in the content calendar. Use after generating a caption and optionally an image. Returns the post ID for scheduling.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Internal label. Not published.' },
        caption: { type: 'string' },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['instagram', 'tiktok', 'youtube_shorts'] },
          description: 'Platforms to publish to.',
        },
        content_pillar: {
          type: 'string',
          enum: ['training', 'client_wins', 'education', 'personal_brand'],
        },
        asset_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supabase Storage URLs for images or video.',
        },
        ai_generated: {
          type: 'boolean',
          description: 'Set true if the caption was AI-generated.',
        },
      },
      required: ['caption', 'platforms'],
    },
  },

  {
    name: 'schedule_post',
    description: 'Set a scheduled publish time on a post. Changes status to "scheduled".',
    input_schema: {
      type: 'object',
      properties: {
        post_id: { type: 'string' },
        scheduled_at: {
          type: 'string',
          description: 'ISO datetime string for when to publish. E.g. "2026-05-15T07:00:00+08:00".',
        },
      },
      required: ['post_id', 'scheduled_at'],
    },
  },

  {
    name: 'get_post_metrics',
    description:
      'Retrieve performance metrics for a published post. Returns per-platform stats: likes, reach, impressions, saves (Instagram), views and shares (TikTok), views and watch time (YouTube).',
    input_schema: {
      type: 'object',
      properties: {
        post_id: { type: 'string' },
      },
      required: ['post_id'],
    },
  },

  {
    name: 'analyse_content_performance',
    description:
      'Analyse recent post performance across the content calendar and return insights: top performing posts, best content pillars, best posting times, and 5 suggested next post ideas based on what\'s working.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'How many days back to analyse. Default: 30.',
        },
        platform: {
          type: 'string',
          enum: ['instagram', 'tiktok', 'youtube_shorts'],
          description: 'Filter to one platform. Omit for cross-platform view.',
        },
      },
      required: [],
    },
  },


  // ─── Image Generation ─────────────────────────────────────────────────────

  {
    name: 'generate_image',
    description:
      'Generate an image using DALL-E 3 via the OpenAI API for use in social media posts. Provide a detailed prompt. The image is uploaded to Supabase Storage and the URL is returned. Always show Pete the result before attaching it to a post.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed image generation prompt. Be specific about style, subject, mood, and composition. For fitness content, specify whether photorealistic or graphic/illustrative.',
        },
        style: {
          type: 'string',
          enum: ['photorealistic', 'graphic', 'illustration', 'minimal'],
          description: 'Visual style. Default: photorealistic.',
        },
        aspect_ratio: {
          type: 'string',
          enum: ['square', 'portrait', 'landscape'],
          description: 'square = 1:1 (Instagram), portrait = 4:5 (Reels/TikTok), landscape = 16:9 (YouTube). Default: square.',
        },
      },
      required: ['prompt'],
    },
  },

]


// ─── Tool executor ────────────────────────────────────────────────────────────
// Maps tool names to their internal API routes.
// Called by the Command Centre chat route when Claude invokes a tool.

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken: string   // Supabase session token for authenticated internal calls
): Promise<unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const internalBase = `${baseUrl}/api/internal`

  const routeMap: Record<string, string> = {
    get_client:                   `${internalBase}/clients/get`,
    list_clients:                 `${internalBase}/clients/list`,
    update_client:                `${internalBase}/clients/update`,
    add_client_note:              `${internalBase}/clients/notes/add`,
    get_weekly_plan:              `${internalBase}/plans/get`,
    create_session:               `${internalBase}/sessions/create`,
    update_session:               `${internalBase}/sessions/update`,
    publish_weekly_plan:          `${internalBase}/plans/publish`,
    generate_session:             `${internalBase}/sessions/generate`,
    build_week:                   `${internalBase}/plans/build-week`,
    get_checkins:                 `${internalBase}/checkins/list`,
    draft_checkin_response:       `${internalBase}/checkins/draft-response`,
    send_checkin_response:        `${internalBase}/checkins/send-response`,
    list_posts:                   `${internalBase}/posts/list`,
    create_post:                  `${internalBase}/posts/create`,
    schedule_post:                `${internalBase}/posts/schedule`,
    get_post_metrics:             `${internalBase}/posts/metrics`,
    analyse_content_performance:  `${internalBase}/posts/analyse`,
    generate_image:               `${baseUrl}/api/ai/generate-image`,
  }

  const url = routeMap[toolName]
  if (!url) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(toolInput),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Tool ${toolName} failed: ${error.error ?? response.statusText}`)
  }

  return response.json()
}
