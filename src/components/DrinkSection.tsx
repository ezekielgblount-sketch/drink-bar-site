import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { sourceFor, type Drink } from '../data'
import { SourceLinks } from './SourceLinks'
import { applySectionProgress, scrollState, useBar } from '../lib/state'
import { reducedMotion } from '../lib/motion'
import { formatQty } from '../lib/format'

type Props = { drink: Drink; index: number }

// A tall section: the text sticks while the drink is poured, garnished, then spun.
export function DrinkSection({ drink, index }: Props) {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) {
            scrollState.active = index
            useBar.getState().setActiveDrink(index)
            applySectionProgress(self.progress)
          }
        },
        onUpdate: (self) => {
          if (self.isActive) applySectionProgress(self.progress)
        },
        // Back in the hero: an empty glass again, waiting to be poured.
        onLeaveBack: () => {
          if (index === 0) applySectionProgress(0)
        },
      })
      if (reducedMotion) return // no slide-ins: text is just there
      gsap.from('.reveal', {
        y: 30,
        autoAlpha: 0,
        stagger: 0.1,
        duration: 0.7,
        scrollTrigger: { trigger: root.current, start: 'top 55%', toggleActions: 'play none none reverse' },
      })
      gsap.from('.ing', {
        x: -40,
        autoAlpha: 0,
        stagger: 0.12,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: root.current, start: '30% center', toggleActions: 'play none none reverse' },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative z-10 h-[300vh]">
      <div className="sticky top-0 flex h-svh items-end px-6 pb-8 md:items-center md:px-16 md:pb-0">
        <div className="w-full max-w-md rounded-2xl bg-bar-ink/70 p-6 backdrop-blur-md md:bg-transparent md:p-0 md:backdrop-blur-none">
          <p className="reveal text-xs uppercase tracking-[0.3em] text-bar-amber">
            {drink.signature ? 'House signature' : `No. ${String(index).padStart(2, '0')}`}
          </p>
          <h2 className="reveal mt-2 font-display text-5xl md:text-6xl">{drink.name}</h2>
          <p className="reveal mt-3 text-bar-cream/80">{drink.story}</p>
          <p className="reveal mt-2 text-sm text-bar-cream/50">{drink.glass}</p>
          <SourceLinks className="reveal mt-2" sources={drink.sources} house={drink.house} />
          <ul className="mt-6 space-y-2">
            {drink.ingredients.map((ing) => {
              const src = sourceFor(ing.ref)
              return (
                <li key={ing.item} className="ing flex items-baseline justify-between gap-4 border-b border-white/10 pb-1 text-sm">
                  <span>
                    {src ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`Source: ${src.label}`}
                        className="underline decoration-bar-amber/40 underline-offset-2 hover:text-bar-amber"
                      >
                        {ing.item}
                      </a>
                    ) : (
                      ing.item
                    )}
                  </span>
                  <span className="shrink-0 text-bar-amber">{formatQty(ing, 1)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
