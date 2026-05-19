'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTimelineStore } from '@/lib/stores/timelineStore'
import { TimelineRuler } from './TimelineRuler'
import { SubtitleClip } from './SubtitleClip'
import { SubtitlePlayer } from './SubtitlePlayer'

export interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
}

interface WordSegment {
  word: string
  startMs: number
  endMs: number
}

interface Props {
  videoUrl: string
  platform?: string
  subtitles: SubtitleEntry[]
  wordSegments?: WordSegment[]
  onSubtitlesChange: (subtitles: SubtitleEntry[]) => void
  subtitleStyle?: {
    fontSize?: number
    fontFamily?: string
    color?: string
    bgColor?: string
    bold?: boolean
    x?: number
    y?: number
  }
}

const TRACK_HEIGHT = 40
const RULER_H = 28
const LABEL_W = 0   // no label column for subtitles

export function SubtitleTimeline({ videoUrl, platform = '9:16', subtitles, wordSegments = [], onSubtitlesChange, subtitleStyle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(800)
  const { zoom, scrollX, duration, currentTime, setZoom, setScrollX, setSelectedId } = useTimelineStore()

  // Measure width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const videoEndX = duration * zoom
  const timelineW = videoEndX + 24

  // Scroll on wheel
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setZoom(zoom * factor)
    } else {
      setScrollX(scrollX + e.deltaX + e.deltaY)
    }
  }, [zoom, scrollX, setZoom, setScrollX])

  // Playhead pixel position
  const playheadX = currentTime * zoom - scrollX

  const updateSubtitle = useCallback((index: number, patch: Partial<SubtitleEntry>) => {
    const next = subtitles.map((s, i) => i === index ? { ...s, ...patch } : s)
    onSubtitlesChange(next)
  }, [subtitles, onSubtitlesChange])

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    setSelectedId(null)
  }, [setSelectedId])

  if (!videoUrl) {
    return (
      <div className="flex flex-col h-full bg-gray-950 items-center justify-center text-gray-500 text-sm gap-2">
        <span className="text-2xl">🎬</span>
        <span>Arkaplan video seçin</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Player — top half */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SubtitlePlayer
          videoUrl={videoUrl}
          platform={platform}
          subtitles={subtitles}
          wordSegments={wordSegments}
          subtitleStyle={subtitleStyle}
        />
      </div>

      {/* Timeline — bottom section */}
      <div className="shrink-0 border-t border-gray-800" style={{ height: `${RULER_H + TRACK_HEIGHT + 16}px` }}>
        {/* Zoom controls */}
        <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-800">
          <span className="text-[10px] text-gray-500">Zoom</span>
          <button onClick={() => setZoom(zoom * 0.75)} className="text-gray-400 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700">−</button>
          <button onClick={() => setZoom(zoom * 1.33)} className="text-gray-400 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700">+</button>
          <span className="text-[10px] text-gray-600">{zoom.toFixed(0)} px/s</span>
          <button onClick={() => { setZoom(80); setScrollX(0) }} className="ml-auto text-[10px] text-gray-500 hover:text-gray-300">Sıfırla</button>
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={containerRef}
          className="overflow-x-auto overflow-y-hidden relative"
          style={{ height: `${RULER_H + TRACK_HEIGHT + 4}px` }}
          onWheel={onWheel}
          onScroll={e => setScrollX((e.currentTarget as HTMLDivElement).scrollLeft)}
        >
          <div style={{ width: `${timelineW}px`, height: '100%', position: 'relative' }}>
            {/* Ruler */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <TimelineRuler width={timelineW} />
            </div>

            {/* Track area */}
            <div
              style={{ position: 'absolute', top: `${RULER_H}px`, left: 0, right: 0, height: `${TRACK_HEIGHT + 4}px` }}
              onClick={handleTrackClick}
            >
              {/* Subtitle clips */}
              {subtitles.map((sub, i) => (
                <SubtitleClip
                  key={i}
                  subtitle={sub}
                  index={i}
                  trackTop={0}
                  trackHeight={TRACK_HEIGHT}
                  onUpdate={updateSubtitle}
                />
              ))}
            </div>

            {/* Video end marker */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: `${videoEndX}px`, width: '2px', background: 'rgba(239,68,68,0.7)', zIndex: 8 }}
            >
              <span className="absolute top-0 left-1 text-[9px] text-red-400 whitespace-nowrap font-mono">END</span>
            </div>

            {/* Playhead */}
            {playheadX >= 0 && playheadX <= timelineW && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: `${playheadX}px`, width: '1px', background: '#f59e0b', zIndex: 10 }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-400 rotate-45" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
