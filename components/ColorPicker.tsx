'use client'
import { useState } from 'react'

const PALETTES = {
  Temel:  ['#e67e22','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#ffffff','#e5e5e5','#6b7280','#1f2937','#000000'],
  Pastel: ['#fde68a','#fca5a5','#86efac','#93c5fd','#c4b5fd','#f9a8d4','#a5f3fc','#d9f99d','#fed7aa','#e9d5ff','#bfdbfe','#bbf7d0'],
  Neon:   ['#ff0090','#00ff88','#00cfff','#ff6600','#aaff00','#ff00ff','#ffff00','#00ffff','#ff3300','#9900ff','#33ff00','#ff9900'],
  Koyu:   ['#1a1a2e','#0f172a','#1e293b','#111827','#18181b','#1c1917','#14532d','#1e3a5f','#3b0764','#7f1d1d','#1a1a1a','#0a0a0a'],
} as const

type PaletteKey = keyof typeof PALETTES
const OPACITY_PRESETS = [25, 50, 75, 100]

interface ColorPickerProps {
  value: string        // hex or '' for none
  opacity: number      // 0-100
  onChange: (val: { color: string; opacity: number }) => void
  showOpacity?: boolean
}

export function ColorPicker({ value, opacity, onChange, showOpacity = true }: ColorPickerProps) {
  const [tab, setTab] = useState<PaletteKey>('Temel')
  const [hexInput, setHexInput] = useState(value)

  const setColor = (color: string) => {
    setHexInput(color)
    onChange({ color, opacity })
  }
  const setOpacity = (op: number) => onChange({ color: value, opacity: op })

  const handleHexBlur = () => {
    const clean = hexInput.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) setColor(clean)
    else setHexInput(value) // revert invalid
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1">
        {(Object.keys(PALETTES) as PaletteKey[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
              tab === t
                ? 'bg-indigo-900/60 text-indigo-300 border-indigo-500'
                : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Swatch grid */}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
        {/* None swatch */}
        <button
          title="Renk yok"
          onClick={() => onChange({ color: '', opacity })}
          className={`w-5 h-5 rounded border-2 border-dashed transition-all ${
            value === '' ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-gray-300'
          }`}
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #ccc, #ccc 1px, #fff 1px, #fff 4px)',
          }}
        />
        {PALETTES[tab].map(color => (
          <button
            key={color}
            title={color}
            onClick={() => setColor(color)}
            className={`w-5 h-5 rounded transition-all hover:scale-110 border ${
              value === color ? 'ring-1 ring-indigo-400 border-white' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Custom hex + native picker */}
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value || '#e67e22'}
          onChange={e => setColor(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border border-gray-200"
        />
        <input
          value={hexInput}
          onChange={e => setHexInput(e.target.value)}
          onBlur={handleHexBlur}
          placeholder="#RRGGBB"
          className="w-24 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[11px] font-mono text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Opacity */}
      {showOpacity && <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Opaklık</span>
          <span className="text-[10px] font-mono font-bold text-indigo-600">{opacity}%</span>
        </div>
        <input
          type="range"
          min={0} max={100} value={opacity}
          onChange={e => setOpacity(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-gray-200"
        />
        <div className="flex gap-1 mt-1.5">
          {OPACITY_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setOpacity(p)}
              className={`flex-1 text-[10px] py-0.5 rounded border transition-colors ${
                opacity === p
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>}
    </div>
  )
}

/** Helper: convert color+opacity to CSS rgba string */
export function colorToCss(color: string, opacity: number): string {
  if (!color) return 'transparent'
  if (opacity === 100) return color
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
}
