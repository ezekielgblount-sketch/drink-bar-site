import { motion } from 'motion/react'
import { bottles, type Bottle } from '../data'
import { useBar } from '../lib/state'

// A shelf of generic bottles (name as text, no logos). Clicking one opens the overlay.
export function BackBar() {
  const { openBottle, setOpenBottle } = useBar()

  return (
    <section id="backbar" className="relative z-10 bg-bar-ink px-6 py-24 md:px-16">
      <p className="text-xs uppercase tracking-[0.3em] text-bar-amber">What we pour</p>
      <h2 className="mt-2 font-display text-5xl">The back bar</h2>
      <p className="mt-3 text-bar-cream/60">Tap a bottle to take a closer look.</p>

      <div className="mt-14 flex flex-wrap items-end justify-center gap-y-10">
        {bottles.map((b) => (
          <button
            key={b.id}
            onClick={() => setOpenBottle(b.id)}
            aria-label={`Open ${b.name}`}
            className="group flex w-32 flex-col items-center focus-visible:outline-2 focus-visible:outline-bar-amber"
          >
            <div className="flex h-44 items-end">
              {openBottle === b.id ? (
                <div style={{ height: 176 * b.height }} />
              ) : (
                <motion.div layoutId={`bottle-${b.id}`} className="motion-safe:transition-transform motion-safe:group-hover:-translate-y-2">
                  <CssBottle bottle={b} />
                </motion.div>
              )}
            </div>
            <div className="h-1.5 w-full bg-[#4a2c16]" />
            <span className="mt-2 text-xs text-bar-cream/60">{b.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function CssBottle({ bottle }: { bottle: Bottle }) {
  return (
    <div className="flex flex-col items-center" style={{ height: 176 * bottle.height }}>
      <div className="h-3 w-5 rounded-t bg-[#2a1a10]" />
      <div className="w-4 flex-[0.35] opacity-80" style={{ background: bottle.color }} />
      <div
        className="relative flex w-16 flex-1 items-center justify-center rounded-t-2xl rounded-b-md shadow-[inset_-6px_0_12px_rgba(0,0,0,0.25),inset_6px_0_10px_rgba(255,255,255,0.25)]"
        style={{ background: bottle.color }}
      >
        <span className="w-full bg-bar-cream/90 px-1 py-2 text-center text-[9px] font-semibold leading-tight text-bar-ink">
          {bottle.name}
        </span>
      </div>
    </div>
  )
}
