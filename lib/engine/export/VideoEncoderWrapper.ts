// Adapted from MasterSelects — Logger replaced with console
import { MediaBunnyMuxerAdapter, type MuxerAdapter } from './MediaBunnyMuxerAdapter'
import { AudioEncoderWrapper, type AudioCodec, type EncodedAudioResult } from '../audio/AudioEncoder'
import type { ExportSettings, VideoCodec, ContainerFormat } from './types'
import { getCodecString, isCodecSupportedInContainer, getFallbackCodec } from './codecHelpers'

export class VideoEncoderWrapper {
  private encoder: VideoEncoder | null = null
  private muxer: MuxerAdapter | null = null
  private settings: ExportSettings
  private encodedFrameCount = 0
  private isClosed = false
  private hasAudio = false
  private audioCodec: AudioCodec = 'aac'
  private containerFormat: ContainerFormat = 'mp4'
  private effectiveVideoCodec: VideoCodec = 'h264'
  private effectiveBitrateMode: VideoEncoderBitrateMode = 'variable'

  constructor(settings: ExportSettings) {
    this.settings = settings
    this.hasAudio = settings.includeAudio ?? false
    this.containerFormat = settings.container ?? 'mp4'
  }

  async init(): Promise<boolean> {
    if (!('VideoEncoder' in window)) {
      console.error('[VideoEncoder] WebCodecs not supported')
      return false
    }

    await this.initializeAudioCodec()

    this.effectiveVideoCodec = this.settings.codec
    if (!isCodecSupportedInContainer(this.settings.codec, this.containerFormat)) {
      this.effectiveVideoCodec = getFallbackCodec(this.containerFormat)
    }

    const codecString = getCodecString(this.effectiveVideoCodec)
    const requestedBitrateMode: VideoEncoderBitrateMode =
      this.settings.rateControl === 'cbr' ? 'constant' : 'variable'
    const supportCheckConfig = {
      codec: codecString,
      width: this.settings.width,
      height: this.settings.height,
      bitrate: this.settings.bitrate,
      framerate: this.settings.fps,
    }

    try {
      const support = await VideoEncoder.isConfigSupported({ ...supportCheckConfig, bitrateMode: requestedBitrateMode })
      this.effectiveBitrateMode = requestedBitrateMode
      if (!support.supported) {
        const fallback = await VideoEncoder.isConfigSupported({ ...supportCheckConfig, bitrateMode: 'variable' })
        if (!fallback.supported) return false
        this.effectiveBitrateMode = 'variable'
      }
    } catch (e) {
      console.error('[VideoEncoder] Codec support check failed:', e)
      return false
    }

    this.createMuxer()

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.muxer?.addVideoChunk(chunk, meta)
        this.encodedFrameCount++
      },
      error: (e) => console.error('[VideoEncoder] Encode error:', e),
    })

    try {
      this.encoder.configure({ ...supportCheckConfig, latencyMode: 'quality', bitrateMode: this.effectiveBitrateMode })
    } catch {
      this.encoder.configure({ ...supportCheckConfig, latencyMode: 'quality', bitrateMode: 'variable' })
      this.effectiveBitrateMode = 'variable'
    }

    return true
  }

  private async initializeAudioCodec(): Promise<void> {
    if (!this.hasAudio) return
    if (this.containerFormat === 'webm') {
      this.audioCodec = await AudioEncoderWrapper.isOpusSupported() ? 'opus' : (() => { this.hasAudio = false; return 'aac' as AudioCodec })()
    } else {
      if (await AudioEncoderWrapper.isAACSupported()) { this.audioCodec = 'aac' }
      else if (await AudioEncoderWrapper.isOpusSupported()) { this.audioCodec = 'opus' }
      else { this.hasAudio = false }
    }
  }

  private createMuxer(): void {
    this.muxer = new MediaBunnyMuxerAdapter({
      container: this.containerFormat,
      videoCodec: this.effectiveVideoCodec,
      fps: this.settings.fps,
      hasAudio: this.hasAudio,
      audioCodec: this.audioCodec,
    })
  }

  getContainerFormat(): ContainerFormat { return this.containerFormat }
  getAudioCodec(): AudioCodec { return this.audioCodec }

  async encodeFrame(pixels: Uint8ClampedArray, frameIndex: number, keyframeInterval?: number): Promise<void> {
    if (!this.encoder || this.isClosed) throw new Error('Encoder not initialized')
    const timestampMicros = Math.round(frameIndex * (1_000_000 / this.settings.fps))
    const durationMicros = Math.round(1_000_000 / this.settings.fps)
    const frame = new VideoFrame(pixels.buffer as ArrayBuffer, {
      format: 'RGBA',
      codedWidth: this.settings.width,
      codedHeight: this.settings.height,
      timestamp: timestampMicros,
      duration: durationMicros,
    })
    const interval = keyframeInterval ?? this.settings.fps
    this.encoder.encode(frame, { keyFrame: frameIndex % interval === 0 })
    frame.close()
    if (frameIndex % 30 === 0) await new Promise<void>(r => queueMicrotask(r))
  }

  async encodeVideoFrame(frame: VideoFrame, frameIndex: number, keyframeInterval?: number): Promise<void> {
    if (!this.encoder || this.isClosed) throw new Error('Encoder not initialized')
    const interval = keyframeInterval ?? this.settings.fps
    this.encoder.encode(frame, { keyFrame: frameIndex % interval === 0 })
    if (frameIndex % 30 === 0) await new Promise<void>(r => queueMicrotask(r))
  }

  addAudioChunks(audioResult: EncodedAudioResult): void {
    if (!this.muxer || !this.hasAudio) return
    for (let i = 0; i < audioResult.chunks.length; i++) {
      this.muxer.addAudioChunk(audioResult.chunks[i], audioResult.metadata[i])
    }
  }

  async finish(): Promise<Blob> {
    if (!this.encoder || !this.muxer) throw new Error('Encoder not initialized')
    this.isClosed = true
    await this.encoder.flush()
    this.encoder.close()
    await this.muxer.finalize()
    const buffer = this.muxer.getBuffer()
    const mimeType = this.containerFormat === 'webm' ? 'video/webm' : 'video/mp4'
    console.log(`[VideoEncoder] Done: ${this.encodedFrameCount} frames, ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB`)
    return new Blob([buffer], { type: mimeType })
  }

  cancel(): void {
    if (this.encoder && !this.isClosed) {
      this.isClosed = true
      try { this.encoder.close() } catch {}
      if (this.muxer instanceof MediaBunnyMuxerAdapter) this.muxer.cancel()
    }
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
