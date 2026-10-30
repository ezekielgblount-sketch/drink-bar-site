import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { LatheGeometry, MathUtils, type Group, type Mesh, type MeshPhysicalMaterial } from 'three'
import type { Drink } from '../data'
import { scrollState } from '../lib/state'
import { reducedMotion } from '../lib/motion'
import { glassSpecs } from '../three/glasses'
import { dropletTexture } from '../three/textures'
import { GlassMaterial, IceMaterial, LiquidMaterial } from '../three/materials'
import { Garnish } from '../three/Garnish'
import { PourRig } from '../three/PourRig'
import { Bubbles } from '../three/Bubbles'

export const BAR_Y = -1.25 // height of the bar top in the stage

type Props = { index: number; drink: Drink }

const TAU = Math.PI * 2

// One drink: glass, liquid that fills as you scroll, floating ice, condensation,
// rim, pour rig, bubbles and garnish. Only the active drink is shown.
export function Glass({ index, drink }: Props) {
  const spec = glassSpecs[drink.glassType]
  const group = useRef<Group>(null)
  const garnish = useRef<Group>(null)
  const liquid = useRef<Mesh>(null)
  const liquidMat = useRef<MeshPhysicalMaterial>(null)
  const dropsMat = useRef<MeshPhysicalMaterial>(null)
  const ice = useRef<(Mesh | null)[]>([])
  const scale = useRef(index === 0 ? 1 : 0)
  const fill = useRef(0) // this glass's own fill, frozen while it's not active
  const builtFill = useRef(-1)
  const drops = useMemo(() => (spec.drops ? dropletTexture() : null), [spec.drops])
  const lift = BAR_Y - spec.bottomY * spec.scale // sit every glass on the bar top

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    const isActive = scrollState.active === index
    // Reduced motion: swap drinks instantly instead of zooming.
    scale.current = reducedMotion ? (isActive ? 1 : 0) : MathUtils.damp(scale.current, isActive ? 1 : 0, 6, dt)
    g.visible = scale.current > 0.01
    if (!g.visible) return
    if (isActive) fill.current = reducedMotion ? scrollState.fill : MathUtils.damp(fill.current, scrollState.fill, 10, dt)
    const f = fill.current

    g.scale.setScalar(Math.max(scale.current * spec.scale, 0.001))
    g.rotation.y = MathUtils.damp(g.rotation.y, isActive ? scrollState.spin * TAU : 0, 8, dt)
    g.position.y = lift + (1 - scrollState.rise) * -4

    // Rebuild the liquid shape when the level has moved enough to notice.
    if (liquid.current && Math.abs(f - builtFill.current) > 0.004) {
      const pts = spec.liquidAt(f)
      liquid.current.visible = !!pts
      if (pts) {
        liquid.current.geometry.dispose()
        liquid.current.geometry = new LatheGeometry(pts, 72)
      }
      builtFill.current = f
    }
    // Liquid shimmer: a slow glow pulse.
    if (liquidMat.current) liquidMat.current.emissiveIntensity = 0.07 + Math.sin(clock.elapsedTime * 1.8) * 0.03
    // The glass frosts up as cold liquid fills it.
    if (dropsMat.current) dropsMat.current.opacity = f

    // Ice rests on the bottom, then floats up with the rising liquid.
    const level = spec.levelAt(f)
    spec.ice.forEach((c, i) => {
      const m = ice.current[i]
      if (!m) return
      const floor = spec.floorY + c.size / 2 + c.stack * c.size * 0.88
      const floating = level.y - c.size * 0.3 - c.stack * c.size * 0.88
      m.position.y = Math.max(floor, f > 0.02 ? floating : floor)
    })

    if (garnish.current) {
      const drop = isActive ? scrollState.garnish : 1
      garnish.current.visible = drop > 0.001
      garnish.current.position.y = spec.garnish[1] + (1 - drop) * 2.2
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <latheGeometry args={[spec.shell, 72]} />
        <GlassMaterial />
      </mesh>
      <mesh ref={liquid} visible={false}>
        <LiquidMaterial ref={liquidMat} color={drink.liquid} clear={drink.clear} />
      </mesh>
      {spec.ice.map((c, i) => (
        <RoundedBox
          key={i}
          ref={(m: Mesh | null) => void (ice.current[i] = m)}
          args={[c.size, c.size, c.size]}
          radius={0.06}
          position={[c.x, spec.floorY + c.size / 2, c.z]}
          rotation={c.rot}
        >
          <IceMaterial />
        </RoundedBox>
      ))}
      {drops && (
        <mesh>
          <latheGeometry args={[spec.drops!, 72]} />
          <meshPhysicalMaterial ref={dropsMat} map={drops} transparent opacity={0} depthWrite={false} roughness={0.05} clearcoat={1} />
        </mesh>
      )}
      {drink.rim && (
        <mesh position={[0, spec.rimY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[spec.rimR, 0.045, 12, 72]} />
          <meshStandardMaterial color={drink.rim === 'chili' ? '#cf4f2b' : '#f3efe6'} roughness={1} />
        </mesh>
      )}
      <PourRig spec={spec} color={drink.liquid} fillRef={fill} />
      {drink.fizz && <Bubbles spec={spec} fillRef={fill} />}
      <Garnish ref={garnish} type={drink.garnish} position={spec.garnish} />
    </group>
  )
}
