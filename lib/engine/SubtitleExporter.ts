'use client'

import { VideoEncoderWrapper, downloadBlob } from './export/VideoEncoderWrapper'
import { AudioExtractor } from './audio/AudioExtractor'
import { AudioEncoderWrapper } from './audio/AudioEncoder'
import type { ExportSettings, ExportProgress } from './export/types'

export interface SubtitleEntry { startMs: number; endMs: number; text: string }

export interface SubtitleRenderSettings {
  subtitleFontSize: number
  subtitleFontFamily: string
  subtitleColor: string
  subtitleBgColor: string
  subtitleBold: boolean
  subtitleOutline: boolean
  subtitleOutlineColor: string
  subtitleOutlineWidth: number
  subtitleX: number   // 0-100 (percentage)
  subtitleY: number   // 0-100 (percentage)
}

export interface SubtitleExportOptions {
  backgroundMediaUrl: string   // URL to the background video
  subtitles: SubtitleEntry[]
  durationSeconds: number
  platform: string             // '9:16' | '16:9' | '1:1' | '4:5'
  render: SubtitleRenderSettings
  export: ExportSettings
  filename?: string
}

// Platform → output dimensions
const PLATFORM_DIMS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1':  { width: 1080, height: 1080 },
  '4:5':  { width: 1080, height: 1350 },
}

export type ExportProgressCallback = (p: ExportProgress) => void

export class SubtitleExporter {
  private cancelled = false
  private encoder: VideoEncoderWrapper | null = null

  cancel() {
    this.cancelled = true
    this.encoder?.cancel()
  }

