'use client'

import { useState, Suspense } from 'react'
import { SubtitleForm } from '@/components/ParamForm'
import { VideoPreview } from '@/components/VideoPreview'
import { PLATFORM_KEYS, PlatformKey } from '@/remotion/compositions/platforms'

function toPlatformKey(v: unknown): PlatformKey {
  return (PLATFORM_KEYS as readonly string[]).includes(v as string) ? (v as PlatformKey) : '9:16'
}

const DEFAULT_PARAMS: Record<string, unknown> = {
  platform: '9:16',
  backgroundMedia: '',
  subtitles: [
    { startMs: 0, endMs: 3000, text: 'Merhaba!' },
    { startMs: 3000, endMs: 6000, text: 'Bu bir örnek altyazı.' },
  ],
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
}

function SubtitlePage() {
  const [params, setParams] = useState<Record<string, unknown>>(DEFAULT_PARAMS)
  const [renderId, setRenderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleRender = async () => {
    setLoading(true)
    setError(null)
    setRenderId(null)
    setProgress(0)

    const durationSec = Number(params.durationSeconds ?? 30)
    const estimatedMs = durationSec * 3000
    const startTime = Date.now()
    const timer = setInterval(() => {
      setProgress(Math.round(Math.min(((Date.now() - startTime) / estimatedMs) * 95, 95)))
    }, 500)

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Render hatası')
      clearInterval(timer)
      setProgress(100)
      setRenderId(data.id)
    } catch (err) {
      clearInterval(timer)
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-5 flex items-center h-12 shrink-0">
        <span className="text-sm font-black tracking-tight text-gray-900">
          🎬 Tribal Subtitle
        </span>
      </nav>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[52%] p-5 border-r border-gray-100 overflow-y-auto">
          <SubtitleForm
            values={params}
            update={(k, v) => setParams(prev => ({ ...prev, [k]: v }))}
          />
          <button
            onClick={handleRender}
            disabled={loading}
            className="w-full mt-4 bg-gray-900 text-white text-sm font-semibold rounded-lg py-3 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Render ediliyor...' : 'Video Oluştur'}
          </button>
          {loading && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Render ediliyor...</span>
                <span>%{progress}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-gray-800 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {error && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <VideoPreview
            renderId={renderId}
            loading={loading}
            accentColor={String(params.accentColor ?? '#10b981')}
            platform={toPlatformKey(params.platform)}
          />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <SubtitlePage />
    </Suspense>
  )
}
