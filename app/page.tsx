'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { SubtitleForm } from '@/components/ParamForm'
import { PLATFORMS, PLATFORM_KEYS, PlatformKey } from '@/remotion/compositions/platforms'
import { HistoryTab } from '@/components/HistoryTab'
import { ExportPanel } from '@/components/ExportPanel'
import { getProject, Project } from '@/lib/projects'


const SubtitleTimeline = dynamic(
  () => import('@/components/SubtitleTimeline').then(m => m.SubtitleTimeline),
  { ssr: false }
)

type Tab = 'editor' | 'history'


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
  const [showExportPanel, setShowExportPanel] = useState(false)

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
    setActiveTab('editor')
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
                onClick={() => setShowExportPanel(v => !v)}
                disabled={!params.backgroundMedia}
                className="w-full bg-gray-900 text-white text-sm font-semibold rounded-lg py-3 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {showExportPanel ? '✕ Kapat' : '⬇ Export Et'}
              </button>
              {!params.backgroundMedia && (
                <p className="mt-2 text-center text-[11px] text-gray-400">Önce arkaplan video ekleyin</p>
              )}
              {showExportPanel && (
                <div className="mt-3">
                  <ExportPanel
                    exportOptions={{
                      backgroundMediaUrl: String(params.backgroundMedia ?? ''),
                      subtitles: (params.subtitles as { startMs: number; endMs: number; text: string }[]) ?? [],
                      durationSeconds: Number(params.durationSeconds ?? 30),
                      platform: String(params.platform ?? '9:16'),
                      render: {
                        subtitleFontSize: Number(params.subtitleFontSize ?? 52),
                        subtitleFontFamily: String(params.subtitleFontFamily ?? 'TKTextVF'),
                        subtitleColor: String(params.subtitleColor ?? '#ffffff'),
                        subtitleBgColor: String(params.subtitleBgColor ?? 'rgba(0,0,0,0.65)'),
                        subtitleBold: Boolean(params.subtitleBold ?? true),
                        subtitleOutline: Boolean(params.subtitleOutline ?? false),
                        subtitleOutlineColor: String(params.subtitleOutlineColor ?? '#000000'),
                        subtitleOutlineWidth: Number(params.subtitleOutlineWidth ?? 3),
                        subtitleX: Number(params.subtitleX ?? 50),
                        subtitleY: Number(params.subtitleY ?? 85),
                      },
                    }}
                    projectName={projectName}
                    onClose={() => setShowExportPanel(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sağ panel — player + timeline */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#080c14' }}>
            <SubtitleTimeline
              videoUrl={String(params.backgroundMedia ?? '')}
              platform={String(params.platform ?? '9:16')}
              subtitles={(params.subtitles as { startMs: number; endMs: number; text: string }[]) ?? []}
              wordSegments={(params.wordSegments as { word: string; startMs: number; endMs: number }[]) ?? []}
              onSubtitlesChange={subs => setParams(prev => ({ ...prev, subtitles: subs }))}
              subtitleStyle={{
                fontSize: Number(params.subtitleFontSize ?? 28),
                fontFamily: String(params.subtitleFontFamily ?? 'sans-serif'),
                color: String(params.subtitleColor ?? '#ffffff'),
                bgColor: String(params.subtitleBgColor ?? 'rgba(0,0,0,0.65)'),
                bold: Boolean(params.subtitleBold ?? true),
                x: Number(params.subtitleX ?? 50),
                y: Number(params.subtitleY ?? 85),
              }}
            />
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
