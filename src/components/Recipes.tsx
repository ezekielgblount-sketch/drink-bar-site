import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { drinks } from '../data'
import { formatQty } from '../lib/format'
import { SourceLinks } from './SourceLinks'
import { reducedMotion } from '../lib/motion'

export function Recipes() {
  const root = useRef<HTMLElement>(null)
  const [servings, setServings] = useState(1)

  useGSAP(
    () => {
      if (reducedMotion) return
      gsap.set('.recipe-card', { y: 50, autoAlpha: 0 })
      ScrollTrigger.batch('.recipe-card', {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, stagger: 0.12, duration: 0.7, ease: 'power2.out' }),
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="recipes" className="relative z-10 bg-bar-ink px-6 py-24 md:px-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-bar-amber">Make it at home</p>
          <h2 className="mt-2 font-display text-5xl">Recipes</h2>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-white/15 px-2 py-1">
          <button
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            className="h-9 w-9 rounded-full text-xl hover:bg-white/10"
            aria-label="Fewer servings"
          >
            −
          </button>
          <span className="min-w-24 text-center text-sm" aria-live="polite">
            {servings} serving{servings > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setServings((s) => Math.min(12, s + 1))}
            className="h-9 w-9 rounded-full text-xl hover:bg-white/10"
            aria-label="More servings"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {drinks.map((d) => (
          <article
            key={d.id}
            className={`recipe-card rounded-2xl border p-6 ${d.signature ? 'border-bar-amber/50 bg-bar-amber/5' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-3xl">{d.name}</h3>
              {d.signature && <span className="text-xs uppercase tracking-widest text-bar-amber">Signature</span>}
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {d.ingredients.map((ing) => (
                <li key={ing.item} className="flex justify-between gap-4">
                  <span className="text-bar-cream/80">{ing.item}</span>
                  <span className="shrink-0 text-bar-amber">{formatQty(ing, servings)}</span>
                </li>
              ))}
            </ul>
            <SourceLinks className="mt-3" sources={d.sources} house={d.house} />
            <ol className="mt-5 space-y-2 text-sm text-bar-cream/70">
              {d.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  )
}
