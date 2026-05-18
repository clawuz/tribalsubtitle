export const runtime = 'nodejs'
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import { renderSubtitleVideo } from '@/lib/remotion-renderer'
import { getStorage } from '@/lib/firebase-admin'
import { randomUUID } from 'crypto'
import fs from 'fs'

const PORT = process.env.PORT ?? '3020'

// Remotion Chromium'u localhost üzerinden dosyalara erişebilir.
// Next.js public/ klasörünü zaten /uploads/... olarak serve ediyor.
function resolveMediaUrl(src: unknown): string {
  if (!src || typeof src !== 'string') return ''
  if (/^(https?:|data:)/.test(src)) return src
  // uploads/filename.mp4 → http://localhost:PORT/uploads/filename.mp4
  const normalized = src.startsWith('/') ? src : `/${src}`
  return `http://localhost:${PORT}${normalized}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      platform?: string
      durationSeconds?: number
      subtitles?: { startMs: number; endMs: number; text: string }[]
      backgroundMedia?: string
      [key: string]: unknown
    }

    const { durationSeconds, subtitles, backgroundMedia: rawMedia, ...rest } = body

    let durSec = durationSeconds
    if (!durSec) {
      if (Array.isArray(subtitles) && subtitles.length > 0) {
        const lastEnd = Math.max(...subtitles.map((s) => s.endMs))
        durSec = Math.ceil(lastEnd / 1000) + 1
      } else {
        durSec = 30
      }
    }

    const fps = 30
    const props: Record<string, unknown> = {
      platform: '9:16',
      backgroundMedia: '',
      subtitles: subtitles ?? [],
      splitMode: 'sentence',
      chunkSize: 5,
      subtitleX: 50,
      subtitleY: 85,
      subtitleFontSize: 52,
      subtitleFontFamily: 'TKTextVF',
      subtitleColor: '#ffffff',
      subtitleBgColor: 'rgba(0,0,0,0.65)',
      subtitleBold: true,
      subtitleOutline: false,
      subtitleOutlineColor: '#000000',
      subtitleOutlineWidth: 3,
      showLowerThird: false,
      lowerThirdText: '',
      lowerThirdColor: '#10b981',
      logoUrl: '',
      accentColor: '#10b981',
      backgroundColor: '#000000',
      ...rest,
    }
    props.backgroundMedia = resolveMediaUrl(rawMedia ?? '')
    props.durationInFrames = Math.round(durSec * fps)
    props.fps = fps

    console.log('[render] backgroundMedia:', props.backgroundMedia, '| durationInFrames:', props.durationInFrames)

    const outPath = await renderSubtitleVideo(props)

    const id = randomUUID()
    const bucket = getStorage()
    await bucket.upload(outPath, {
      destination: `renders/${id}.mp4`,
      metadata: { contentType: 'video/mp4' },
    })
    fs.unlinkSync(outPath)

    return NextResponse.json({ id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render hatası'
    console.error('[render]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