  async export(
    options: SubtitleExportOptions,
    onProgress: ExportProgressCallback,
  ): Promise<void> {
    this.cancelled = false

    const dims = PLATFORM_DIMS[options.platform] ?? { width: 1080, height: 1920 }
    const settings: ExportSettings = {
      ...options.export,
      width: dims.width,
      height: dims.height,
    }

    // ── 1. Load background video ──────────────────────────────────────────
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'auto'
    video.src = options.backgroundMediaUrl
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res()
      video.onerror = () => rej(new Error('Video yüklenemedi'))
      video.load()
    })

    // ── 2. Create OffscreenCanvas ─────────────────────────────────────────
    const canvas = new OffscreenCanvas(settings.width, settings.height)
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    if (!ctx) throw new Error('OffscreenCanvas 2D context alınamadı')

    // ── 3. Init video encoder ─────────────────────────────────────────────
    this.encoder = new VideoEncoderWrapper(settings)
    const ok = await this.encoder.init()
    if (!ok) throw new Error('Video encoder başlatılamadı — tarayıcı WebCodecs desteklemiyor')

    // ── 4. Encode frames ──────────────────────────────────────────────────
    const totalFrames = Math.floor(options.durationSeconds * settings.fps)
    const startMs = performance.now()

    for (let fi = 0; fi < totalFrames; fi++) {
      if (this.cancelled) throw new Error('İptal edildi')

      const timeSec = fi / settings.fps
      const timeMs = timeSec * 1000

      // Seek video
      await this.seekVideo(video, timeSec)

      // Draw frame
      this.drawFrame(ctx, video, canvas.width, canvas.height, options.subtitles, timeMs, options.render)

      // Encode
      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round(fi * 1_000_000 / settings.fps),
        duration: Math.round(1_000_000 / settings.fps),
      })
      await this.encoder.encodeVideoFrame(videoFrame, fi)
      videoFrame.close()

      // Progress
      const elapsed = (performance.now() - startMs) / 1000
      const fps = fi / Math.max(elapsed, 0.001)
      const remaining = fps > 0 ? (totalFrames - fi) / fps : undefined
      onProgress({
        phase: 'video',
        percent: Math.round((fi / totalFrames) * 80),
        currentFrame: fi,
        totalFrames,
        estimatedSecondsRemaining: remaining ? Math.round(remaining) : undefined,
      })
    }

    // ── 5. Audio ──────────────────────────────────────────────────────────
    onProgress({ phase: 'audio', percent: 80 })

    if (settings.includeAudio && options.backgroundMediaUrl) {
      try {
        const extractor = new AudioExtractor()
        let audioBuffer = await extractor.extractFromUrl(options.backgroundMediaUrl)
        // Trim to duration
        if (audioBuffer.duration > options.durationSeconds) {
          audioBuffer = extractor.trimBuffer(audioBuffer, 0, options.durationSeconds)
        }

        const audioEncoder = new AudioEncoderWrapper({
          sampleRate: settings.audioSampleRate || 48000,
          numberOfChannels: Math.min(audioBuffer.numberOfChannels, 2),
          bitrate: settings.audioBitrate || 192000,
          codec: this.encoder.getAudioCodec(),
        })
        const audioOk = await audioEncoder.init()
        if (audioOk) {
          await audioEncoder.encode(audioBuffer, ({ percent }) =>
            onProgress({ phase: 'audio', percent: 80 + Math.round(percent * 0.1) })
          )
          const audioResult = await audioEncoder.finalize()
          this.encoder.addAudioChunks(audioResult)
        }
      } catch (e) {
        console.warn('[SubtitleExporter] Audio extraction failed, exporting video-only:', e)
      }
    }

    // ── 6. Mux & download ─────────────────────────────────────────────────
    onProgress({ phase: 'muxing', percent: 92 })
    const blob = await this.encoder.finish()
    onProgress({ phase: 'done', percent: 100 })

    const ext = settings.container === 'webm' ? 'webm' : 'mp4'
    const filename = options.filename ? `${options.filename}.${ext}` : `subtitle-export.${ext}`
    downloadBlob(blob, filename)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (Math.abs(video.currentTime - timeSec) < 0.001) { resolve(); return }
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve() }
      video.addEventListener('seeked', onSeeked)
      video.currentTime = timeSec
    })
  }

  private drawFrame(
    ctx: OffscreenCanvasRenderingContext2D,
    video: HTMLVideoElement,
    w: number,
    h: number,
    subtitles: SubtitleEntry[],
    timeMs: number,
    r: SubtitleRenderSettings,
  ): void {
    // Draw video (cover fit)
    const vw = video.videoWidth || w
    const vh = video.videoHeight || h
    const scale = Math.max(w / vw, h / vh)
    const sw = vw * scale
    const sh = vh * scale
    const ox = (w - sw) / 2
    const oy = (h - sh) / 2
    ctx.drawImage(video, ox, oy, sw, sh)

    // Active subtitle
    const sub = subtitles.find(s => timeMs >= s.startMs && timeMs < s.endMs)
    if (!sub) return

    const fontSize = r.subtitleFontSize
    const fontWeight = r.subtitleBold ? 'bold' : 'normal'
    ctx.font = `${fontWeight} ${fontSize}px "${r.subtitleFontFamily}", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = this.wrapText(ctx, sub.text, w * 0.85)
    const lineH = fontSize * 1.35
    const totalH = lines.length * lineH
    const cx = w * (r.subtitleX / 100)
    const cy = h * (r.subtitleY / 100) - totalH / 2

    lines.forEach((line, i) => {
      const lx = cx
      const ly = cy + i * lineH + lineH / 2
      const metrics = ctx.measureText(line)
      const tw = metrics.width
      const pad = fontSize * 0.4

      // Background box
      if (r.subtitleBgColor && r.subtitleBgColor !== 'transparent') {
        ctx.fillStyle = r.subtitleBgColor
        ctx.beginPath()
        const rx = lx - tw / 2 - pad
        const ry = ly - lineH / 2
        const rw = tw + pad * 2
        const rh = lineH
        const cr = fontSize * 0.15
        ctx.moveTo(rx + cr, ry)
        ctx.lineTo(rx + rw - cr, ry)
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + cr)
        ctx.lineTo(rx + rw, ry + rh - cr)
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - cr, ry + rh)
        ctx.lineTo(rx + cr, ry + rh)
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - cr)
        ctx.lineTo(rx, ry + cr)
        ctx.quadraticCurveTo(rx, ry, rx + cr, ry)
        ctx.closePath()
        ctx.fill()
      }

      // Outline
      if (r.subtitleOutline && r.subtitleOutlineWidth > 0) {
        ctx.strokeStyle = r.subtitleOutlineColor
        ctx.lineWidth = r.subtitleOutlineWidth * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(line, lx, ly)
      }

      // Text
      ctx.fillStyle = r.subtitleColor
      ctx.fillText(line, lx, ly)
    })
  }

  private wrapText(ctx: OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines.length > 0 ? lines : [text]
  }
}
