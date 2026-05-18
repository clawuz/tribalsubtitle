export type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1'
export type ContainerFormat = 'mp4' | 'webm'
export type RateControl = 'cbr' | 'vbr'

export interface ExportSettings {
  width: number
  height: number
  fps: number
  codec: VideoCodec
  container: ContainerFormat
  bitrate: number
  rateControl: RateControl
  includeAudio: boolean
  audioBitrate: number
  audioSampleRate: number
}

export interface ExportProgress {
  phase: 'video' | 'audio' | 'muxing' | 'done'
  percent: number
  currentFrame?: number
  totalFrames?: number
  estimatedSecondsRemaining?: number
}

export interface ResolutionPreset { label: string; width: number; height: number }
export interface FrameRatePreset  { label: string; fps: number }
export interface ContainerFormatOption { id: ContainerFormat; label: string; extension: string }
export interface VideoCodecOption { id: VideoCodec; label: string; description: string }

export function getKeyframeInterval(fps: number): number {
  return fps // 1 keyframe per second
}
