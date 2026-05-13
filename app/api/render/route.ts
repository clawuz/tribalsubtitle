export const runtime = 'nodejs'
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import { renderSubtitleVideo } from '@/lib/remotion-renderer'
import { getStorage } from '@/lib/firebase-admin'
import { randomUUID } from 'crypto'
import fs from 'fs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      platform?: string
      durationSeconds?: number
      subtitles?: { startMs: number; endMs: number; text: string }[]
      backgroundMedia?: string
      [key: string]: unknown
    }

    const { durationSeconds, subtitles, ...rest } = body

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
      subtitlePosition: 'bottom',
      subtitleFontSize: 52,
      subtitleFontFamily: 'Poppins',
      subtitleColor: '#ffffff',
      subtitleBgColor: 'rgba(0,0,0,0.65)',
      subtitleBold: true,
      subtitleOutline: false,
      subtitleOutlineColor: '#000000',
      showLowerThird: false,
      lowerThirdText: '',
      lowerThirdColor: '#10b981',
      logoUrl: '',
      accentColor: '#10b981',
      backgroundColor: '#000000',
      ...rest,
      durationInFrames: Math.round(durSec * fps),
      fps,
    }

    const outPath = await renderSubtitleVideo(props)

    // Upload to Firebase Storage
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
