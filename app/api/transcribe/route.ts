export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type { SubtitleSplitMode } from '@/remotion/compositions/types'
import path from 'path'
import fs from 'fs'

const WHISPER_URL = process.env.WHISPER_SERVICE_URL ?? 'http://localhost:8765'

function resolveLocalPath(mediaUrl: string): string | null {
  if (mediaUrl.startsWith('uploads/') || mediaUrl.startsWith('/uploads/')) {
    const filename = path.basename(mediaUrl)
    return path.join(process.cwd(), 'public', 'uploads', filename)
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      mediaUrl: string
      language?: 'tr' | 'en'
      splitMode?: SubtitleSplitMode
      chunkSize?: number
    }

    const { mediaUrl, language = 'tr', splitMode = 'sentence', chunkSize = 5 } = body

    if (!mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl gerekli' }, { status: 400 })
    }

    const localPath = resolveLocalPath(mediaUrl)
    if (!localPath || !fs.existsSync(localPath)) {
      return NextResponse.json({ error: 'Medya dosyası bulunamadı' }, { status: 400 })
    }

    let whisperRes: Response
    try {
      whisperRes = await fetch(`${WHISPER_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_path: localPath,
          language,
          split_mode: splitMode,
          chunk_size: chunkSize,
        }),
      })
    } catch {
      return NextResponse.json(
        { error: 'Whisper servisi çalışmıyor. whisper_service/server.py başlatın.' },
        { status: 503 }
      )
    }

    if (!whisperRes.ok) {
      const detail = await whisperRes.text()
      return NextResponse.json({ error: `Whisper hatası: ${detail}` }, { status: 500 })
    }

    const data = await whisperRes.json()
    return NextResponse.json({ subtitles: data.subtitles, segments: data.segments })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transkripsiyon hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
