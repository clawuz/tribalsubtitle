'use client'
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { SubtitleComposition } from '@/compositions/SubtitleComposition'
import type { WebSubtitleProps } from '@/compositions/SubtitleComposition'
import { PLATFORMS } from '@/remotion/compositions/platforms'
import type { PlatformKey } from '@/remotion/compositions/platforms'

const FPS = 30

interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
}

interface SubtitleLivePreviewProps {
  values: Record<string, unknown>
}

function msToFrames(ms: number): number {
  return Math.round((ms / 1000) * FPS)
}

function framesToTime(frame: number): string {
  const totalSec = frame / FPS
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  const dec = Math.floor((totalSec % 1) * 10)
  return `${m}:${String(s).padStart(2, '0')}.${dec}`
}

export const SubtitleLivePreview: React.FC<SubtitleLivePreviewProps> = ({ values }) => {
  const playerRef = useRef<PlayerRef>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false)

  const durationSec = Number(values.durationSeconds ?? 30)
  const durationFrames = Math.max(1, Math.round(durationSec * FPS))
  const platformKey = (values.platform as PlatformKey) ?? '9:16'
  const platform = PLATFORMS[platformKey] ?? PLATFORMS['9:16']
  const subtitles: SubtitleEntry[] = Array.isArray(values.subtitles)
    ? (values.subtitles as SubtitleEntry[])
    : []

  const compositionProps: WebSubtitleProps = {
    platform: platformKey,
    backgroundMedia: String(values.backgroundMedia ?? ''),
    subtitles,
    subtitlePosition: (values.subtitlePosition as 'bottom' | 'top' | 'middle') ?? 'bottom',
    subtitleFontSize: Number(values.subtitleFontSize ?? 52),
    subtitleFontFamily: String(values.subtitleFontFamily ?? 'TKTextVF'),
    subtitleColor: String(values.subtitleColor ?? '#ffffff'),
    subtitleBgColor: String(values.subtitleBgColor ?? 'rgba(0,0,0,0.65)'),
    subtitleBold: Boolean(values.subtitleBold ?? true),
    subtitleOutline: Boolean(values.subtitleOutline ?? false),
    subtitleOutlineColor: String(values.subtitleOutlineColor ?? '#000000'),
    subtitleOutlineWidth: Number(values.subtitleOutlineWidth ?? 3),
    showLowerThird: Boolean(values.showLowerThird ?? false),
    lowerThirdText: String(values.lowerThirdText ?? ''),
    lowerThirdColor: String(values.lowerThirdColor ?? '#10b981'),
    logoUrl: String(values.logoUrl ?? ''),
    accentColor: String(values.accentColor ?? '#10b981'),
    backgroundColor: String(values.backgroundColor ?? '#000000'),
  }

  // Wire player events
  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    const onFrame = ({ detail }: { detail: { frame: number } }) => setCurrentFrame(detail.frame)
    const onPlay = () => { setIsPlaying(true); isPlayingRef.current = true }
    const onPause = () => { setIsPlaying(false); isPlayingRef.current = false }
    const onEnded = () => { setIsPlaying(false); isPlayingRef.current = false }
    player.addEventListener('frameupdate', onFrame)
    player.addEventListener('play', onPlay)
    player.addEventListener('pause', onPause)
    player.addEventListener('ended', onEnded)
    return () => {
      player.removeEventListener('frameupdate', onFrame)
      player.removeEventListener('play', onPlay)
      player.removeEventListener('pause', onPause)
      player.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (isPlayingRef.current) {
      player.pause()
    } else {
      player.play()
    }
  }, [])

  const seekTo = useCallback((frame: number) => {
    const player = playerRef.current
    if (!player) return
    player.pause()
    player.seekTo(frame)
    setCurrentFrame(frame)
    setIsPlaying(false)
    isPlayingRef.current = false
  }, [])

  // Timeline click → seek
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(Math.round(ratio * durationFrames))
  }, [durationFrames, seekTo])

  // Subtitle block click → seek to start of that subtitle
  const handleSubtitleClick = useCallback((e: React.MouseEvent, startMs: number) => {
    e.stopPropagation()
    seekTo(msToFrames(startMs))
  }, [seekTo])

  const progress = durationFrames > 0 ? currentFrame / durationFrames : 0
  const safeTop = (platform.safeTop / platform.h) * 100
  const safeLeft = (platform.safeLeft / platform.w) * 100
  const safeRight = (platform.safeRight / platform.w) * 100
  const safeBottom = (platform.safeBottom / platform.h) * 100

  const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16']
  const totalDurationMs = durationSec * 1000

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', borderRadius: 12, overflow: 'hidden' }}>
      {/* Player area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', containerType: 'size' } as React.CSSProperties}>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          boxSizing: 'border-box',
        }}>
          <div style={{
            position: 'relative',
            width: `min(calc(100cqw - 16px), calc((100cqh - 16px) * ${platform.w} / ${platform.h}))`,
            aspectRatio: `${platform.w}/${platform.h}`,
          } as React.CSSProperties}>
            <Player
              ref={playerRef}
              component={SubtitleComposition as unknown as React.ComponentType<Record<string, unknown>>}
              inputProps={compositionProps as unknown as Record<string, unknown>}
              durationInFrames={durationFrames}
              compositionWidth={platform.w}
              compositionHeight={platform.h}
              fps={FPS}
              style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }}
              controls={false}
              loop={false}
              showVolumeControls={false}
              clickToPlay={false}
            />
            {/* Safe area overlay */}
            <div style={{
              position: 'absolute',
              top: `${safeTop}%`,
              left: `${safeLeft}%`,
              right: `${safeRight}%`,
              bottom: `${safeBottom}%`,
              border: '1.5px dashed rgba(239,68,68,0.5)',
              borderRadius: 4,
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => seekTo(Math.max(0, currentFrame - FPS))}
          style={{ background: '#21262d', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 4, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
        >⏮</button>
        <button
          onClick={togglePlay}
          style={{ background: '#6366f1', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => seekTo(Math.min(durationFrames - 1, currentFrame + FPS))}
          style={{ background: '#21262d', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 4, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
        >⏭</button>
        <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', background: '#161b22', padding: '3px 8px', borderRadius: 3, flexShrink: 0 }}>
          {framesToTime(currentFrame)} / {framesToTime(durationFrames)}
        </span>
      </div>

      {/* Timeline */}
      <div style={{ padding: '0 16px 6px' }}>
        {/* Playhead scrubber */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{
            position: 'relative',
            height: 6,
            background: '#21262d',
            borderRadius: 3,
            cursor: 'pointer',
            marginBottom: 6,
          }}
        >
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress * 100}%`,
            background: '#6366f1',
            borderRadius: 3,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Subtitle blocks */}
        {subtitles.length > 0 && (
          <div style={{ position: 'relative', height: 18, marginBottom: 4 }}>
            {subtitles.map((s, i) => {
              const startPct = (s.startMs / (totalDurationMs || 1)) * 100
              const widthPct = ((s.endMs - s.startMs) / (totalDurationMs || 1)) * 100
              return (
                <div
                  key={i}
                  onClick={(e) => handleSubtitleClick(e, s.startMs)}
                  title={s.text}
                  style={{
                    position: 'absolute',
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    height: '100%',
                    background: palette[i % palette.length],
                    borderRadius: 2,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    opacity: 0.85,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 3,
                  }}
                >
                  <span style={{ fontSize: 9, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.text}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
