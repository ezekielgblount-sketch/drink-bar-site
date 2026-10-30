import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { Vector2, type Group } from 'three'
import type { Bottle } from '../data'
import { BarLights } from './BarLights'
import { GlassMaterial } from '../three/materials'
import { labelTexture } from '../three/textures'

// Loaded only when someone opens a bottle (lazy import in BottleOverlay).
export default function BottleViewer({ bottle }: { bottle: Bottle }) {
  return (
    <Canvas camera={{ position: [0, 0.1, 5.5], fov: 35 }}>
      <color attach="background" args={['#17110c']} />
      <ambientLight intensity={0.4} />
      <spotLight position={[3, 5, 4]} intensity={70} color="#e8a34a" />
      <BarLights />
      <Float speed={1.5} floatIntensity={0.6} rotationIntensity={0.2}>
        <Bottle3D bottle={bottle} />
      </Float>
    </Canvas>
  )
}

const shapes = {
  tall: { bodyR: 0.58, bodyH: 1.75, shoulderH: 0.45, neckR: 0.17, neckH: 0.65 },
  round: { bodyR: 0.7, bodyH: 1.35, shoulderH: 0.55, neckR: 0.18, neckH: 0.5 },
  stubby: { bodyR: 0.5, bodyH: 1.1, shoulderH: 0.7, neckR: 0.15, neckH: 0.45 },
}

// Generic bottle: body, eased shoulder, neck, lip. Same outline scaled down for the liquid.
function profile(s: (typeof shapes)['tall']) {
  const y0 = -1.4
  const yBody = y0 + s.bodyH
  const yNeck = yBody + s.shoulderH
  const yTop = yNeck + s.neckH
  const pts: number[][] = [[0, y0], [s.bodyR - 0.06, y0], [s.bodyR, y0 + 0.06], [s.bodyR, yBody]]
  for (let i = 1; i <= 8; i++) {
    const t = i / 8
    const ease = (1 - Math.cos(t * Math.PI)) / 2
    pts.push([s.bodyR + (s.neckR - s.bodyR) * ease, yBody + s.shoulderH * t])
  }
  pts.push([s.neckR, yTop - 0.1], [s.neckR + 0.035, yTop - 0.06], [s.neckR + 0.035, yTop], [0, yTop])
  const fillTop = yBody + s.shoulderH * 0.4
  const liquid = [[0, y0 + 0.08], [s.bodyR - 0.06, y0 + 0.08], [s.bodyR - 0.04, y0 + 0.14], [s.bodyR - 0.04, yBody], [s.bodyR - 0.12, fillTop], [0, fillTop]]
  return {
    outer: pts.map(([x, y]) => new Vector2(x, y)),
    liquid: liquid.map(([x, y]) => new Vector2(x, y)),
    labelY: y0 + s.bodyH * 0.45,
    labelH: s.bodyH * 0.42,
    capY: yTop + 0.1,
  }
}

function Bottle3D({ bottle }: { bottle: Bottle }) {
  const ref = useRef<Group>(null)
  const s = shapes[bottle.shape]
  const p = useMemo(() => profile(s), [s])
  const label = useMemo(() => labelTexture(bottle.name, bottle.type), [bottle.name, bottle.type])

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.7
  })

  return (
    <group ref={ref} position={[0, -0.15, 0]}>
      <mesh>
        <latheGeometry args={[p.outer, 72]} />
        <GlassMaterial tint={bottle.glass} />
      </mesh>
      {bottle.liquid && (
        <mesh>
          <latheGeometry args={[p.liquid, 72]} />
          <meshPhysicalMaterial color={bottle.liquid} roughness={0.15} clearcoat={0.6} />
        </mesh>
      )}
      <mesh position={[0, p.labelY, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[s.bodyR + 0.006, s.bodyR + 0.006, p.labelH, 72, 1, true]} />
        <meshStandardMaterial map={label} roughness={0.85} />
      </mesh>
      <mesh position={[0, p.capY, 0]}>
        <cylinderGeometry args={[s.neckR + 0.05, s.neckR + 0.05, 0.22, 32]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.6} />
      </mesh>
    </group>
  )
}
