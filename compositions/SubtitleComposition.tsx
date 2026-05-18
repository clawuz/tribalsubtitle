'use client'
// Web-side Subtitle composition — imports remotion from subtitle-app/node_modules.
// Do NOT import from remotion/compositions/Subtitle.tsx here; that pulls in the
// bundler-side remotion instance and causes dual-remotion-version errors in the browser.
import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Video, Img as RemotionImg, staticFile } from 'remotion'

const Img = RemotionImg as React.ComponentType<any>
import { PLATFORMS } from '@/remotion/compositions/platforms'
import type { PlatformKey } from '@/remotion/compositions/platforms'

export interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
  color?: string
  bgColor?: string
  fontSize?: number
  bold?: boolean
  x?: number
  y?: number
}

export interface WebSubtitleProps {
  platform: PlatformKey
  backgroundMedia: string
  subtitles: SubtitleEntry[]
  subtitleX: number
  subtitleY: number
  subtitleFontSize: number
  subtitleFontFamily: string
  subtitleColor: string
  subtitleBgColor: string
  subtitleBold: boolean
  subtitleOutline: boolean
  subtitleOutlineColor: string
  subtitleOutlineWidth: number
  showLowerThird: boolean
  lowerThirdText: string
  lowerThirdColor: string
  logoUrl: string
  accentColor: string
  backgroundColor: string
}

function resolveMedia(src: string): string {
  return /^(https?:|blob:|data:)/.test(src) ? src : staticFile(src)
}

export const SubtitleComposition: React.FC<WebSubtitleProps> = (props) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const currentMs = (frame / fps) * 1000

  const platform = PLATFORMS[props.platform] ?? PLATFORMS['9:16']

  const active = props.subtitles.find(
    s => currentMs >= s.startMs && currentMs < s.endMs
  )

  const effectiveX = active?.x ?? props.subtitleX
  const effectiveY = active?.y ?? props.subtitleY
  const effectiveFontSize = active?.fontSize ?? props.subtitleFontSize
  const effectiveColor = active?.color ?? props.subtitleColor
  const effectiveBgColor = active?.bgColor ?? props.subtitleBgColor
  const effectiveBold = active?.bold ?? props.subtitleBold

  const getPositionStyle = (): React.CSSProperties => {
    const safeW = width - platform.safeLeft - platform.safeRight
    const safeH = height - platform.safeTop - platform.safeBottom
    const px = platform.safeLeft + safeW * effectiveX / 100
    const py = platform.safeTop + safeH * effectiveY / 100
    return {
      position: 'absolute',
      left: px,
      top: py,
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      zIndex: 10,
      maxWidth: safeW,
    }
  }

  const textStyle: React.CSSProperties = {
    fontSize: effectiveFontSize,
    fontFamily: props.subtitleFontFamily,
    color: effectiveColor,
    fontWeight: effectiveBold ? 700 : 400,
    lineHeight: 1.3,
    padding: active ? '12px 24px' : 0,
    borderRadius: 8,
    backgroundColor: active ? effectiveBgColor : 'transparent',
    WebkitTextStroke: props.subtitleOutline
      ? `${props.subtitleOutlineWidth ?? 3}px ${props.subtitleOutlineColor}`
      : undefined,
    display: 'inline-block',
    maxWidth: '100%',
    wordBreak: 'break-word',
  }

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {/* Background media */}
      {props.backgroundMedia && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {/\.(mp4|webm|mov)(\?|$)/i.test(props.backgroundMedia) ? (
            <Video
              src={resolveMedia(props.backgroundMedia)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => undefined}
            />
          ) : (
            <Img
              src={resolveMedia(props.backgroundMedia)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
      )}

      {/* Subtitle text */}
      <div style={getPositionStyle()}>
        <span style={textStyle}>{active?.text ?? ''}</span>
      </div>

      {/* Lower third */}
      {props.showLowerThird && props.lowerThirdText && (
        <div style={{
          position: 'absolute',
          bottom: platform.safeBottom + 80,
          left: platform.safeLeft,
          right: platform.safeRight,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ width: 4, height: 40, background: props.lowerThirdColor, borderRadius: 2, flexShrink: 0 }} />
          <span style={{
            fontSize: 32,
            color: '#ffffff',
            fontFamily: props.subtitleFontFamily,
            fontWeight: 600,
          }}>{props.lowerThirdText}</span>
        </div>
      )}

      {/* Logo */}
      {props.logoUrl && (
        <div style={{
          position: 'absolute',
          top: platform.safeTop + 20,
          right: platform.safeRight + 20,
          zIndex: 20,
          width: 80,
          height: 80,
        }}>
          <Img src={resolveMedia(props.logoUrl)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </AbsoluteFill>
  )
}
