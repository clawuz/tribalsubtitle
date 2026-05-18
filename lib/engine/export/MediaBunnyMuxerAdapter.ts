// Adapted from MasterSelects — Logger replaced with console
import {
  Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget,
  EncodedVideoPacketSource, EncodedAudioPacketSource, EncodedPacket,
  type VideoCodec as MBVideoCodec, type AudioCodec as MBAudioCodec,
} from 'mediabunny'
import type { VideoCodec, ContainerFormat } from './types'
import type { AudioCodec } from '../audio/AudioEncoder'

export function toMediaBunnyVideoCodec(codec: VideoCodec): MBVideoCodec {
  switch (codec) {
    case 'h264': return 'avc'
    case 'h265': return 'hevc'
    case 'vp9':  return 'vp9'
    case 'av1':  return 'av1'
    default:     return 'avc'
  }
}

export function toMediaBunnyAudioCodec(codec: AudioCodec): MBAudioCodec {
  switch (codec) {
    case 'aac':  return 'aac'
    case 'opus': return 'opus'
    default:     return 'aac'
  }
}

export interface MuxerAdapter {
  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void | Promise<void>
  addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): void | Promise<void>
  finalize(): Promise<void>
  getBuffer(): ArrayBuffer
}

interface QueuedVideoPacket { kind: 'video'; packet: EncodedPacket; meta?: EncodedVideoChunkMetadata }
interface QueuedAudioPacket { kind: 'audio'; packet: EncodedPacket; meta?: EncodedAudioChunkMetadata }
type QueuedEntry = QueuedVideoPacket | QueuedAudioPacket

export interface MediaBunnyMuxerAdapterOptions {
  container: ContainerFormat
  videoCodec: VideoCodec
  fps: number
  hasAudio: boolean
  audioCodec: AudioCodec
}

export class MediaBunnyMuxerAdapter implements MuxerAdapter {
  private output: Output<Mp4OutputFormat | WebMOutputFormat, BufferTarget>
  private videoSource: EncodedVideoPacketSource
  private audioSource: EncodedAudioPacketSource | null = null
  private target: BufferTarget
  private queue: QueuedEntry[] = []
  private nextVideoSequenceNumber = 0
  private nextAudioSequenceNumber = 0
  private started = false
  private cancelled = false

  constructor(options: MediaBunnyMuxerAdapterOptions) {
    this.target = new BufferTarget()
    const format = options.container === 'webm'
      ? new WebMOutputFormat()
      : new Mp4OutputFormat({ fastStart: 'in-memory' })
    this.output = new Output({ format, target: this.target })
    this.videoSource = new EncodedVideoPacketSource(toMediaBunnyVideoCodec(options.videoCodec))
    this.output.addVideoTrack(this.videoSource, { frameRate: options.fps })
    if (options.hasAudio) {
      this.audioSource = new EncodedAudioPacketSource(toMediaBunnyAudioCodec(options.audioCodec))
      this.output.addAudioTrack(this.audioSource)
    }
  }

  private async ensureStarted(): Promise<void> {
    if (!this.started) { await this.output.start(); this.started = true }
  }

  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void {
    const packet = EncodedPacket.fromEncodedChunk(chunk).clone({ sequenceNumber: this.nextVideoSequenceNumber++ })
    this.queue.push({ kind: 'video', packet, meta })
  }

  addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): void {
    const packet = EncodedPacket.fromEncodedChunk(chunk).clone({ sequenceNumber: this.nextAudioSequenceNumber++ })
    this.queue.push({ kind: 'audio', packet, meta })
  }

  cancel(): void { this.cancelled = true }

  async finalize(): Promise<void> {
    await this.ensureStarted()
    for (const entry of this.queue) {
      if (this.cancelled) break
      if (entry.kind === 'video') await this.videoSource.add(entry.packet, entry.meta)
      else if (this.audioSource) await this.audioSource.add(entry.packet, entry.meta)
    }
    this.queue.length = 0
    this.videoSource.close()
    this.audioSource?.close()
    await this.output.finalize()
  }

  getBuffer(): ArrayBuffer {
    const buf = this.target.buffer
    if (!buf) throw new Error('Buffer not available — was finalize() called?')
    return buf
  }
}
