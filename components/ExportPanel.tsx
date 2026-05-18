'use client'

import { useState, useCallback, useRef } from 'react'
import { useExportStore } from '@/lib/stores/exportStore'
import { SubtitleExporter } from '@/lib/engine/SubtitleExporter'
import type { SubtitleExportOptions, ExportProgressCallback } from '@/lib/engine/SubtitleExporter'
import {
  CONTAINER_FORMATS, getVideoCodecsForContainer, FRAME_RATE_PRESETS,
  BITRATE_RANGE, formatBitrate, getRecommendedBitrate, checkCodecSupport,
} from '@/lib/engine/export/codecHelpers'
import type { ExportProgress } from '@/lib/engine/export/types'

interface ExportPanelProps {
  exportOptions: Omit<SubtitleExportOptions, 'export' | 'filename'>
  projectName?: string
  onClose?: () => void
}

export function ExportPanel({ exportOptions, projectName, onClose }: ExportPanelProps) {
  const { settings, set } = useExportStore()
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const exporterRef = useRef<SubtitleExporter | null>(null)

  const codecOptions = getVideoCodecsForContainer(settings.container)

  const handleContainerChange = useCallback((container: typeof settings.container) => {
    set({ container })
    // Auto-fix codec if incompatible
    const codecs = getVideoCodecsForContainer(container)
    if (!codecs.find(c => c.id === settings.codec)) {
      set({ codec: codecs[0].id })
    }
    set({ bitrate: getRecommendedBitrate(settings.fps === 60 ? 1920 : 1280) })
  }, [settings, set])

  const handleExport = useCallback(async () => {
    if (!exportOptions.backgroundMediaUrl) {
      setError('Arkaplan video seçilmemiş')
      return
    }

    // Check WebCodecs support
    const supported = await checkCodecSupport(settings.codec, 1080, 1920)
    if (!supported) {
      setError(`${settings.codec.toUpperCase()} bu tarayıcıda desteklenmiyor. H.264 deneyin.`)
      return
    }

    setIsExporting(true)
    setError(null)
    setProgress({ phase: 'video', percent: 0 })

    const onProgress: ExportProgressCallback = (p) => setProgress(p)

    exporterRef.current = new SubtitleExporter()
    try {
      await exporterRef.current.export(
        { ...exportOptions, export: { ...settings, width: 0, height: 0 }, filename: projectName || 'subtitle-export' },
        onProgress,
      )
      setProgress({ phase: 'done', percent: 100 })
    } catch (e) {
      if (e instanceof Error && e.message === 'İptal edildi') {
        setProgress(null)
      } else {
        setError(e instanceof Error ? e.message : 'Bilinmeyen hata')
      }
    } finally {
      setIsExporting(false)
      exporterRef.current = null
    }
  }, [exportOptions, settings, projectName])

  const handleCancel = () => {
    exporterRef.current?.cancel()
    setIsExporting(false)
    setProgress(null)
  }

  const phaseLabel = (phase: ExportProgress['phase']) => {
    switch (phase) {
      case 'video':   return 'Video kareler encode ediliyor...'
      case 'audio':   return 'Ses encode ediliyor...'
      case 'muxing':  return 'Dosya oluşturuluyor...'
      case 'done':    return 'Tamamlandı!'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-5 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Export Ayarları</h3>
        {onClose && <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
      </div>

      <div className="space-y-3">
        {/* Container */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Format</label>
          <div className="flex gap-2">
            {CONTAINER_FORMATS.map(c => (
              <button
                key={c.id}
                onClick={() => handleContainerChange(c.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  settings.container === c.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Codec */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Codec</label>
          <select
            value={settings.codec}
            onChange={e => set({ codec: e.target.value as typeof settings.codec })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {codecOptions.map(c => (
              <option key={c.id} value={c.id}>{c.label} — {c.description}</option>
            ))}
          </select>
        </div>

        {/* FPS */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Kare Hızı</label>
          <div className="flex gap-1.5 flex-wrap">
            {FRAME_RATE_PRESETS.map(p => (
              <button
                key={p.fps}
                onClick={() => set({ fps: p.fps })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  settings.fps === p.fps
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bitrate */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Kalite — {formatBitrate(settings.bitrate)}
          </label>
          <input
            type="range"
            min={BITRATE_RANGE.min}
            max={50_000_000}
            step={BITRATE_RANGE.step}
            value={settings.bitrate}
            onChange={e => set({ bitrate: Number(e.target.value) })}
            className="w-full accent-gray-900"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>1 Mbps</span><span>50 Mbps</span>
          </div>
        </div>

        {/* Audio */}
        <div className="flex items-center gap-2">
          <input
            id="includeAudio"
            type="checkbox"
            checked={settings.includeAudio}
            onChange={e => set({ includeAudio: e.target.checked })}
            className="accent-gray-900"
          />
          <label htmlFor="includeAudio" className="text-xs text-gray-700 cursor-pointer">
            Ses dahil et (arkaplan video sesi)
          </label>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-[11px] text-blue-700">
          <strong>Tarayıcıda render</strong> — Sunucu gerekmez.<br />
          İlk export yavaş olabilir. Chrome/Edge gerektirir.
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* Progress */}
        {isExporting && progress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{phaseLabel(progress.phase)}</span>
              <span>%{progress.percent}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-gray-900 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            {progress.currentFrame !== undefined && progress.totalFrames !== undefined && (
              <div className="text-[10px] text-gray-400">
                Kare {progress.currentFrame}/{progress.totalFrames}
                {progress.estimatedSecondsRemaining !== undefined && (
                  <> · ~{Math.ceil(progress.estimatedSecondsRemaining / 60)} dk kaldı</>
                )}
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {progress?.phase === 'done' && !isExporting && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-[11px] text-green-700 font-semibold text-center">
            İndirme başladı!
          </div>
        )}

        {/* Buttons */}
        {isExporting ? (
          <button
            onClick={handleCancel}
            className="w-full bg-red-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-red-700 transition-colors"
          >
            İptal Et
          </button>
        ) : (
          <button
            onClick={handleExport}
            disabled={!exportOptions.backgroundMediaUrl}
            className="w-full bg-gray-900 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            ⬇ Tarayıcıda Export Et
          </button>
        )}
      </div>
    </div>
  )
}
