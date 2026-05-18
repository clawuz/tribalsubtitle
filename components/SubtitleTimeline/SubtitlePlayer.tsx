'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTimelineStore } from '@/lib/stores/timelineStore'

interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
}

interface Props {
  videoUrl: string
  platform?: string
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

const PLATFORM_DIMS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
}

// Safe area insets as fraction of output dimensions (top, right, bottom, left)
const SAFE_AREAS: Record<string, [number, number, number, number]> = {
  '9:16': [0.08, 0.05, 0.15, 0.05],   // TikTok/Reels — bottom UI heavy
  '16:9': [0.05, 0.05, 0.05, 0.05],
  '1:1':  [0.05, 0.05, 0.05, 0.05],
  '4:5':  [0.07, 0.05, 0.07, 0.05],
}

export function SubtitlePlayer({ videoUrl, platform = '9:16', subtitles, subtitleStyle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const [showSafeArea, setShowSafeArea] = useState(true)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain')
  const [containerSize, setContainerSize] = useState({ w: 1, h: 1 })

  const { currentTime, isPlaying, duration, setCurrentTime, setIsPlaying, setDuration } = useTimelineStore()

  const dims = PLATFORM_DIMS[platform] ?? PLATFORM_DIMS['9:16']
  const safe = SAFE_AREAS[platform] ?? SAFE_AREAS['9:16']
  const aspectRatio = dims.w / dims.h

  const style = {
    fontSize: subtitleStyle?.fontSize ?? 52,
    fontFamily: subtitleStyle?.fontFamily ?? 'sans-serif',
    color: subtitleStyle?.color ?? '#ffffff',
    bgColor: subtitleStyle?.bgColor ?? 'rgba(0,0,0,0.65)',
    bold: subtitleStyle?.bold ?? true,
    x: subtitleStyle?.x ?? 50,
    y: subtitleStyle?.y ?? 85,
  }

  // Measure container for font scaling
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute actual displayed video box within container
  const containerAr = containerSize.w / containerSize.h
  let displayW: number, displayH: number
  if (fitMode === 'contain') {
    if (containerAr > aspectRatio) {
      displayH = containerSize.h
      displayW = displayH * aspectRatio
    } else {
      displayW = containerSize.w
      displayH = displayW / aspectRatio
    }
  } else {
    if (containerAr > aspectRatio) {
      displayW = containerSize.w
      displayH = displayW / aspectRatio
    } else {
      displayH = containerSize.h
      displayW = displayH * aspectRatio
    }
  }

  // Scale factor: output px → display px
  const scale = displayW / dims.w
  const scaledFontSize = Math.max(10, style.fontSize * scale)

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.play().catch(() => {})
    else video.pause()
  }, [isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying) return
    if (Math.abs(video.currentTime - currentTime) > 0.05) video.currentTime = currentTime
  }, [currentTime, isPlaying])

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
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  // Safe area overlay dimensions relative to displayed video
  const safeTop    = safe[0] * displayH
  const safeRight  = safe[1] * displayW
  const safeBottom = safe[2] * displayH
  const safeLeft   = safe[3] * displayW

  return (
    <div className="relative w-full h-full flex flex-col bg-black select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 border-b border-gray-800 shrink-0">
        <button
          onClick={() => setFitMode(m => m === 'contain' ? 'cover' : 'contain')}
          className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          {fitMode === 'contain' ? 'Fit' : 'Fill'}
        </button>
        <button
          onClick={() => setShowSafeArea(v => !v)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${showSafeArea ? 'text-amber-400 border-amber-600' : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
        >
          Safe Area
        </button>
        <span className="ml-auto text-[10px] text-gray-600">{platform} · {dims.w}×{dims.h}</span>
      </div>

      {/* Video area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden flex items-center justify-center"
        style={{ background: '#080c14' }}
      >
        {/* Sized video box */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ width: displayW, height: displayH }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: fitMode }}
            crossOrigin="anonymous"
            preload="auto"
            playsInline
          />

          {/* Safe area overlay */}
          {showSafeArea && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
              {/* Top unsafe */}
              <div className="absolute top-0 left-0 right-0 bg-black/30" style={{ height: safeTop }} />
              {/* Bottom unsafe */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/30" style={{ height: safeBottom }} />
              {/* Left unsafe */}
              <div className="absolute left-0 bg-black/30" style={{ top: safeTop, bottom: safeBottom, width: safeLeft }} />
              {/* Right unsafe */}
              <div className="absolute right-0 bg-black/30" style={{ top: safeTop, bottom: safeBottom, width: safeRight }} />
              {/* Safe border */}
              <div
                className="absolute border border-amber-400/50"
                style={{
                  top: safeTop, left: safeLeft,
                  right: safeRight, bottom: safeBottom,
                  boxShadow: 'inset 0 0 0 1px rgba(251,191,36,0.3)',
                }}
              />
              <span className="absolute text-[9px] text-amber-400/70 font-mono"
                style={{ top: safeTop + 3, left: safeLeft + 4 }}>
                SAFE
              </span>
            </div>
          )}

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
                zIndex: 10,
              }}
            >
              <span
                style={{
                  fontSize: `${scaledFontSize}px`,
                  fontFamily: style.fontFamily,
                  color: style.color,
                  fontWeight: style.bold ? 'bold' : 'normal',
                  background: style.bgColor,
                  padding: `${scaledFontSize * 0.08}px ${scaledFontSize * 0.23}px`,
                  borderRadius: `${scaledFontSize * 0.12}px`,
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
          <div className="absolute inset-0 cursor-pointer" style={{ zIndex: 20 }} onClick={togglePlay} />
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-t border-gray-700 shrink-0">
        <button
          onClick={togglePlay}
          className="text-white text-sm w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={e => { setIsPlaying(false); setCurrentTime(Number(e.target.value)) }}
          className="flex-1 accent-indigo-500 h-1"
        />
        <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>
    </div>
  )
}
