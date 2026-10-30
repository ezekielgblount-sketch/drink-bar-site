import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { ContactShadows, Float, PerformanceMonitor, RoundedBox, Sparkles } from '@react-three/drei'
import { MathUtils } from 'three'
import { drinks } from '../data'
import { markSceneReady, useBar } from '../lib/state'
import { force3d, reducedMotion } from '../lib/motion'
import { BAR_Y, Glass } from './Glass'
import { BarLights } from './BarLights'
import { Garnish } from '../three/Garnish'
import { IceMaterial, lowPower } from '../three/materials'
import { radialFadeTexture, shadowBlobTexture } from '../three/textures'

// One fixed, full-screen canvas behind the hero and showcase sections.
// Loaded lazily (see App.tsx) so the page text paints before the 3D code arrives.
export default function DrinkScene() {
  // Sharpness: phones start a bit lower; drops further if frames get slow.
  const [dpr, setDpr] = useState(lowPower ? 1.5 : 2)
  const slowChecks = useRef(0)

  // Each check covers ~2.5s. One slow check → render at 1x. Four slow checks
  // (about 10 seconds under 35 fps) → swap to pre-rendered still images.
  const onDecline = () => {
    setDpr(1)
    slowChecks.current += 1
    if (slowChecks.current >= 4 && !force3d) useBar.getState().useStills()
  }

  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, dpr]} camera={{ position: [0, 0.3, 6.5], fov: 38 }} onCreated={markSceneReady}>
        <PerformanceMonitor bounds={() => [35, 55]} onDecline={onDecline} />
        {/* Same as the page color: glass refracts this, so it reads clear instead of milky. */}
        <color attach="background" args={['#0b0806']} />
        <ambientLight intensity={0.25} />
        <spotLight position={[3, 6, 4]} angle={0.45} penumbra={0.9} intensity={70} color="#e8a34a" />
        <pointLight position={[-4, 1, 2]} intensity={10} color="#b6e05a" />
        <BarLights />
        <Sparkles
          count={lowPower ? 35 : 70}
          scale={[12, 7, 5]}
          size={2.5}
          speed={reducedMotion ? 0 : 0.25}
          color="#f4ead8"
          opacity={0.6}
        />
        <Stage />
      </Canvas>
    </div>
  )
}

function Stage() {
  const { size, camera, pointer } = useThree()
  const wide = size.width >= 768

  // Camera drifts toward the cursor so the scene feels alive when idle (not with reduced motion).
  useFrame((_, dt) => {
    if (reducedMotion) return
    camera.position.x = MathUtils.damp(camera.position.x, pointer.x * 0.5, 2, dt)
    camera.position.y = MathUtils.damp(camera.position.y, 0.3 + pointer.y * 0.25, 2, dt)
    camera.lookAt(0, 0, 0)
  })

  return (
    // Phones: drink sits in the top half, above the text card, so the pour stays visible.
    <group position={[wide ? 1.6 : 0, wide ? -0.1 : 1.2, 0]} scale={wide ? 1 : 0.5}>
      {drinks.map((d, i) => (
        <Glass key={d.id} index={i} drink={d} />
      ))}
      <BarTop />
      <FloatingProps />
    </group>
  )
}

// Polished dark bar top the glass sits on, fading into the dark, with a soft shadow.
function BarTop() {
  const fade = useMemo(() => radialFadeTexture(), [])
  const shadowBlob = useMemo(() => shadowBlobTexture(), [])
  return (
    <group position={[0, BAR_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 64]} />
        {/* Solid (not transparent) so the glass refracts it; fades to the page color at the edge. */}
        <meshStandardMaterial map={fade} color="#8a8a8a" roughness={0.55} metalness={0} envMapIntensity={0.25} />
      </mesh>
      {lowPower ? (
        // Phones: a cheap painted shadow instead of re-rendering a live one every frame.
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <circleGeometry args={[1.3, 48]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.55} alphaMap={shadowBlob} depthWrite={false} />
        </mesh>
      ) : (
        <ContactShadows position={[0, 0.005, 0]} scale={5} opacity={0.75} blur={2.6} far={3.5} resolution={512} />
      )}
    </group>
  )
}

const props = [
  { kind: 'lime', pos: [-1.9, 1.3, -1.5], speed: 1.2 },
  { kind: 'ice', pos: [1.9, 1.9, -1], speed: 1.6 },
  { kind: 'lime', pos: [2.1, -0.3, -0.6], speed: 0.9 },
  { kind: 'ice', pos: [-2.0, -0.4, -0.4], speed: 1.4 },
  { kind: 'mango', pos: [-2.6, 2.1, -2.6], speed: 1 },
] as const

// Garnish floating at different depths, so it moves at different speeds.
function FloatingProps() {
  return (
    <>
      {props.map((p, i) => (
        <Float
          key={i}
          speed={reducedMotion ? 0 : p.speed}
          rotationIntensity={reducedMotion ? 0 : 1.2}
          floatIntensity={reducedMotion ? 0 : 1.4}
        >
          <group position={p.pos as unknown as [number, number, number]}>
            {p.kind === 'lime' && <Garnish type="lime" rotation={[1.2, 0.3, 0]} />}
            {p.kind === 'ice' && (
              <RoundedBox args={[0.35, 0.35, 0.35]} radius={0.05}>
                <IceMaterial />
              </RoundedBox>
            )}
            {p.kind === 'mango' && (
              <mesh scale={[0.3, 0.4, 0.26]} rotation={[0, 0, 0.4]}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshPhysicalMaterial color="#f29a26" roughness={0.35} clearcoat={0.6} emissive="#e8761b" emissiveIntensity={0.12} />
              </mesh>
            )}
          </group>
        </Float>
      ))}
    </>
  )
}
