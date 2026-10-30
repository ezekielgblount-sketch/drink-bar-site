import { useMemo, type Ref } from 'react'
import { DoubleSide, ExtrudeGeometry, Shape, type Group } from 'three'
import type { GarnishType } from '../data'
import { wheelTexture } from './textures'

const citrus = {
  lime: { rind: '#4f8f22', flesh: '#b9e05c' },
  grapefruit: { rind: '#ee8a5a', flesh: '#f2676a' },
}

type Props = { type: GarnishType; ref?: Ref<Group>; position?: [number, number, number]; rotation?: [number, number, number] }

export function Garnish({ type, ref, position, rotation }: Props) {
  if (type === 'mango') return <MangoSlice ref={ref} position={position} rotation={rotation} />
  return <CitrusWheel ref={ref} position={position} rotation={rotation} {...citrus[type]} />
}

function CitrusWheel({ rind, flesh, ref, position, rotation }: { rind: string; flesh: string } & Omit<Props, 'type'>) {
  const tex = useMemo(() => wheelTexture(rind, flesh), [rind, flesh])
  return (
    <group ref={ref} position={position} rotation={rotation ?? [0, 0, Math.PI / 2.3]}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.07, 48]} />
        <meshStandardMaterial attach="material-0" color={rind} roughness={0.55} />
        <meshStandardMaterial attach="material-1" map={tex} roughness={0.4} />
        <meshStandardMaterial attach="material-2" map={tex} roughness={0.4} />
      </mesh>
    </group>
  )
}

// A wedge of fresh mango: a crescent of golden flesh with red-green skin on the curve,
// notched so it sits on the rim.
function MangoSlice({ ref, position, rotation }: Omit<Props, 'type'>) {
  const geo = useMemo(() => {
    const s = new Shape()
    s.moveTo(-0.4, 0)
    s.lineTo(0.4, 0) // straight cut edge (flesh side)
    s.bezierCurveTo(0.38, -0.3, -0.38, -0.3, -0.4, 0) // rounded skin side
    const g = new ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 24 })
    g.center()
    return g
  }, [])
  return (
    <group ref={ref} position={position} rotation={rotation ?? [0, -0.4, 0.25]}>
      <mesh geometry={geo} position={[0.08, 0.06, 0]}>
        <meshPhysicalMaterial attach="material-0" color="#f8a428" roughness={0.28} clearcoat={0.8} emissive="#f39a1e" emissiveIntensity={0.12} side={DoubleSide} />
        <meshStandardMaterial attach="material-1" color="#b8452a" roughness={0.5} />
      </mesh>
    </group>
  )
}
