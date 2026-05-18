'use client'

import { useEffect, useState } from 'react'
import { listProjects, getRenders, Project, Render } from '@/lib/projects'

const TEMPLATE_LABELS: Record<string, string> = {
  ProductAd: 'Ürün Reklamı',
  Stats: 'İstatistik',
  Subtitle: 'Altyazı',
}

const PLATFORM_LABELS: Record<string, string> = {
  '9:16': '9:16',
  '16:9': '16:9',
  '1:1': '1:1',
  '4:5': '4:5',
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

interface HistoryTabProps {
  onEdit: (project: Project) => void
}

export function HistoryTab({ onEdit }: HistoryTabProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renders, setRenders] = useState<Render[]>([])
  const [rendersLoading, setRendersLoading] = useState(false)
  const [rendersError, setRendersError] = useState<string | null>(null)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (project: Project) => {
    if (selectedId === project.id) {
      setSelectedId(null)
      setRenders([])
      return
    }
    setSelectedId(project.id)
    setRendersLoading(true)
    setRendersError(null)
    try {
      setRenders(await getRenders(project.id))
    } catch (err: unknown) {
      setRendersError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRendersLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Yükleniyor...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
        Hata: {error}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Henüz kaydedilmiş proje yok. Bir video render et ve proje adı ver.
      </div>
    )
  }

  const selectedProject = projects.find(p => p.id === selectedId)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Project list */}
      <div className="w-80 border-r border-gray-100 overflow-y-auto p-4 space-y-2">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Projeler ({projects.length})
        </div>
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => handleSelect(project)}
            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
              selectedId === project.id
                ? 'border-gray-800 bg-gray-900 text-white'
                : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
          >
            <div className={`text-sm font-bold truncate ${selectedId === project.id ? 'text-white' : 'text-gray-800'}`}>
              {project.name}
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                selectedId === project.id ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
              }`}>
                {TEMPLATE_LABELS[project.templateId] ?? project.templateId}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                selectedId === project.id ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
              }`}>
                {PLATFORM_LABELS[project.platform] ?? project.platform}
              </span>
            </div>
            <div className="text-[10px] mt-1.5 text-gray-400">
              {formatDate(project.updatedAt)}
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedProject ? (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Detayları görmek için sol taraftan bir proje seç
          </div>
        ) : (
          <div className="max-w-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedProject.name}</h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {TEMPLATE_LABELS[selectedProject.templateId] ?? selectedProject.templateId}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {PLATFORM_LABELS[selectedProject.platform] ?? selectedProject.platform}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Son güncelleme: {formatDate(selectedProject.updatedAt)}
                </p>
              </div>
              <button
                onClick={() => onEdit(selectedProject)}
                className="bg-gray-900 text-white text-xs px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors"
              >
                ✏ Düzenle
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Render Geçmişi
              </div>
              {rendersLoading ? (
                <div className="text-sm text-gray-400">Yükleniyor...</div>
              ) : rendersError ? (
                <div className="text-sm text-red-500">Hata: {rendersError}</div>
              ) : renders.length === 0 ? (
                <div className="text-sm text-gray-400">Henüz render yok.</div>
              ) : (
                <div className="space-y-2">
                  {renders.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-gray-700">v{r.version}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {PLATFORM_LABELS[r.platform] ?? r.platform} · {r.durationSeconds}sn
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(r.createdAt)}
                        </div>
                      </div>
                      <a
                        href={`/api/download/${r.renderId}`}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium underline"
                        download
                      >
                        İndir
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
