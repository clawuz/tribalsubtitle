import { create } from 'zustand'
import type { VideoCodec, ContainerFormat, RateControl } from '../engine/export/types'

export interface ClientExportSettings {
  codec: VideoCodec
  container: ContainerFormat
  rateControl: RateControl
  bitrate: number
  fps: number
  includeAudio: boolean
  audioBitrate: number
  audioSampleRate: number
}

const defaults: ClientExportSettings = {
  codec: 'h264',
  container: 'mp4',
  rateControl: 'vbr',
  bitrate: 8_000_000,
  fps: 30,
  includeAudio: true,
  audioBitrate: 192_000,
  audioSampleRate: 48000,
}

interface ExportStore {
  settings: ClientExportSettings
  set: (patch: Partial<ClientExportSettings>) => void
  reset: () => void
}

export const useExportStore = create<ExportStore>((set) => ({
  settings: { ...defaults },
  set: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  reset: () => set({ settings: { ...defaults } }),
}))
