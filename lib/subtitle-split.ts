import type { WordSegment, SubtitleEntry, SubtitleSplitMode } from '@/remotion/compositions/types'

const SENTENCE_END = /[.!?…]$/

export function splitToSubtitles(
  segments: WordSegment[],
  mode: SubtitleSplitMode,
  chunkSize: number
): SubtitleEntry[] {
  if (segments.length === 0) return []

  if (mode === 'word') {
    return segments.map(w => ({ startMs: w.startMs, endMs: w.endMs, text: w.word }))
  }

  if (mode === 'chunk') {
    const result: SubtitleEntry[] = []
    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunk = segments.slice(i, i + chunkSize)
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

  for (const seg of segments) {
    current.push(seg)
    if (SENTENCE_END.test(seg.word)) {
      result.push({
        startMs: current[0].startMs,
        endMs: current[current.length - 1].endMs,
        text: current.map(w => w.word).join(' '),
      })
      current = []
    }
  }

  if (current.length > 0) {
    result.push({
      startMs: current[0].startMs,
      endMs: current[current.length - 1].endMs,
      text: current.map(w => w.word).join(' '),
    })
  }

  return result
}
