'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { SubtitleForm } from '@/components/ParamForm'
import { saveProject, addRender, getRenders, getProject } from '@/lib/projects'
import { PLATFORM_KEYS, PlatformKey } from '@/remotion/compositions/platforms'

const SubtitleLivePreview = dynamic(
  () => import('@/components/SubtitleLivePreview').then(m => m.SubtitleLivePreview),
  { ssr: false }
)

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
  subtitleFontFamily: 'TKTextVF',
  subtitleColor: '#ffffff',
  subtitleBgColor: 'rgba(0,0,0,0.65)',
  subtitleBold: true,
  subtitleOutline: false,
  subtitleOutlineColor: '#000000',
  subtitleOutlineWidth: 3,
  showLowerThird: false,
  lowerThirdText: '',
  lowerThirdColor: '#10b981',
  logoUrl: '',
  accentColor: '#10b981',
  backgroundColor: '#000000',
  durationSeconds: 30,
}

function SubtitlePage() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [projectName, setProjectName] = useState('')
  const [params, setParams] = useState<Record<string, unknown>>(DEFAULT_PARAMS)
  const [renderId, setRenderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!editId) return
    getProject(editId).then(p => {
      setProjectName(p.name)
      setParams(p.params)
    }).catch(() => {})
  }, [editId])

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
      try {
        const platform = toPlatformKey(params.platform)
        const projectId = await saveProject(projectName || 'İsimsiz', 'Subtitle', platform, params)
        const renders = await getRenders(projectId)
        await addRender(projectId, data.id, platform, durationSec, renders.length + 1)
      } catch {}
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
        <span className="text-sm font-black tracking-tight text-gray-900">🎬 Tribal Subtitle</span>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol panel — form */}
        <div className="w-[48%] border-r border-gray-100 overflow-y-auto" style={{ background: '#f8fafc' }}>
          <div className="p-5 pb-0">
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Proje Adı</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Projeye bir isim ver..."
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>
            <SubtitleForm
              values={params}
              update={(k, v) => setParams(prev => ({ ...prev, [k]: v }))}
            />
          </div>
          <div className="p-5 pt-3 sticky bottom-0" style={{ background: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleRender}
              disabled={loading || !projectName.trim()}
              className="w-full bg-gray-900 text-white text-sm font-semibold rounded-lg py-3 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Render ediliyor...' : '▶ Video Oluştur'}
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
            {renderId && !loading && (
              <a
                href={`/api/download/${renderId}`}
                download
                className="block w-full text-center mt-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-emerald-700 transition-colors"
              >
                ⬇ İndir
              </a>
            )}
          </div>
        </div>

        {/* Sağ panel — live preview */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#080c14' }}>
          <SubtitleLivePreview values={params} />
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
