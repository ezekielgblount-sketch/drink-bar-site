import { Environment, Lightformer } from '@react-three/drei'

// Built-in reflections for glass, steel and liquid, set up like a bar:
// a warm pendant lamp overhead, a soft window to one side, a dim back-bar glow.
// No HDR download, so the scene shows instantly.
export function BarLights() {
  return (
    <Environment resolution={256} frames={1}>
      {/* pendant lamp: small and bright, makes the crisp highlights on glass */}
      <Lightformer form="circle" intensity={6} color="#ffd59a" position={[0, 5, 0.5]} rotation-x={Math.PI / 2} scale={1.6} />
      {/* soft side window */}
      <Lightformer form="rect" intensity={2.2} color="#fff4e6" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[3, 5, 1]} />
      {/* thin rim strips: the long vertical streaks real glassware shows */}
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[4, 0.5, 2]} rotation-y={-Math.PI / 2} scale={[0.4, 6, 1]} />
      <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[-3, 0.5, 4]} rotation-y={Math.PI / 4} scale={[0.3, 5, 1]} />
      {/* warm back-bar glow behind */}
      <Lightformer form="rect" intensity={1.2} color="#e8a34a" position={[0, 0, -6]} scale={[10, 3, 1]} />
    </Environment>
  )
}
