'use client'

import { useCallback, useRef } from 'react'
import { useTimelineStore } from '@/lib/stores/timelineStore'

export interface SubtitleEntry {
  startMs: number
  endMs: number
  text: string
}

interface Props {
  subtitle: SubtitleEntry
  index: number
  trackTop: number
  trackHeight: number
  onUpdate: (index: number, patch: Partial<SubtitleEntry>) => void
}

const HANDLE_W = 6
const MIN_DUR_MS = 200

export function SubtitleClip({ subtitle, index, trackTop, trackHeight, onUpdate }: Props) {
  const { zoom, scrollX, duration, selectedId, setSelectedId, setCurrentTime, setIsPlaying } = useTimelineStore()

  const startSec = subtitle.startMs / 1000
  const endSec = subtitle.endMs / 1000
  const left = startSec * zoom - scrollX
  const width = Math.max(4, (endSec - startSec) * zoom)

  const dragRef = useRef<{ type: 'move' | 'trim-left' | 'trim-right'; startX: number; origStart: number; origEnd: number } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedId(index)
    dragRef.current = { type, startX: e.clientX, origStart: subtitle.startMs, origEnd: subtitle.endMs }

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current!
      const deltaMs = ((ev.clientX - d.startX) / zoom) * 1000
      const durMs = duration * 1000

      if (d.type === 'move') {
        const newStart = Math.max(0, Math.min(durMs - (d.origEnd - d.origStart), d.origStart + deltaMs))
        onUpdate(index, {
          startMs: Math.round(newStart),
          endMs: Math.round(newStart + (d.origEnd - d.origStart)),
        })
      } else if (d.type === 'trim-left') {
        const newStart = Math.max(0, Math.min(d.origEnd - MIN_DUR_MS, d.origStart + deltaMs))
        onUpdate(index, { startMs: Math.round(newStart) })
      } else {
        const newEnd = Math.max(d.origStart + MIN_DUR_MS, Math.min(durMs, d.origEnd + deltaMs))
        onUpdate(index, { endMs: Math.round(newEnd) })
      }
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [subtitle, index, zoom, duration, onUpdate, setSelectedId])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedId(index)
    setIsPlaying(false)
    setCurrentTime(subtitle.startMs / 1000)
  }, [index, subtitle.startMs, setSelectedId, setCurrentTime, setIsPlaying])

  const isSelected = selectedId === index
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
  ]
  const color = colors[index % colors.length]

  return (
    <div
      className={`absolute rounded select-none group ${color} ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : 'opacity-80 hover:opacity-100'}`}
      style={{
        left: `${left}px`,
        top: `${trackTop + 4}px`,
        width: `${width}px`,
        height: `${trackHeight - 8}px`,
        cursor: 'grab',
        transition: 'opacity 0.1s',
      }}
      onClick={handleClick}
      onMouseDown={e => onMouseDown(e, 'move')}
    >
      {/* Left trim handle */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-white/30 hover:bg-white/50 rounded-l cursor-ew-resize"
        style={{ width: `${HANDLE_W}px` }}
        onMouseDown={e => onMouseDown(e, 'trim-left')}
      />

      {/* Label */}
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden pointer-events-none">
        <span className="text-white text-[10px] font-semibold truncate leading-tight"
          style={{ paddingLeft: `${HANDLE_W}px`, paddingRight: `${HANDLE_W}px` }}>
          {subtitle.text}
        </span>
      </div>

      {/* Right trim handle */}
      <div
        className="absolute right-0 top-0 bottom-0 bg-white/30 hover:bg-white/50 rounded-r cursor-ew-resize"
        style={{ width: `${HANDLE_W}px` }}
        onMouseDown={e => onMouseDown(e, 'trim-right')}
      />
    </div>
  )
}
