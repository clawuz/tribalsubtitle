// Adapted from MasterSelects — Logger replaced with console
export class AudioExtractor {
  private audioContext: AudioContext | null = null
  private cache = new Map<string, AudioBuffer>()

  private getContext(): AudioContext {
    if (!this.audioContext) this.audioContext = new AudioContext()
    return this.audioContext
  }

  async extractAudio(file: File, cacheKey?: string): Promise<AudioBuffer> {
    if (cacheKey && this.cache.has(cacheKey)) return this.cache.get(cacheKey)!
    const arrayBuffer = await file.arrayBuffer()
    try {
      const buf = await this.getContext().decodeAudioData(arrayBuffer)
      if (cacheKey) this.cache.set(cacheKey, buf)
      return buf
    } catch (e) {
      if (e instanceof DOMException && e.name === 'EncodingError') {
        console.warn('[AudioExtractor] No audio track, using silence')
        return this.createSilentBuffer(1, 48000)
      }
      throw e
    }
  }

  async extractFromUrl(url: string, cacheKey?: string): Promise<AudioBuffer> {
    if (cacheKey && this.cache.has(cacheKey)) return this.cache.get(cacheKey)!
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    try {
      const buf = await this.getContext().decodeAudioData(arrayBuffer)
      if (cacheKey) this.cache.set(cacheKey, buf)
      return buf
    } catch {
      console.warn('[AudioExtractor] Could not decode audio from URL')
      return this.createSilentBuffer(1, 48000)
    }
  }

  trimBuffer(buffer: AudioBuffer, startTime: number, endTime: number): AudioBuffer {
    const sr = buffer.sampleRate
    const startSample = Math.floor(startTime * sr)
    const endSample = Math.min(Math.ceil(endTime * sr), buffer.length)
    const len = endSample - startSample
    if (len <= 0) return this.createSilentBuffer(0.001, sr)
    const out = this.getContext().createBuffer(buffer.numberOfChannels, len, sr)
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch)
      out.getChannelData(ch).set(src.subarray(startSample, endSample))
    }
    return out
  }

  createSilentBuffer(duration: number, sampleRate: number): AudioBuffer {
    return this.getContext().createBuffer(2, Math.ceil(duration * sampleRate), sampleRate)
  }

  clearCache() { this.cache.clear() }
}
