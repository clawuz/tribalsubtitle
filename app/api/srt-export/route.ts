export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type { SubtitleEntry } from '@/remotion/compositions/types'
import { exportSrt } from '@/lib/srt'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { subtitles: SubtitleEntry[] }
    if (!Array.isArray(body.subtitles)) {
      return NextResponse.json({ error: 'subtitles alanı gerekli' }, { status: 400 })
    }
    const srt = exportSrt(body.subtitles)
    return new Response(srt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="subtitles.srt"',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SRT export hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
