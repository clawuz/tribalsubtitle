import React from 'react'
import { Composition } from 'remotion'
import { Subtitle, type SubtitleProps } from './compositions/Subtitle'

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Subtitle"
      component={Subtitle as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        platform: '9:16',
        backgroundMedia: '',
        subtitles: [],
        splitMode: 'sentence',
        chunkSize: 5,
        subtitlePosition: 'bottom',
        subtitleFontSize: 52,
        subtitleFontFamily: 'Poppins',
        subtitleColor: '#ffffff',
        subtitleBgColor: 'rgba(0,0,0,0.65)',
        subtitleBold: true,
        subtitleOutline: false,
        subtitleOutlineColor: '#000000',
        showLowerThird: false,
        lowerThirdText: '',
        lowerThirdColor: '#10b981',
        logoUrl: '',
        accentColor: '#10b981',
        backgroundColor: '#000000',
      } satisfies SubtitleProps}
      calculateMetadata={async ({ props }) => {
        const p = props as unknown as SubtitleProps & { width?: number; height?: number; durationInFrames?: number; fps?: number }
        const width = p.width ?? 1080
        const height = p.height ?? 1920
        const fps = p.fps ?? 30
        const durationInFrames = p.durationInFrames ?? 900
        return { width, height, fps, durationInFrames }
      }}
    />
  </>
)
