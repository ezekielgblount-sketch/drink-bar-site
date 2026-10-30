import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, type InstancedMesh } from 'three'
import type { GlassSpec } from './glasses'

const COUNT = 40
const dummy = new Object3D()

// Soda bubbles rising from the bottom of the glass to the liquid surface.
export function Bubbles({ spec, fillRef }: { spec: GlassSpec; fillRef: { current: number } }) {
  const ref = useRef<InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = (i * 2.399) % (Math.PI * 2) // spread evenly around the glass
        return { a, d: 0.15 + ((i * 37) % 100) / 140, speed: 0.25 + ((i * 53) % 100) / 220, off: ((i * 71) % 100) / 100, s: 0.012 + ((i * 29) % 100) / 5000 }
      }),
    [],
  )

  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const fill = fillRef.current
    m.visible = fill > 0.08
    if (!m.visible) return
    const level = spec.levelAt(fill)
    const h = level.y - spec.floorY - 0.04
    const t = clock.elapsedTime
    seeds.forEach((b, i) => {
      const p = (t * b.speed + b.off) % 1
      const y = spec.floorY + 0.03 + p * h
      const rr = level.r * b.d * 0.85
      dummy.position.set(Math.cos(b.a) * rr + Math.sin(t * 3 + i) * 0.01, y, Math.sin(b.a) * rr)
      dummy.scale.setScalar(b.s * (0.7 + p * 0.6)) // bubbles grow a little as they rise
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} visible={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshPhysicalMaterial color="#ffffff" transparent opacity={0.55} roughness={0} clearcoat={1} />
    </instancedMesh>
  )
}
