import { Vector2 } from 'three'
import type { GlassType } from '../data'

// Side profiles, spun on a lathe into 3D. All glasses are centered on y = 0.
export type Ice = { x: number; z: number; size: number; rot: [number, number, number]; stack: number }

export type GlassSpec = {
  shell: Vector2[] // closed outline of the glass wall (solid, so refraction looks right)
  liquidAt: (fill: number) => Vector2[] | null // drink outline at a fill level 0..1
  levelAt: (fill: number) => { y: number; r: number } // liquid surface height and radius
  drops: Vector2[] | null // outer band where condensation shows
  floorY: number // inside bottom of the glass
  bottomY: number // outside bottom (sits on the bar)
  rimY: number
  rimR: number
  garnish: [number, number, number]
  ice: Ice[]
  scale: number
}

const v = (pts: number[][]) => pts.map(([x, y]) => new Vector2(x, y))

// Straight-sided tumbler (rocks, highball): tapered walls and a thick base.
function tumbler(h: number, rBot: number, rTop: number, wall: number, base: number, fullFill: number) {
  const y0 = -h / 2
  const y1 = h / 2
  const r = (y: number) => rBot + ((y - y0) / h) * (rTop - rBot)
  const yb = y0 + base
  const yFull = yb + (y1 - yb) * fullFill
  const levelAt = (f: number) => {
    const y = yb + (yFull - yb) * f
    return { y, r: r(y) - wall - 0.006 }
  }
  return {
    shell: v([
      [0, y0], [rBot - 0.04, y0], [rBot, y0 + 0.04], [rTop, y1 - 0.02], [rTop - wall / 2, y1],
      [rTop - wall, y1 - 0.02], [r(yb) - wall, yb + 0.03], [r(yb) - wall - 0.04, yb], [0, yb],
    ]),
    liquidAt: (f: number) => {
      if (f < 0.01) return null
      const top = levelAt(f)
      return v([[0, yb + 0.004], [r(yb) - wall - 0.04, yb + 0.004], [top.r, top.y], [0, top.y]])
    },
    levelAt,
    drops: v([[r(y0 + 0.08) + 0.006, y0 + 0.08], [r(yFull) + 0.006, yFull]]),
    floorY: yb,
    bottomY: y0,
    rimY: y1,
    rimR: rTop - wall / 2,
    garnish: [rTop - 0.02, y1, 0] as [number, number, number],
  }
}

function coupe() {
  // Foot, stem, then a shallow bowl traced as a quarter ellipse.
  const outer: number[][] = [[0, -1.3], [0.7, -1.3], [0.7, -1.25], [0.14, -1.18], [0.06, -1.0], [0.06, 0.05]]
  const t0 = Math.asin(0.07 / 1.15)
  for (let i = 0; i <= 16; i++) {
    const t = t0 + (i / 16) * (Math.PI / 2 - t0)
    outer.push([1.15 * Math.sin(t), 1.3 - 1.2 * Math.cos(t)])
  }
  const inner: number[][] = []
  for (let i = 16; i >= 0; i--) {
    const t = (i / 16) * (Math.PI / 2)
    inner.push([Math.max(1.11 * Math.sin(t), 0), 1.3 - 1.12 * Math.cos(t)])
  }
  const yBot = 1.3 - 1.1 + 0.01
  const yFull = 1.0
  const levelAt = (f: number) => {
    const y = yBot + (yFull - yBot) * f
    return { y, r: 1.095 * Math.sin(Math.acos((1.3 - y) / 1.1)) }
  }
  return {
    shell: v([...outer, [1.13, 1.31], ...inner]),
    liquidAt: (f: number) => {
      if (f < 0.01) return null
      const tTop = Math.acos((1.3 - levelAt(f).y) / 1.1)
      const pts: number[][] = []
      for (let i = 0; i <= 12; i++) {
        const t = (i / 12) * tTop
        pts.push([1.095 * Math.sin(t), 1.3 - 1.1 * Math.cos(t)])
      }
      pts.push([0, pts[pts.length - 1][1]])
      return v(pts)
    },
    levelAt,
    drops: null,
    floorY: yBot,
    bottomY: -1.3,
    rimY: 1.3,
    rimR: 1.13,
    garnish: [1.1, 1.3, 0] as [number, number, number],
  }
}

export const glassSpecs: Record<GlassType, GlassSpec> = {
  rocks: {
    ...tumbler(2.2, 0.74, 0.9, 0.05, 0.22, 0.62),
    scale: 1,
    ice: [
      { x: -0.24, z: 0.12, size: 0.44, rot: [0.4, 0.6, 0], stack: 0 },
      { x: 0.27, z: -0.18, size: 0.38, rot: [0.2, 1.1, 0.3], stack: 0 },
    ],
  },
  highball: {
    ...tumbler(3.0, 0.6, 0.66, 0.045, 0.25, 0.8),
    scale: 0.82,
    ice: [
      { x: 0.12, z: 0.06, size: 0.36, rot: [0.1, 1.2, 0.6], stack: 0 },
      { x: -0.12, z: -0.12, size: 0.36, rot: [0.9, 0.2, 0.4], stack: 1 },
      { x: 0.02, z: 0.1, size: 0.38, rot: [0.3, 0.5, 0.1], stack: 2 },
    ],
  },
  coupe: { ...coupe(), scale: 0.95, ice: [] },
}
