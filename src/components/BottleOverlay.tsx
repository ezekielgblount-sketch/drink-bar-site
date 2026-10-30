import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { bottles } from '../data'
import { getLenis, useBar } from '../lib/state'
import { SourceList } from './SourceLinks'

const BottleViewer = lazy(() => import('./BottleViewer'))

// Unverified facts say so plainly instead of guessing.
const show = (v: string | null) => v ?? 'unknown'

// Focused view of one bottle. Click outside or press Esc to send it back to the shelf.
export function BottleOverlay() {
  const { openBottle, setOpenBottle } = useBar()
  const bottle = bottles.find((b) => b.id === openBottle)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!bottle) return
    setReady(false)
    // Fallback in case the layout animation event doesn't fire (e.g. reduced motion).
    const t = setTimeout(() => setReady(true), 700)
    getLenis()?.stop()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenBottle(null)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      getLenis()?.start()
    }
  }, [bottle, setOpenBottle])

  return (
    <AnimatePresence>
      {bottle && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpenBottle(null)}
        >
          <motion.div
            layoutId={`bottle-${bottle.id}`}
            role="dialog"
            aria-modal="true"
            aria-label={bottle.name}
            onClick={(e) => e.stopPropagation()}
            onLayoutAnimationComplete={() => setReady(true)}
            data-lenis-prevent
            className="grid max-h-[90svh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#17110c] md:grid-cols-2"
          >
            <div className="h-56 md:h-auto md:min-h-[28rem]">
              {/* Mount 3D only after the card finishes growing, so it measures its real size. */}
              {ready && (
                <motion.div className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Suspense fallback={null}>
                    <BottleViewer bottle={bottle} />
                  </Suspense>
                </motion.div>
              )}
            </div>
            <div className="p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-bar-amber">{bottle.type}</p>
              <h3 className="mt-2 font-display text-4xl">{bottle.name}</h3>
              <dl className="mt-6 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-bar-cream/50">ABV</dt>
                <dd>{show(bottle.abv)}</dd>
                <dt className="text-bar-cream/50">Maker</dt>
                <dd>{show(bottle.maker)}</dd>
                <dt className="text-bar-cream/50">Origin</dt>
                <dd>{show(bottle.origin)}</dd>
                <dt className="text-bar-cream/50">Price</dt>
                <dd>{show(bottle.price)}</dd>
                <dt className="text-bar-cream/50">Flavor</dt>
                <dd>{show(bottle.flavor)}</dd>
              </dl>
              <div className="mt-6">
                <SourceList sources={bottle.sources} />
              </div>
              <button
                onClick={() => setOpenBottle(null)}
                className="mt-8 rounded-full border border-bar-amber/60 px-5 py-2 text-sm text-bar-amber hover:bg-bar-amber hover:text-bar-ink"
              >
                Back to the shelf
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
