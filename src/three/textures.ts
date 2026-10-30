import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

// Textures drawn in code at runtime: no image files, no licenses, nothing to download.
const cache = new Map<string, CanvasTexture>()

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  cache.set(key, t)
  return t
}

// Citrus wheel face: rind, pith ring, segments.
export function wheelTexture(rind: string, flesh: string) {
  return make(`wheel-${rind}-${flesh}`, 256, 256, (g) => {
    const c = 128
    const disc = (r: number, color: string) => {
      g.fillStyle = color
      g.beginPath()
      g.arc(c, c, r, 0, Math.PI * 2)
      g.fill()
    }
    disc(128, rind)
    disc(116, '#f7f3dc')
    const n = 10
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.05
      const a1 = ((i + 1) / n) * Math.PI * 2 - 0.05
      const grd = g.createRadialGradient(c, c, 10, c, c, 108)
      grd.addColorStop(0, '#fffbe6')
      grd.addColorStop(0.35, flesh)
      grd.addColorStop(1, flesh)
      g.fillStyle = grd
      g.beginPath()
      g.moveTo(c, c)
      g.arc(c, c, 108, a0, a1)
      g.closePath()
      g.fill()
    }
    disc(9, '#f7f3dc')
  })
}

// Condensation droplets, tiled around the outside of cold glasses.
export function dropletTexture() {
  const t = make('drops', 512, 512, (g) => {
    let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 320; i++) {
      const x = rnd() * 512
      const y = rnd() * 512
      const r = 1.2 + rnd() * rnd() * 7
      const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r)
      grd.addColorStop(0, 'rgba(255,255,255,0.95)')
      grd.addColorStop(0.55, 'rgba(225,238,248,0.4)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
  })
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(4, 1)
  return t
}

// Streaks for the pour stream. Scrolled every frame so the liquid looks like it's moving.
export function streamTexture() {
  const t = make('stream', 64, 256, (g) => {
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, 64, 256)
    let seed = 11
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 140; i++) {
      const light = rnd() > 0.5
      g.fillStyle = light ? `rgba(255,255,255,${0.3 + rnd() * 0.5})` : `rgba(0,0,0,${0.08 + rnd() * 0.2})`
      g.fillRect(rnd() * 64, rnd() * 256, 1 + rnd() * 3, 10 + rnd() * 70)
    }
  })
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1, 2)
  return t
}

// Bar-top wood that fades to the page color at the edge, so it melts into the dark.
export function radialFadeTexture() {
  return make('radial', 512, 512, (g) => {
    g.fillStyle = '#21140b'
    g.fillRect(0, 0, 512, 512)
    // faint wood grain
    let seed = 5
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${rnd() > 0.5 ? '20,10,4' : '90,55,30'},${0.15 + rnd() * 0.25})`
      g.lineWidth = 1 + rnd() * 3
      const y = rnd() * 512
      g.beginPath()
      g.moveTo(0, y)
      g.bezierCurveTo(170, y + (rnd() - 0.5) * 30, 340, y + (rnd() - 0.5) * 30, 512, y + (rnd() - 0.5) * 20)
      g.stroke()
    }
    const grd = g.createRadialGradient(256, 256, 30, 256, 256, 256)
    grd.addColorStop(0, 'rgba(11,8,6,0)')
    grd.addColorStop(0.22, 'rgba(11,8,6,0.2)')
    grd.addColorStop(0.55, 'rgba(11,8,6,0.85)')
    grd.addColorStop(0.75, 'rgba(11,8,6,1)')
    g.fillStyle = grd
    g.fillRect(0, 0, 512, 512)
  })
}

// Soft round shadow (white = dark shadow), used as an alpha map on phones.
export function shadowBlobTexture() {
  return make('shadow-blob', 128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64)
    grd.addColorStop(0, '#ffffff')
    grd.addColorStop(0.45, '#9a9a9a')
    grd.addColorStop(1, '#000000')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
  })
}

// Plain bottle label: product name as text only (no logos, no artwork).
// Printed twice so it reads from the front and back while spinning.
export function labelTexture(name: string, type: string) {
  return make(`label-${name}`, 1024, 256, (g) => {
    g.fillStyle = '#f4ead8'
    g.fillRect(0, 0, 1024, 256)
    g.fillStyle = '#c9a36a'
    g.fillRect(0, 22, 1024, 4)
    g.fillRect(0, 230, 1024, 4)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (const cx of [256, 768]) {
      let size = 72
      g.font = `600 ${size}px Fraunces, Georgia, serif`
      while (g.measureText(name).width > 420 && size > 30) {
        size -= 4
        g.font = `600 ${size}px Fraunces, Georgia, serif`
      }
      g.fillStyle = '#1b120b'
      g.fillText(name, cx, 112)
      // Shrink long types (e.g. "ORANGE LIQUEUR (TRIPLE SEC)") to fit the label.
      const sub = type.split(',')[0].toUpperCase()
      let subSize = 26
      g.font = `500 ${subSize}px system-ui, sans-serif`
      while (g.measureText(sub).width > 400 && subSize > 14) {
        subSize -= 2
        g.font = `500 ${subSize}px system-ui, sans-serif`
      }
      g.fillStyle = '#7a5a36'
      g.fillText(sub, cx, 178)
    }
  })
}
