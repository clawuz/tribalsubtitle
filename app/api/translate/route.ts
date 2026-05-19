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

    const BATCH = 40
    const translatedTexts: string[] = []

    for (let i = 0; i < subtitles.length; i += BATCH) {
      const batch = subtitles.slice(i, i + BATCH)
      const numbered = batch.map((s, j) => `${i + j + 1}. ${s.text}`).join('\n')

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'system',
            content: `You are a subtitle translator. Translate each numbered line to ${targetLanguageName} (${targetLanguage}). Keep the same numbering and count. Return JSON: {"translations": ["line1", "line2", ...]} — exactly ${batch.length} items, same order, no merging or splitting.`,
          }, {
            role: 'user',
            content: numbered,
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
      const batchTranslated: string[] = content.translations ?? Object.values(content)

      if (!Array.isArray(batchTranslated) || batchTranslated.length !== batch.length) {
        batch.forEach(s => translatedTexts.push(s.text))
      } else {
        // Strip leading "1. " numbering the LLM sometimes adds
        batchTranslated.forEach(t => translatedTexts.push(String(t).replace(/^\d+\.\s*/, '').trim()))
      }
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
