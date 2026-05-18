import React from 'react'
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img as RemotionImg,
  OffthreadVideo,
  staticFile,
} from 'remotion'

const Img = RemotionImg as React.ComponentType<any>
import { z } from 'zod'
import { PLATFORM_KEYS, PLATFORMS } from './platforms'

const subtitleEntrySchema = z.object({
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  color: z.string().optional(),
  bgColor: z.string().optional(),
  fontSize: z.number().optional(),
  bold: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
})

export const subtitleSchema = z.object({
  platform: z.enum(PLATFORM_KEYS as unknown as [string, ...string[]]).default('9:16'),
  backgroundMedia: z.string().default(''),
  subtitles: z.array(subtitleEntrySchema).default([]),
  splitMode: z.enum(['sentence', 'word', 'chunk']).default('sentence'),
  chunkSize: z.number().min(1).max(20).default(5),
  subtitleX: z.number().min(0).max(100).default(50),
  subtitleY: z.number().min(0).max(100).default(85),
  subtitleFontSize: z.number().min(24).max(120).default(52),
  subtitleFontFamily: z.string().default('Poppins'),
  subtitleColor: z.string().default('#ffffff'),
  subtitleBgColor: z.string().default('rgba(0,0,0,0.65)'),
  subtitleBold: z.boolean().default(true),
  subtitleOutline: z.boolean().default(false),
  subtitleOutlineColor: z.string().default('#000000'),
  subtitleOutlineWidth: z.number().min(1).max(20).default(3),
  showLowerThird: z.boolean().default(false),
  lowerThirdText: z.string().default(''),
  lowerThirdColor: z.string().default('#10b981'),
  logoUrl: z.string().default(''),
  accentColor: z.string().default('#10b981'),
  backgroundColor: z.string().default('#000000'),
})

export type SubtitleProps = z.infer<typeof subtitleSchema>

function mediaUrl(src: string): string {
  return /^(https?:|data:)/.test(src) ? src : staticFile(src)
}

export const Subtitle: React.FC<SubtitleProps> = (props) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const currentMs = (frame / fps) * 1000

  const platformKey = props.platform as keyof typeof PLATFORMS
  const platform = PLATFORMS[platformKey] ?? PLATFORMS['9:16']

  const activeSubtitle = props.subtitles.find(
    s => currentMs >= s.startMs && currentMs < s.endMs
  )

  const effectiveX = activeSubtitle?.x ?? props.subtitleX
  const effectiveY = activeSubtitle?.y ?? props.subtitleY
  const effectiveFontSize = activeSubtitle?.fontSize ?? props.subtitleFontSize
  const effectiveColor = activeSubtitle?.color ?? props.subtitleColor
  const effectiveBgColor = activeSubtitle?.bgColor ?? props.subtitleBgColor
  const effectiveBold = activeSubtitle?.bold ?? props.subtitleBold

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
    padding: activeSubtitle ? '12px 24px' : 0,
    borderRadius: 8,
    backgroundColor: activeSubtitle ? effectiveBgColor : 'transparent',
    WebkitTextStroke: props.subtitleOutline ? `${props.subtitleOutlineWidth ?? 3}px ${props.subtitleOutlineColor}` : undefined,
    display: 'inline-block',
    maxWidth: '100%',
    wordBreak: 'break-word',
  }

  return (
    <AbsoluteFill
      style={{ backgroundColor: props.backgroundColor, fontFamily: props.subtitleFontFamily }}
    >
      {/* Background media */}
      {props.backgroundMedia && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {/\.(mp4|webm|mov)(\?|$)/i.test(props.backgroundMedia) ? (
            <OffthreadVideo
              src={mediaUrl(props.backgroundMedia)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Img
              src={mediaUrl(props.backgroundMedia)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
      )}

      {/* Logo */}
      {props.logoUrl && (
        <div
          style={{
            position: 'absolute',
            top: platform.safeTop + 16,
            right: platform.safeRight + 16,
            zIndex: 2,
          }}
        >
          <Img src={props.logoUrl} style={{ height: 48, objectFit: 'contain' }} />
        </div>
      )}

      {/* Lower third */}
      {props.showLowerThird && props.lowerThirdText && (
        <div
          style={{
            position: 'absolute',
            bottom: platform.safeBottom + props.subtitleFontSize * 1.8 + 40,
            left: 0,
            right: 0,
            padding: `12px ${platform.safeLeft + 16}px`,
            backgroundColor: props.lowerThirdColor,
            zIndex: 3,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
            {props.lowerThirdText}
          </div>
        </div>
      )}

      {/* Subtitle */}
      <div style={getPositionStyle()}>
        <span style={textStyle}>{activeSubtitle?.text ?? ''}</span>
      </div>
    </AbsoluteFill>
  )
}
