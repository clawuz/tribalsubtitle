export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

interface SubtitleEntry { startMs: number; endMs: number; text: string }

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

    const texts = subtitles.map(s => s.text)

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Translate the following subtitle texts to ${targetLanguageName} (language code: ${targetLanguage}).
Return a JSON object with key "translations" containing an array of translated strings.
Same count and order as input. Do not add explanations or change timing.

Input: ${JSON.stringify(texts)}`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    if (!groqRes.ok) {
      const detail = await groqRes.text()
      return NextResponse.json({ error: `Groq hatası: ${detail}` }, { status: 500 })
    }

    const aiData = await groqRes.json()
    const content = JSON.parse(aiData.choices[0].message.content)
    const translated: string[] = content.translations ?? Object.values(content)

    if (!Array.isArray(translated) || translated.length !== subtitles.length) {
      return NextResponse.json({ error: 'Çeviri sayısı eşleşmiyor' }, { status: 500 })
    }

    const translatedSubtitles = subtitles.map((s, i) => ({
      ...s,
      text: translated[i] ?? s.text,
    }))

    return NextResponse.json({ subtitles: translatedSubtitles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Çeviri hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
