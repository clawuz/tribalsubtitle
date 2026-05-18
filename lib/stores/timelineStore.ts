import { create } from 'zustand'

interface TimelineStore {
  currentTime: number      // seconds
  isPlaying: boolean
  duration: number         // seconds
  zoom: number             // pixels per second
  scrollX: number          // scroll offset in pixels
  selectedId: number | null  // index of selected subtitle

  setCurrentTime: (t: number) => void
  setIsPlaying: (v: boolean) => void
  setDuration: (d: number) => void
  setZoom: (z: number) => void
  setScrollX: (x: number) => void
  setSelectedId: (id: number | null) => void
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  currentTime: 0,
  isPlaying: false,
  duration: 30,
  zoom: 80,
  scrollX: 0,
  selectedId: null,

  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setDuration: (d) => set({ duration: d }),
  setZoom: (z) => set({ zoom: Math.max(20, Math.min(400, z)) }),
  setScrollX: (x) => set({ scrollX: Math.max(0, x) }),
  setSelectedId: (id) => set({ selectedId: id }),
}))
