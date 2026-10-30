import Lenis from 'lenis'
import { create } from 'zustand'
import { forceFallback, reducedMotion } from './motion'

// Written by GSAP ScrollTriggers, read every frame by the 3D scene.
// A plain object (not React state) so scrolling never causes re-renders.
export const scrollState = {
  active: 0, // which drink is on stage
  fill: reducedMotion ? 1 : 0, // 0..1 how full the active glass is (the pour)
  garnish: reducedMotion ? 1 : 0, // 0..1 garnish dropping onto the rim after the pour
  spin: 0, // 0..1 one full turn after the drink is built
  rise: reducedMotion ? 1 : 0, // hero glass rise-in, 0..1
  progress: 0, // 0..1 raw scroll progress through the active drink's section (drives the frames)
}

// Section scroll progress (0..1) → pour, then garnish, then spin.
// With reduced motion every drink is simply shown finished and still.
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export function applySectionProgress(p: number) {
  scrollState.progress = p
  if (reducedMotion) return
  scrollState.fill = clamp01((p - 0.04) / 0.42)
  scrollState.garnish = clamp01((p - 0.48) / 0.08)
  scrollState.spin = clamp01((p - 0.58) / 0.42)
}

let lenis: Lenis | null = null
export const setLenis = (l: Lenis | null) => (lenis = l)
export const getLenis = () => lenis

type BarState = {
  openBottle: string | null
  setOpenBottle: (id: string | null) => void
  activeDrink: number // mirrors scrollState.active, for the still-image fallback
  setActiveDrink: (i: number) => void
  stills: boolean // true = show pre-rendered images instead of live 3D
  useStills: () => void
}

export const useBar = create<BarState>((set) => ({
  openBottle: null,
  setOpenBottle: (id) => set({ openBottle: id }),
  activeDrink: 0,
  setActiveDrink: (i) => set({ activeDrink: i }),
  // Rendered frames play on a plain 2D canvas (no 3D needed), so stills are only for
  // visitors who asked for less motion, or for testing with ?fallback.
  stills: forceFallback || reducedMotion,
  useStills: () => set({ stills: true }),
}))
