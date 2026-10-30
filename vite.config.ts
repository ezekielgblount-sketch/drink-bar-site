import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /drink-bar-site/, so every file path starts there.
  base: '/drink-bar-site/',
  plugins: [react(), tailwindcss()],
  build: {
    // three.js is big on its own; this is expected for a 3D site.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the 3D libraries in their own files so browsers cache them across updates.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          anim: ['gsap', '@gsap/react', 'lenis', 'motion'],
        },
      },
    },
  },
})
