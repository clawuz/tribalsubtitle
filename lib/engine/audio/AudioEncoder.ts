// Adapted from MasterSelects — Logger replaced with console
export type AudioCodec = 'aac' | 'opus'

export interface AudioEncoderSettings {
  sampleRate: number
  numberOfChannels: number
  bitrate: number
  codec?: AudioCodec
}

export interface EncodedAudioResult {
  chunks: EncodedAudioChunk[]
  metadata: EncodedAudioChunkMetadata[]
  duration: number
  settings: AudioEncoderSettings
  codec: AudioCodec
  codecString: string
}

export type AudioEncoderProgressCallback = (p: { encodedSamples: number; totalSamples: number; percent: number }) => void

export class AudioEncoderWrapper {
  private encoder: AudioEncoder | null = null
  private settings: AudioEncoderSettings
  private chunks: EncodedAudioChunk[] = []
  private metadata: EncodedAudioChunkMetadata[] = []
  private encodedSamples = 0
  private isClosed = false
  private totalSamples = 0
  private activeCodec: AudioCodec = 'aac'
  private activeCodecString = 'mp4a.40.2'

  constructor(settings: AudioEncoderSettings) {
    this.settings = { sampleRate: settings.sampleRate || 48000, numberOfChannels: settings.numberOfChannels || 2, bitrate: settings.bitrate || 256000, codec: settings.codec }
  }

  static async isAACSupported(): Promise<boolean> {
    if (!('AudioEncoder' in window)) return false
    try {
      const s = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 256000 })
      return s.supported === true
    } catch { return false }
  }

  static async isOpusSupported(): Promise<boolean> {
    if (!('AudioEncoder' in window)) return false
    try {
      const s = await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })
      return s.supported === true
    } catch { return false }
  }

  static async detectSupportedCodec(): Promise<{ codec: AudioCodec; codecString: string } | null> {
    if (await AudioEncoderWrapper.isAACSupported()) return { codec: 'aac', codecString: 'mp4a.40.2' }
    if (await AudioEncoderWrapper.isOpusSupported()) return { codec: 'opus', codecString: 'opus' }
    return null
  }

  async init(): Promise<boolean> {
    if (!('AudioEncoder' in window)) return false
    let codecToUse: { codec: AudioCodec; codecString: string } | null = null
    if (this.settings.codec === 'aac' && await AudioEncoderWrapper.isAACSupported()) codecToUse = { codec: 'aac', codecString: 'mp4a.40.2' }
    else if (this.settings.codec === 'opus' && await AudioEncoderWrapper.isOpusSupported()) codecToUse = { codec: 'opus', codecString: 'opus' }
    else codecToUse = await AudioEncoderWrapper.detectSupportedCodec()
    if (!codecToUse) return false
    this.activeCodec = codecToUse.codec
    this.activeCodecString = codecToUse.codecString
    const bitrate = this.activeCodec === 'opus' ? Math.min(this.settings.bitrate, 192000) : this.settings.bitrate
    const config: AudioEncoderConfig = { codec: this.activeCodecString, sampleRate: this.settings.sampleRate, numberOfChannels: this.settings.numberOfChannels, bitrate }
    try {
      const support = await AudioEncoder.isConfigSupported(config)
      if (!support.supported) return false
    } catch { return false }
    this.encoder = new AudioEncoder({
      output: (chunk, meta) => { this.chunks.push(chunk); if (meta) this.metadata.push(meta) },
      error: (e) => console.error('[AudioEncoder] Error:', e),
    })
    try { this.encoder.configure(config); return true } catch { return false }
  }

  async encode(buffer: AudioBuffer, onProgress?: AudioEncoderProgressCallback): Promise<void> {
    if (!this.encoder || this.isClosed) throw new Error('Encoder not initialized')
    this.totalSamples = buffer.length
    this.encodedSamples = 0
    this.chunks = []
    this.metadata = []
    const frameSize = 1024
    const totalFrames = Math.ceil(buffer.length / frameSize)
    for (let fi = 0; fi < totalFrames; fi++) {
      const start = fi * frameSize
      const numSamples = Math.min(frameSize, buffer.length - start)
      const channels = buffer.numberOfChannels
      const frameData = new Float32Array(numSamples * channels)
      for (let ch = 0; ch < channels; ch++) {
        const src = buffer.getChannelData(ch)
        const off = ch * numSamples
        for (let i = 0; i < numSamples; i++) frameData[off + i] = src[start + i] ?? 0
      }
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: buffer.sampleRate,
        numberOfFrames: numSamples,
        numberOfChannels: channels,
        timestamp: Math.round((start / buffer.sampleRate) * 1_000_000),
        data: frameData.buffer as ArrayBuffer,
      })
      this.encoder.encode(audioData)
      audioData.close()
      this.encodedSamples = start + numSamples
      onProgress?.({ encodedSamples: this.encodedSamples, totalSamples: this.totalSamples, percent: Math.round(this.encodedSamples / this.totalSamples * 100) })
      if (fi % 100 === 0) await new Promise(r => setTimeout(r, 0))
    }
  }

  async finalize(): Promise<EncodedAudioResult> {
    if (!this.encoder) throw new Error('Encoder not initialized')
    if (!this.isClosed) { await this.encoder.flush(); this.encoder.close(); this.isClosed = true }
    return { chunks: this.chunks, metadata: this.metadata, duration: this.totalSamples / this.settings.sampleRate, settings: this.settings, codec: this.activeCodec, codecString: this.activeCodecString }
  }

  getActiveCodec() { return { codec: this.activeCodec, codecString: this.activeCodecString } }
  isReady() { return this.encoder !== null && !this.isClosed }
}
