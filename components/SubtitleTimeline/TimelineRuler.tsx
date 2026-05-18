'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useTimelineStore } from '@/lib/stores/timelineStore'

interface Props {
  width: number
}

export function TimelineRuler({ width }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { zoom, scrollX, duration, setCurrentTime, setIsPlaying } = useTimelineStore()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const h = canvas.height / dpr

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1a1f2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Adaptive tick interval
    const minPx = 60
    const rawSec = minPx / zoom
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
    const tickSec = steps.find(s => s * zoom >= minPx) ?? 300

    const startSec = scrollX / zoom
    const endSec = startSec + width / zoom

    ctx.font = `${10 * dpr}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    let t = Math.floor(startSec / tickSec) * tickSec
    while (t <= endSec + tickSec) {
      const x = (t * zoom - scrollX) * dpr
      const isMajor = Math.abs(t % (tickSec * 5)) < 0.001 || tickSec >= 5

      ctx.beginPath()
      ctx.moveTo(x, isMajor ? h * 0.2 * dpr : h * 0.55 * dpr)
      ctx.lineTo(x, h * dpr)
      ctx.strokeStyle = isMajor ? '#4b5563' : '#374151'
      ctx.lineWidth = isMajor ? 1 * dpr : 0.5 * dpr
      ctx.stroke()

      if (isMajor) {
        ctx.fillStyle = '#9ca3af'
        const label = t >= 60
          ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
          : `${t.toFixed(tickSec < 1 ? 1 : 0)}s`
        ctx.fillText(label, x, 2 * dpr)
      }
      t = Math.round((t + tickSec) * 1000) / 1000
    }
  }, [zoom, scrollX, width, duration])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = 28 * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = '28px'
    draw()
  }, [width, draw])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = Math.max(0, Math.min(duration, (x + scrollX) / zoom))
    setIsPlaying(false)
    setCurrentTime(t)
  }, [scrollX, zoom, duration, setCurrentTime, setIsPlaying])

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: 'pointer', display: 'block' }}
      onClick={handleClick}
    />
  )
}
