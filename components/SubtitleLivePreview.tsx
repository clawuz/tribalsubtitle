'use client'
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
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

const IS_VIDEO = /\.(mp4|webm|mov)(\?|$)/i

export const SubtitleLivePreview: React.FC<SubtitleLivePreviewProps> = ({ values }) => {
  const playerRef = useRef<PlayerRef>(null)
  const bgVideoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false)

  // Debounce values to avoid recreating the player composition on every keystroke
  const [debouncedValues, setDebouncedValues] = useState(values)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValues(values), 400)
    return () => clearTimeout(t)
  }, [values])

  const durationSec = Number(debouncedValues.durationSeconds ?? 30)
  const durationFrames = Math.max(1, Math.round(durationSec * FPS))
  const platformKey = (debouncedValues.platform as PlatformKey) ?? '9:16'
  const platform = PLATFORMS[platformKey] ?? PLATFORMS['9:16']
  const subtitles: SubtitleEntry[] = Array.isArray(debouncedValues.subtitles)
    ? (debouncedValues.subtitles as SubtitleEntry[])
    : []

  const backgroundMedia = String(debouncedValues.backgroundMedia ?? '')
  const isVideoBackground = IS_VIDEO.test(backgroundMedia)

  // compositionProps never includes the video URL — video is rendered by a separate
  // native <video> element below to avoid creating 75+ WebMediaPlayers in Remotion.
  const compositionProps: WebSubtitleProps = useMemo(() => ({
    platform: platformKey,
    backgroundMedia: isVideoBackground ? '' : backgroundMedia,
    subtitles,
    subtitleX: Number(debouncedValues.subtitleX ?? 50),
    subtitleY: Number(debouncedValues.subtitleY ?? 85),
    subtitleFontSize: Number(debouncedValues.subtitleFontSize ?? 52),
    subtitleFontFamily: String(debouncedValues.subtitleFontFamily ?? 'TKTextVF'),
    subtitleColor: String(debouncedValues.subtitleColor ?? '#ffffff'),
    subtitleBgColor: String(debouncedValues.subtitleBgColor ?? 'rgba(0,0,0,0.65)'),
    subtitleBold: Boolean(debouncedValues.subtitleBold ?? true),
    subtitleOutline: Boolean(debouncedValues.subtitleOutline ?? false),
    subtitleOutlineColor: String(debouncedValues.subtitleOutlineColor ?? '#000000'),
    subtitleOutlineWidth: Number(debouncedValues.subtitleOutlineWidth ?? 3),
    showLowerThird: Boolean(debouncedValues.showLowerThird ?? false),
    lowerThirdText: String(debouncedValues.lowerThirdText ?? ''),
    lowerThirdColor: String(debouncedValues.lowerThirdColor ?? '#10b981'),
    logoUrl: String(debouncedValues.logoUrl ?? ''),
    accentColor: String(debouncedValues.accentColor ?? '#10b981'),
    // transparent so the native <video> behind the Player shows through
    backgroundColor: isVideoBackground ? 'transparent' : String(debouncedValues.backgroundColor ?? '#000000'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [debouncedValues])

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

  // Sync background video playback with Remotion player
  useEffect(() => {
    const vid = bgVideoRef.current
    if (!vid) return
    if (isPlaying) {
      vid.play().catch(() => undefined)
    } else {
      vid.pause()
    }
  }, [isPlaying])

  // Seek background video when player frame changes while paused
  useEffect(() => {
    const vid = bgVideoRef.current
    if (!vid || isPlaying) return
    const targetTime = currentFrame / FPS
    if (Math.abs(vid.currentTime - targetTime) > 0.15) {
      vid.currentTime = targetTime
    }
  }, [currentFrame, isPlaying])

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
  const totalDurationMs = Number(debouncedValues.durationSeconds ?? 30) * 1000

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
            {/* Native video element for background — ONE element, no WebMediaPlayer spam */}
            {isVideoBackground && (
              <video
                ref={bgVideoRef}
                src={backgroundMedia}
                muted
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 8,
                  zIndex: 0,
                }}
              />
            )}
            <Player
              ref={playerRef}
              component={SubtitleComposition as unknown as React.ComponentType<Record<string, unknown>>}
              inputProps={compositionProps as unknown as Record<string, unknown>}
              durationInFrames={durationFrames}
              compositionWidth={platform.w}
              compositionHeight={platform.h}
              fps={FPS}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                borderRadius: 8,
                position: 'relative',
                zIndex: 1,
                background: isVideoBackground ? 'transparent' : undefined,
              }}
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
              zIndex: 2,
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
        <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto', flexShrink: 0 }}>
          {platform.w}×{platform.h} · {platformKey}
        </span>
      </div>

      {/* Range scrubber */}
      <div style={{ padding: '0 16px 8px' }}>
        <input
          type="range"
          min={0}
          max={durationFrames - 1}
          value={currentFrame}
          onChange={e => seekTo(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#6366f1' }}
        />
      </div>

      {/* Timeline tracks */}
      <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Ruler track */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{ position: 'relative', height: 20, background: '#161b22', borderRadius: 4, cursor: 'col-resize', overflow: 'hidden' }}
        >
          {(() => {
            const labelStep = durationSec <= 30 ? 5 : durationSec <= 90 ? 10 : 30
            const minorStep = durationSec <= 30 ? 1 : durationSec <= 90 ? 2 : 5
            const ticks: React.ReactNode[] = []
            for (let s = 0; s <= durationSec; s += minorStep) {
              const pct = (s / durationSec) * 100
              const isMajor = s % labelStep === 0
              ticks.push(
                <div key={`t${s}`} style={{ position: 'absolute', left: `${pct}%`, top: 0, width: 1, height: isMajor ? 10 : 5, background: isMajor ? '#475569' : '#2d3748' }} />
              )
              if (isMajor) {
                ticks.push(
                  <span key={`l${s}`} style={{ position: 'absolute', left: `${pct}%`, bottom: 2, fontSize: 9, color: '#475569', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                    {s}s
                  </span>
                )
              }
            }
            return ticks
          })()}
          {/* Playhead */}
          <div style={{ position: 'absolute', left: `${progress * 100}%`, top: 0, bottom: 0, width: 2, background: '#6366f1', pointerEvents: 'none' }} />
        </div>

        {/* Subtitle blocks track */}
        <div
          onClick={handleTimelineClick}
          style={{ position: 'relative', height: 32, background: '#161b22', borderRadius: 4, cursor: 'col-resize', overflow: 'hidden' }}
        >
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
                  top: 3,
                  bottom: 3,
                  background: i === 0 ? 'rgba(99,102,241,0.55)' : palette[i % palette.length],
                  borderRadius: 3,
                  border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.28)' : palette[i % palette.length]}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 4,
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ fontSize: 9, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
                  {s.text}
                </span>
              </div>
            )
          })}
          {/* Playhead */}
          <div style={{ position: 'absolute', left: `${progress * 100}%`, top: 0, bottom: 0, width: 2, background: '#6366f1', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  )
}
