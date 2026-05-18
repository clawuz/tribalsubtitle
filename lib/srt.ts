import type { SubtitleEntry } from '@/remotion/compositions/types'

function srtTimeToMs(t: string): number {
  const [hms, ms] = t.split(',')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3_600_000 + m * 60_000 + s * 1_000 + Number(ms)
}

function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  const millis = ms % 1_000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(millis)}`
}

function pad2(n: number): string { return String(n).padStart(2, '0') }
function pad3(n: number): string { return String(n).padStart(3, '0') }

export function parseSrt(srt: string): SubtitleEntry[] {
  const blocks = srt.trim().split(/\n\s*\n/)
  return blocks.flatMap(block => {
    const lines = block.trim().split('\n')
    if (lines.length < 3) return []
    const match = lines[1].match(
      /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
    )
    if (!match) return []
    const text = lines.slice(2).join('\n').trim()
    return [{ startMs: srtTimeToMs(match[1]), endMs: srtTimeToMs(match[2]), text }]
  })
}

export function exportSrt(subtitles: SubtitleEntry[]): string {
  return subtitles
    .map((s, i) =>
      `${i + 1}\n${msToSrtTime(s.startMs)} --> ${msToSrtTime(s.endMs)}\n${s.text}\n\n`
    )
    .join('')
}
