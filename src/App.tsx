import { lazy, Suspense } from 'react'
import { MotionConfig } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import { drinks } from './data'
import { setLenis, useBar } from './lib/state'
import { reducedMotion } from './lib/motion'
import { Hero } from './components/Hero'
import { DrinkSection } from './components/DrinkSection'
import { BackBar } from './components/BackBar'
import { BottleOverlay } from './components/BottleOverlay'
import { Recipes } from './components/Recipes'
import { Visit, Footer } from './components/Visit'
import { StillDrinks } from './components/StillDrinks'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// The 3D scene is a separate download, so the words appear first.
const DrinkScene = lazy(() => import('./components/DrinkScene'))

export default function App() {
  const stills = useBar((s) => s.stills)

  useGSAP(() => {
    // Smooth scroll (Lenis), driven by GSAP's ticker so ScrollTrigger stays in sync.
    // Skipped for visitors who asked for less motion: they get normal scrolling.
    let cleanup = () => {}
    if (!reducedMotion) {
      const lenis = new Lenis()
      setLenis(lenis)
      lenis.on('scroll', ScrollTrigger.update)
      const tick = (t: number) => lenis.raf(t * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      cleanup = () => {
        gsap.ticker.remove(tick)
        lenis.destroy()
        setLenis(null)
      }
    }

    // Fade the drink stage out once the showcase is over.
    gsap.fromTo(
      '#scene',
      { autoAlpha: 1 },
      {
        autoAlpha: 0,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: { trigger: '#backbar', start: 'top 90%', end: 'top 40%', scrub: true },
      },
    )
    // Re-measure once web fonts settle, since they change section heights.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return cleanup
  })

  return (
    // "user" = pop-outs and transitions follow the visitor's reduced-motion setting.
    <MotionConfig reducedMotion="user">
      <div id="scene" className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {stills ? (
          <StillDrinks />
        ) : (
          <Suspense fallback={null}>
            <DrinkScene />
          </Suspense>
        )}
      </div>
      <main>
        <Hero />
        {drinks.map((d, i) => (
          <DrinkSection key={d.id} drink={d} index={i} />
        ))}
        <BackBar />
        <Recipes />
        <Visit />
      </main>
      <Footer />
      <BottleOverlay />
    </MotionConfig>
  )
}
