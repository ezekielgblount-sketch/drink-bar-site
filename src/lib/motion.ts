// Device and preference checks, read once at startup.

// The visitor asked their device for less motion (an accessibility setting).
// The site then shows finished drinks without spinning, pouring or floating.
export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Test switches in the address bar: ?fallback forces the still-image version,
// ?force3d keeps 3D even if the device seems slow.
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const forceFallback = params.has('fallback')
export const force3d = params.has('force3d')

// Can this browser draw 3D at all?
export const webglSupported = (() => {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()
