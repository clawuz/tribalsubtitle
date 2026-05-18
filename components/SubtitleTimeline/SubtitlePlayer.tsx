'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTimelineStore } from '@/lib/stores/timelineStore'

interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
}

interface Props {
  videoUrl: string
  subtitles: SubtitleEntry[]
  subtitleStyle?: {
    fontSize?: number
    fontFamily?: string
    color?: string
    bgColor?: string
    bold?: boolean
    x?: number   // 0-100
    y?: number   // 0-100
  }
}

export function SubtitlePlayer({ videoUrl, subtitles, subtitleStyle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)
  const { currentTime, isPlaying, duration, setCurrentTime, setIsPlaying, setDuration } = useTimelineStore()

  const style = {
    fontSize: subtitleStyle?.fontSize ?? 28,
    fontFamily: subtitleStyle?.fontFamily ?? 'sans-serif',
    color: subtitleStyle?.color ?? '#ffffff',
    bgColor: subtitleStyle?.bgColor ?? 'rgba(0,0,0,0.65)',
    bold: subtitleStyle?.bold ?? true,
    x: subtitleStyle?.x ?? 50,
    y: subtitleStyle?.y ?? 85,
  }

  // Sync video → store
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onLoaded = () => setDuration(video.duration)
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0) }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('ended', onEnded)
    }
  }, [setDuration, setIsPlaying, setCurrentTime])

  // Play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isPlaying])

  // Seek from timeline click
  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying) return
    if (Math.abs(video.currentTime - currentTime) > 0.05) {
      video.currentTime = currentTime
    }
  }, [currentTime, isPlaying])

  // RAF loop to update store currentTime while playing
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const tick = () => {
      if (!video.paused) setCurrentTime(video.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setCurrentTime])

  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying, setIsPlaying])

  const activeSub = subtitles.find(s => currentTime * 1000 >= s.startMs && currentTime * 1000 < s.endMs)

  const elapsed = currentTime
  const total = duration
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="relative w-full h-full flex flex-col bg-black select-none">
      {/* Video */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          crossOrigin="anonymous"
          preload="auto"
          playsInline
        />

        {/* Subtitle overlay */}
        {activeSub && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${style.x}%`,
              top: `${style.y}%`,
              transform: 'translate(-50%, -50%)',
              maxWidth: '85%',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: `${style.fontSize}px`,
                fontFamily: style.fontFamily,
                color: style.color,
                fontWeight: style.bold ? 'bold' : 'normal',
                background: style.bgColor,
                padding: '4px 12px',
                borderRadius: '6px',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                display: 'inline-block',
              }}
            >
              {activeSub.text}
            </span>
          </div>
        )}

        {/* Click to play/pause */}
        <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-t border-gray-700 shrink-0">
        <button
          onClick={togglePlay}
          className="text-white text-sm w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.01}
          value={currentTime}
          onChange={e => { setIsPlaying(false); setCurrentTime(Number(e.target.value)) }}
          className="flex-1 accent-indigo-500 h-1"
        />

        <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
          {fmt(elapsed)} / {fmt(total)}
        </span>
      </div>
    </div>
  )
}
