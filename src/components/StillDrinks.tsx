import { drinks } from '../data'
import { useBar } from '../lib/state'

// Fallback for devices without 3D, or too slow for it: pre-rendered photos of each
// finished drink (made from the 3D scene), cross-fading as the visitor scrolls.
export function StillDrinks() {
  const active = useBar((s) => s.activeDrink)
  return (
    <div className="absolute inset-0 bg-bar-ink">
      {drinks.map((d, i) => (
        <img
          key={d.id}
          src={`${import.meta.env.BASE_URL}stills/${d.id}.webp`}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          // Soft edges so the photo melts into the page instead of showing a box.
          style={{
            maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 60%, transparent 100%)',
          }}
          className={`absolute h-[55svh] w-auto object-contain transition-opacity duration-700 motion-reduce:duration-0 left-1/2 top-0 -translate-x-1/2 md:left-auto md:right-0 md:top-1/2 md:h-[100svh] md:translate-x-0 md:-translate-y-1/2 ${
            i === active ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  )
}
