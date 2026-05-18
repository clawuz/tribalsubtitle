'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { SubtitleForm } from '@/components/ParamForm'
import { PLATFORMS, PLATFORM_KEYS, PlatformKey } from '@/remotion/compositions/platforms'
import { HistoryTab } from '@/components/HistoryTab'
import { saveProject, addRender, getRenders, getProject, Project } from '@/lib/projects'

const SubtitleLivePreview = dynamic(
  () => import('@/components/SubtitleLivePreview').then(m => m.SubtitleLivePreview),
  { ssr: false }
)

type Tab = 'editor' | 'history'

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
  subtitleX: 50,
  subtitleY: 85,
  subtitleFontSize: 52,
  subtitleFontFamily: 'TKTextVF, sans-serif',
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

  const [activeTab, setActiveTab] = useState<Tab>('editor')
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

  const handleEdit = (project: Project) => {
    setProjectName(project.name)
    setParams(project.params)
    setRenderId(null)
    setError(null)
    setActiveTab('editor')
  }

  const handleRender = async () => {
    setLoading(true)
    setError(null)
    setRenderId(null)
    setProgress(0)
    const durationSec = Number(params.durationSeconds ?? 30)
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      // Soft progress: approaches 90% asymptotically over ~3 minutes, never reaches 100
      setProgress(Math.round(90 * (1 - Math.exp(-elapsed / 180000))))
    }, 1000)
    const abortCtrl = new AbortController()
    const fetchTimeout = setTimeout(() => abortCtrl.abort(), 20 * 60 * 1000) // 20 dk
    try {
      // Call Cloud Run directly to bypass Firebase Hosting's 60s proxy timeout
      const renderBase = process.env.NEXT_PUBLIC_RENDER_URL ?? ''
      const res = await fetch(`${renderBase}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortCtrl.signal,
      })
      clearTimeout(fetchTimeout)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Sunucu hatası (${res.status}) — loglara bakın`)
      }
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
      clearTimeout(fetchTimeout)
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError(msg.includes('abort') || msg.includes('AbortError')
        ? 'Render 20 dakikada tamamlanamadı. Lütfen video süresini kısaltın veya tekrar deneyin.'
        : msg)
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'editor', label: 'Editör' },
    { key: 'history', label: 'Geçmiş' },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-5 flex items-center h-12 shrink-0 gap-6">
        <span className="text-sm font-black tracking-tight text-gray-900">🎬 Tribal Subtitle</span>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === t.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Editör tab */}
      {activeTab === 'editor' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sol panel — form */}
          <div className="w-[48%] border-r border-gray-100 overflow-y-auto" style={{ background: '#f8fafc' }}>
            <div className="p-5 pb-0">
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Proje Adı</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Projeye bir isim ver..."
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1">Platform</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={String(params.platform ?? '9:16')}
                  onChange={e => setParams(prev => ({ ...prev, platform: e.target.value }))}
                >
                  {PLATFORM_KEYS.map(k => (
                    <option key={k} value={k}>{PLATFORMS[k].label}</option>
                  ))}
                </select>
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
                    <span>Render ediliyor — bu birkaç dakika sürebilir</span>
                    <span>%{progress}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gray-800 h-1.5 rounded-full transition-all duration-1000"
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
      )}

      {/* Geçmiş tab */}
      {activeTab === 'history' && (
        <div className="flex flex-1 overflow-hidden">
          <HistoryTab onEdit={handleEdit} />
        </div>
      )}
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
