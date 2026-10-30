import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, MathUtils, Vector2, type Group, type Mesh, type MeshBasicMaterial } from 'three'
import type { GlassSpec } from './glasses'
import { streamTexture } from './textures'

type Props = {
  spec: GlassSpec
  color: string
  fillRef: { current: number } // this glass's current fill, 0..1
}

// A shaker tin tilts in above the glass and pours a moving stream down to the
// liquid surface, with ripples where it lands. The stream thins out and stops
// when scrolling stops, and the tin pulls away when the glass is full.
export function PourRig({ spec, color, fillRef }: Props) {
  const tin = useRef<Group>(null)
  const stream = useRef<Mesh>(null)
  const ripples = useRef<Mesh[]>([])
  const foam = useRef<Mesh>(null)
  const tex = useMemo(() => streamTexture(), [])
  const lastFill = useRef(0)
  const flowTimer = useRef(0)
  const flow = useRef(0) // 0 = no stream, 1 = full stream
  const inView = useRef(0) // 0 = tin parked off screen, 1 = in pouring position

  // Pour point (the tin's lip), just above the rim and inside the glass radius.
  const lip: [number, number, number] = [0.22, spec.rimY + 0.85, 0]

  const tinProfile = useMemo(
    () =>
      [[0, 1.5], [0.36, 1.5], [0.4, 1.46], [0.52, 0.14], [0.56, 0.03], [0.54, 0]].map(([x, y]) => new Vector2(x, y)),
    [],
  )

  useFrame(({ clock }, dt) => {
    const fill = fillRef.current
    const pouring = fill > 0.004 && fill < 0.996
    // "Moving" = the fill changed recently, i.e. the visitor is scrolling.
    // (Count down first, then refresh, so a slow frame can't skip the stream.)
    flowTimer.current = Math.max(0, flowTimer.current - dt)
    if (Math.abs(fill - lastFill.current) > 0.0004) flowTimer.current = 0.25
    lastFill.current = fill

    inView.current = MathUtils.damp(inView.current, pouring ? 1 : 0, 5, dt)
    flow.current = MathUtils.damp(flow.current, pouring && flowTimer.current > 0 ? 1 : 0, 9, dt)
    tex.offset.y -= dt * 3.2

    const level = spec.levelAt(Math.max(fill, 0.01))
    const t = clock.elapsedTime

    if (tin.current) {
      const out = 1 - inView.current
      tin.current.visible = inView.current > 0.01
      tin.current.position.set(lip[0] + out * 2.2, lip[1] + out * 2.6, lip[2])
      // Tilts further while actually pouring.
      tin.current.rotation.z = -0.62 - 0.32 * flow.current
    }

    if (stream.current) {
      const s = stream.current
      const len = Math.max(lip[1] - level.y, 0.01)
      const w = flow.current * inView.current
      s.visible = w > 0.02
      s.position.set(lip[0] - 0.04 + Math.sin(t * 9) * 0.008, level.y + len / 2, lip[2])
      s.scale.set(w * (0.9 + Math.sin(t * 13) * 0.08), len, w)
    }

    const surfaceY = level.y + 0.006
    ripples.current.forEach((r, i) => {
      if (!r) return
      const phase = (t * 1.4 + i / ripples.current.length) % 1
      const w = flow.current * inView.current
      r.visible = w > 0.05
      r.position.set(lip[0] - 0.04, surfaceY, lip[2])
      const size = 0.06 + phase * Math.min(0.5, level.r * 0.6)
      r.scale.set(size, size, size)
      ;(r.material as MeshBasicMaterial).opacity = (1 - phase) * 0.55 * w
    })

    if (foam.current) {
      const w = flow.current * inView.current
      foam.current.visible = w > 0.05
      foam.current.position.set(lip[0] - 0.04, surfaceY + 0.002, lip[2])
      foam.current.scale.setScalar(0.09 + Math.sin(t * 20) * 0.01)
      ;(foam.current.material as MeshBasicMaterial).opacity = 0.6 * w
    }
  })

  return (
    <group>
      {/* Generic brushed-steel shaker tin; its open mouth sits at the pour point. */}
      <group ref={tin} visible={false}>
        <mesh>
          <latheGeometry args={[tinProfile, 48]} />
          <meshStandardMaterial color="#d8d8d8" metalness={1} roughness={0.22} side={DoubleSide} />
        </mesh>
      </group>

      <mesh ref={stream} visible={false}>
        <cylinderGeometry args={[0.085, 0.06, 1, 20, 1, true]} />
        <meshPhysicalMaterial
          color={color}
          map={tex}
          roughness={0.08}
          clearcoat={1}
          emissive={color}
          emissiveIntensity={0.12}
          transparent
          opacity={0.93}
        />
      </mesh>

      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => void (m && (ripples.current[i] = m))} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#fff6e6" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
