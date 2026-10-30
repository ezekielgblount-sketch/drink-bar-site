import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { drinks, site } from '../data'
import { sceneReady, scrollState } from '../lib/state'
import { reducedMotion } from '../lib/motion'

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const hero = drinks[0]

  useGSAP(
    () => {
      if (reducedMotion) return // text and glass are simply shown, no entrance
      gsap.from('.hero-line', { y: 40, autoAlpha: 0, stagger: 0.12, duration: 0.9, ease: 'power2.out', delay: 0.3 })
      // The empty glass rises once the 3D scene has loaded (or after 3s, whichever is first).
      // Scrolling then pours the drink into it (see DrinkSection).
      const pour = gsap.timeline({ paused: true }).to(scrollState, { rise: 1, duration: 1.8, ease: 'power3.out' })
      let alive = true
      const start = () => {
        if (alive && pour.paused()) pour.play()
      }
      sceneReady.then(start)
      const fallback = setTimeout(start, 3000)
      return () => {
        alive = false
        clearTimeout(fallback)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative z-10 flex h-svh items-end px-6 pb-16 md:items-center md:px-16 md:pb-0">
      <div className="max-w-xl">
        <p className="hero-line text-sm uppercase tracking-[0.3em] text-bar-amber">{site.barName}</p>
        <h1 className="hero-line mt-3 font-display text-5xl leading-none sm:text-6xl md:text-8xl">{hero.name}</h1>
        <p className="hero-line mt-5 text-lg text-bar-cream/75 md:text-xl">Real mango. Not mango flavor.</p>
        <p className="hero-line mt-10 text-xs uppercase tracking-widest text-bar-cream/50">
          {reducedMotion ? 'Scroll for the menu ↓' : 'Scroll to pour ↓'}
        </p>
      </div>
    </section>
  )
}
