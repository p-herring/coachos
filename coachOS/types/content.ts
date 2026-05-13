export type Platform = 'instagram' | 'tiktok' | 'youtube_shorts'
export type ContentPillar = 'training' | 'client_wins' | 'education' | 'personal_brand'
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'

export interface Post {
  id: string
  coach_id: string
  title?: string
  caption?: string
  platforms: Platform[]
  content_pillar?: ContentPillar
  asset_urls: string[]
  status: PostStatus
  scheduled_at?: string
  published_at?: string
  platform_post_ids: Partial<Record<Platform, string>>
  metrics: Partial<Record<Platform, PlatformMetrics>>
  metrics_updated_at?: string
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface PlatformMetrics {
  likes?: number
  reach?: number
  impressions?: number
  saves?: number
  comments?: number
  views?: number
  shares?: number
  watch_time_seconds?: number
}

export interface AiConversation {
  id: string
  coach_id: string
  title?: string
  messages: ConversationMessage[]
  context: ConversationContext
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  tool_calls?: Array<{ tool: string; input: unknown; result?: unknown }>
}

export interface ConversationContext {
  client_id?: string
  post_id?: string
  plan_id?: string
}
