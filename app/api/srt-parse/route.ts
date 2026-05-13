export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { parseSrt } from '@/lib/srt'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { srt: string }
    if (!body.srt || typeof body.srt !== 'string') {
      return NextResponse.json({ error: 'srt alanı gerekli' }, { status: 400 })
    }
    const subtitles = parseSrt(body.srt)
    return NextResponse.json({ subtitles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SRT parse hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
