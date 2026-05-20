export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

interface SubtitleEntry { startMs: number; endMs: number; text: string }

const BATCH = 30

async function translateBatch(texts: string[], targetLanguage: string, targetLanguageName: string): Promise<string[]> {
  const prompt = texts.map((t, i) => `[${i}] ${t}`).join('\n')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Translate subtitle lines to ${targetLanguageName} (${targetLanguage}). Input has lines prefixed with [index]. Return ONLY a JSON array of translated strings in the same order, same count. Example input: "[0] Hello\n[1] World" → output: ["Merhaba", "Dünya"]. No extra keys, no explanations.`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`)
  }

  const data = await res.json()
  const raw = JSON.parse(data.choices[0].message.content)

  // Accept array directly or nested under any key
  let arr: unknown[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else {
    const vals = Object.values(raw)
    arr = Array.isArray(vals[0]) ? (vals[0] as unknown[]) : vals
  }

  // Map back by index — lenient: fill missing with originals
  return texts.map((orig, i) => {
    const t = arr[i]
    if (typeof t !== 'string' || !t.trim()) return orig
    // Strip any "[0] " prefix the model might echo
    return t.replace(/^\[\d+\]\s*/, '').trim()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      subtitles: SubtitleEntry[]
      targetLanguage: string
      targetLanguageName: string
    }

    const { subtitles, targetLanguage, targetLanguageName } = body

    if (!subtitles?.length) {
      return NextResponse.json({ error: 'Altyazı bulunamadı' }, { status: 400 })
    }
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY ayarlanmamış' }, { status: 503 })
    }

    const allTexts = subtitles.map(s => s.text)
    const translatedTexts: string[] = []

    for (let i = 0; i < allTexts.length; i += BATCH) {
      const batch = allTexts.slice(i, i + BATCH)
      const result = await translateBatch(batch, targetLanguage, targetLanguageName)
      translatedTexts.push(...result)
    }

    const translatedSubtitles = subtitles.map((s, i) => ({
      ...s,
      text: translatedTexts[i] ?? s.text,
    }))

    return NextResponse.json({ subtitles: translatedSubtitles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Çeviri hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
