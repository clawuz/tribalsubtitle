// src/compositions/types.ts

export const ENTRY_ANIM_TYPES = [
  'none',
  'fade', 'zoom', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'pop', 'typewriter', 'blur', 'flip', 'elastic', 'rise',
  'wave', 'split', 'neon-glow', 'spin-3d', 'glitch',
] as const

export const EXIT_ANIM_TYPES = [
  'none',
  'fade-out', 'zoom-out',
  'slide-out-up', 'slide-out-down', 'slide-out-left', 'slide-out-right',
  'shrink', 'blur-out', 'flip-out',
  'wave-out', 'split-out', 'glitch-out', 'neon-flicker', 'dissolve', 'light-speed',
] as const

export type EntryAnimType = typeof ENTRY_ANIM_TYPES[number]
export type ExitAnimType = typeof EXIT_ANIM_TYPES[number]

/** Animations that require per-letter rendering via LetterAnimated */
export const PER_LETTER_ENTRY: ReadonlySet<EntryAnimType> = new Set<EntryAnimType>(['wave', 'split', 'glitch'])
export const PER_LETTER_EXIT: ReadonlySet<ExitAnimType> = new Set<ExitAnimType>(['wave-out', 'split-out', 'glitch-out'])

export interface BodyItem {
  text: string
  slot: number        // 1–10: vertical position in video
  startSec: number
  durationSec: number
  entryAnim: EntryAnimType
  exitAnim: ExitAnimType
}

export interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
}

export interface WordSegment {
  word: string
  startMs: number
  endMs: number
}

export type SubtitleSplitMode = 'sentence' | 'word' | 'chunk'
