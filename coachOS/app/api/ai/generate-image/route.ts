// app/api/ai/generate-image/route.ts
//
// Proxies image generation requests to DALL-E 3 via OpenAI API.
// Uploads the result to Supabase Storage and returns a permanent URL.
// Never called client-side — always called server-to-server via executeTool().

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/ai/openai'

const requestSchema = z.object({
  prompt:       z.string().min(10).max(1000),
  style:        z.enum(['photorealistic', 'graphic', 'illustration', 'minimal']).default('photorealistic'),
  aspect_ratio: z.enum(['square', 'portrait', 'landscape']).default('square'),
})

// DALL-E 3 size mapping
const sizeMap = {
  square:    '1024x1024',
  portrait:  '1024x1792',
  landscape: '1792x1024',
} as const

// Style → prompt modifier
const styleModifier = {
  photorealistic: 'photorealistic, high quality, professional photography',
  graphic:        'graphic design, bold colours, clean vector-style',
  illustration:   'digital illustration, artistic, detailed',
  minimal:        'minimalist, clean, simple, white background',
}

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.id !== process.env.COACH_USER_ID) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Parse request
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { prompt, style, aspect_ratio } = parsed.data

  // Build enhanced prompt
  const enhancedPrompt = `${prompt}. Style: ${styleModifier[style]}. Fitness and coaching context. Do not include text or watermarks in the image.`

  try {
    const openai = getOpenAIClient()

    // Call DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: sizeMap[aspect_ratio],
      quality: 'standard',
      response_format: 'b64_json',
    })

    const image = response.data?.[0]
    const b64 = image?.b64_json
    if (!b64) {
      return NextResponse.json({ error: 'No image returned from DALL-E' }, { status: 500 })
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(b64, 'base64')
    const filename = `generated/${Date.now()}_${aspect_ratio}.png`

    const { error: uploadError } = await supabase.storage
      .from('post-assets')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-assets')
      .getPublicUrl(filename)

    return NextResponse.json({
      image_url: publicUrl,
      revised_prompt: image?.revised_prompt ?? prompt,
      aspect_ratio,
      style,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
