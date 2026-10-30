import type { Ref } from 'react'
import { DoubleSide, type MeshPhysicalMaterial } from 'three'

// Phones and low-core machines get a cheap see-through look instead of real
// refraction (which needs an extra render pass every frame).
export const lowPower =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4)

export function GlassMaterial({ tint = '#ffffff' }: { tint?: string }) {
  return lowPower ? (
    <meshPhysicalMaterial
      color={tint}
      transparent
      opacity={0.2}
      roughness={0.04}
      clearcoat={1}
      envMapIntensity={2}
      side={DoubleSide}
      depthWrite={false}
    />
  ) : (
    <meshPhysicalMaterial
      color={tint}
      transmission={1}
      thickness={0.25}
      roughness={0.02}
      ior={1.5}
      clearcoat={1}
      envMapIntensity={1}
      // Don't block what's inside: lets the stream, ripples, ice and bubbles show through.
      depthWrite={false}
    />
  )
}

// Drink liquid. Kept solid (not see-through) on purpose: three.js can't draw a
// see-through liquid inside see-through glass, so a solid liquid is what the
// glass refracts. A glossy coat and a soft inner glow sell it as a drink.
export function LiquidMaterial({ color, clear, ref }: { color: string; clear?: boolean; ref?: Ref<MeshPhysicalMaterial> }) {
  // Clear drinks (like Ranch Water): a faint see-through tint instead of a solid body.
  if (clear)
    return (
      <meshPhysicalMaterial
        ref={ref}
        color={color}
        transparent
        opacity={0.28}
        roughness={0.02}
        clearcoat={1}
        envMapIntensity={2}
        emissive={color}
        emissiveIntensity={0.05}
        depthWrite={false}
      />
    )
  return (
    <meshPhysicalMaterial
      ref={ref}
      color={color}
      roughness={0.1}
      clearcoat={1}
      clearcoatRoughness={0.05}
      sheen={0.4}
      sheenColor="#ffffff"
      emissive={color}
      emissiveIntensity={0.08}
    />
  )
}

// Clear, glossy ice. Drawn after the glass, so it shows through it.
export function IceMaterial() {
  return (
    <meshPhysicalMaterial
      color="#f2f9ff"
      transparent
      opacity={0.62}
      roughness={0.04}
      clearcoat={1}
      envMapIntensity={2.6}
      emissive="#b9d4e6"
      emissiveIntensity={0.12}
      depthWrite={false}
    />
  )
}
