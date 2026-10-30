import { useEffect, useRef } from 'react'
import { drinks } from '../data'
import framesJson from '../data/frames.json'
import { scrollState, useBar } from '../lib/state'

// Photo-real drinks rendered in Blender, played back as a frame sequence driven by scroll.
// Each drink: frames 1-72 pour, 74-92 garnish drops, 96-168 one full turn (see blender/scripts).

type Manifest = Record<string, { count: number; width: number; height: number }>
const manifest = framesJson as Manifest
const BASE = import.meta.env.BASE_URL
const frameUrl = (id: string, i: number) => `${BASE}frames/${id}/${String(i).padStart(3, '0')}.webp`

// Section scroll progress → frame number (matches applySectionProgress timing).
const KEYS: [number, number][] = [
  [0, 1], [0.04, 1], [0.46, 72], [0.48, 74], [0.56, 92], [0.58, 96], [1, 168],
]
export function frameFor(p: number, count: number) {
  let f = 1
  for (let k = 1; k < KEYS.length; k++) {
    const [p0, f0] = KEYS[k - 1]
    const [p1, f1] = KEYS[k]
    if (p <= p1) {
      f = f0 + ((f1 - f0) * (p - p0)) / Math.max(p1 - p0, 1e-6)
      break
    }
    f = f1
  }
  return Math.min(count, Math.max(1, Math.round((f * count) / 168)))
}

// Loads one drink's frames: a coarse pass first (every 16th), then fills the gaps.
class Sequence {
  imgs: (HTMLImageElement | null)[]
  ready: boolean[]
  started = false
  id: string
  count: number
  constructor(id: string, count: number) {
    this.id = id
    this.count = count
    this.imgs = Array(count + 1).fill(null)
    this.ready = Array(count + 1).fill(false)
  }
  load() {
    if (this.started) return
    this.started = true
    const order: number[] = []
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 1; i <= this.count; i += step) if (!order.includes(i)) order.push(i)
    }
    // A few downloads at a time, in order, so the coarse pass lands first.
    let next = 0
    const pump = () => {
      if (next >= order.length) return
      const i = order[next++]
      const img = new Image()
      img.decoding = 'async'
      img.onload = img.onerror = () => {
        this.ready[i] = img.complete && img.naturalWidth > 0
        pump()
      }
      img.src = frameUrl(this.id, i)
      this.imgs[i] = img
    }
    for (let k = 0; k < 6; k++) pump()
  }
  // Closest frame that has finished loading.
  nearest(i: number) {
    for (let d = 0; d < this.count; d++) {
      if (this.ready[i - d]) return this.imgs[i - d]
      if (this.ready[i + d]) return this.imgs[i + d]
    }
    return null
  }
}

const sequences: Record<string, Sequence> = {}
const sequenceFor = (id: string) => {
  const m = manifest[id]
  if (!m) return null
  return (sequences[id] ??= new Sequence(id, m.count))
}

export function FrameDrinks() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const active = useBar((s) => s.activeDrink)
  const activeId = drinks[active]?.id
  const hasFrames = !!(activeId && manifest[activeId])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf = 0
    let last = ''
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const d = drinks[scrollState.active]
      const seq = d && sequenceFor(d.id)
      if (!seq) return
      seq.load()
      // Warm up the next drink once this one is half way through.
      const nextDrink = drinks[scrollState.active + 1]
      if (nextDrink && scrollState.progress > 0.5) sequenceFor(nextDrink.id)?.load()
      const want = frameFor(scrollState.progress, seq.count)
      const img = seq.nearest(want)
      if (!img) return
      const key = `${d.id}:${img.src}:${c.clientWidth}`
      if (key === last) return
      last = key
      // Match the canvas to its on-screen size (sharp on retina, capped for speed).
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(c.clientWidth * dpr)
      const h = Math.round(c.clientHeight * dpr)
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
      ctx.drawImage(img, 0, 0, w, h)
      c.style.opacity = '1'
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  const placement =
    'absolute left-1/2 top-0 h-[37svh] -translate-x-1/2 md:left-auto md:right-[2vw] md:top-1/2 md:h-[100svh] md:translate-x-0 md:-translate-y-1/2'
  // Soft edges so the render melts into the page.
  const mask = {
    maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 62%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 62%, transparent 100%)',
  }

  return (
    <div className="absolute inset-0 bg-bar-ink">
      <canvas
        ref={canvas}
        aria-hidden
        className={`${placement} aspect-[4/5] opacity-0 transition-opacity duration-700 motion-reduce:duration-0 ${hasFrames ? '' : 'invisible'}`}
        style={mask}
      />
      {/* Drinks not rendered yet: show their still photo. */}
      {!hasFrames && activeId && (
        <img src={`${BASE}stills/${activeId}.webp`} alt="" className={`${placement} aspect-[4/5] object-contain`} style={mask} />
      )}
    </div>
  )
}
