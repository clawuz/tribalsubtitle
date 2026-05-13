export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type { SubtitleSplitMode } from '@/remotion/compositions/types'
import path from 'path'
import fs from 'fs'

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

const SENTENCE_END = new Set(['.', '!', '?', '…', '。', '！', '？'])

const LANG_NAME_TO_CODE: Record<string, string> = {
  turkish: 'tr', english: 'en', german: 'de', french: 'fr',
  spanish: 'es', italian: 'it', portuguese: 'pt', dutch: 'nl',
  russian: 'ru', japanese: 'ja', chinese: 'zh', korean: 'ko',
  arabic: 'ar', hindi: 'hi', polish: 'pl', swedish: 'sv',
  norwegian: 'no', danish: 'da', finnish: 'fi', greek: 'el',
  czech: 'cs', romanian: 'ro', hungarian: 'hu', ukrainian: 'uk',
  thai: 'th', vietnamese: 'vi', indonesian: 'id', malay: 'ms',
}

interface GroqWord { word: string; start: number; end: number }
interface GroqVerboseResponse {
  language: string
  duration: number
  text: string
  words?: GroqWord[]
}
interface WordSegment { word: string; startMs: number; endMs: number }
interface SubtitleEntry { startMs: number; endMs: number; text: string }

function splitToSubtitles(words: WordSegment[], mode: string, chunkSize: number): SubtitleEntry[] {
  if (!words.length) return []

  if (mode === 'word') {
    return words.map(w => ({ startMs: w.startMs, endMs: w.endMs, text: w.word }))
  }

  if (mode === 'chunk') {
    const result: SubtitleEntry[] = []
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize)
      result.push({
        startMs: chunk[0].startMs,
        endMs: chunk[chunk.length - 1].endMs,
        text: chunk.map(w => w.word).join(' '),
      })
    }
    return result
  }

  // sentence mode
  const result: SubtitleEntry[] = []
  let current: WordSegment[] = []
  for (const w of words) {
    current.push(w)
    if (w.word && SENTENCE_END.has(w.word[w.word.length - 1])) {
      result.push({
        startMs: current[0].startMs,
        endMs: current[current.length - 1].endMs,
        text: current.map(c => c.word).join(' '),
      })
      current = []
    }
  }
  if (current.length) {
    result.push({
      startMs: current[0].startMs,
      endMs: current[current.length - 1].endMs,
      text: current.map(c => c.word).join(' '),
    })
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      mediaUrl: string
      splitMode?: SubtitleSplitMode
      chunkSize?: number
    }

    const { mediaUrl, splitMode = 'sentence', chunkSize = 5 } = body

    if (!mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl gerekli' }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY ayarlanmamış' }, { status: 503 })
    }

    const filename = path.basename(mediaUrl)
    const localPath = path.join(process.cwd(), 'public', 'uploads', filename)

    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ error: 'Medya dosyası bulunamadı' }, { status: 400 })
    }

    const fileBuffer = fs.readFileSync(localPath)
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), filename)
    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    })

    if (!groqRes.ok) {
      const detail = await groqRes.text()
      return NextResponse.json({ error: `Groq hatası: ${detail}` }, { status: 500 })
    }

    const groqData = await groqRes.json() as GroqVerboseResponse

    const words: WordSegment[] = (groqData.words ?? []).map(w => ({
      word: w.word.trim(),
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
    }))

    const subtitles = splitToSubtitles(words, splitMode, chunkSize)
    const langName = groqData.language?.toLowerCase() ?? ''
    const detectedLanguage = LANG_NAME_TO_CODE[langName] ?? langName

    return NextResponse.json({
      subtitles,
      segments: words,
      detectedLanguage,
      detectedLanguageName: groqData.language,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transkripsiyon hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
