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
}

export interface WebSubtitleProps {
  platform: PlatformKey
  backgroundMedia: string
  subtitles: SubtitleEntry[]
  subtitlePosition: 'bottom' | 'top' | 'middle'
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
  const { fps, height } = useVideoConfig()
  const currentMs = (frame / fps) * 1000

  const platform = PLATFORMS[props.platform] ?? PLATFORMS['9:16']

  const active = props.subtitles.find(
    s => currentMs >= s.startMs && currentMs < s.endMs
  )

  const getPositionStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: platform.safeLeft,
      right: platform.safeRight,
      textAlign: 'center',
      zIndex: 10,
    }
    if (props.subtitlePosition === 'top') return { ...base, top: platform.safeTop + 20 }
    if (props.subtitlePosition === 'middle') {
      const safeH = height - platform.safeTop - platform.safeBottom
      return { ...base, top: platform.safeTop + safeH / 2 - props.subtitleFontSize }
    }
    return { ...base, bottom: platform.safeBottom + 20 }
  }

  const textStyle: React.CSSProperties = {
    fontSize: props.subtitleFontSize,
    fontFamily: props.subtitleFontFamily,
    color: props.subtitleColor,
    fontWeight: props.subtitleBold ? 700 : 400,
    lineHeight: 1.3,
    padding: active ? '12px 24px' : 0,
    borderRadius: 8,
    backgroundColor: active ? props.subtitleBgColor : 'transparent',
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
          {/\.(mp4|webm|mov)$/i.test(props.backgroundMedia) ? (
            <Video
              src={resolveMedia(props.backgroundMedia)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
