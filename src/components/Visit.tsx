import { site } from '../data'

export function Visit() {
  return (
    <section id="visit" className="relative z-10 bg-gradient-to-b from-bar-ink to-[#1d120a] px-6 py-28 text-center md:px-16">
      <p className="text-xs uppercase tracking-[0.3em] text-bar-amber">Pull up a stool</p>
      <h2 className="mt-3 font-display text-6xl md:text-7xl">{site.barName}</h2>
      <p className="mx-auto mt-4 max-w-md text-bar-cream/70">{site.tagline}</p>
      <div className="mx-auto mt-12 grid max-w-2xl gap-8 text-sm md:grid-cols-2">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-bar-cream/50">Find us</h3>
          <p className="mt-2">{site.address}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-widest text-bar-cream/50">Hours</h3>
          {site.hours.map((h) => (
            <p key={h} className="mt-2">
              {h}
            </p>
          ))}
        </div>
      </div>
      <a
        href={site.instagramUrl || undefined}
        target="_blank"
        rel="noreferrer"
        className="mt-12 inline-block rounded-full bg-bar-amber px-8 py-3 font-semibold text-bar-ink hover:bg-bar-cream"
      >
        Follow {site.instagramHandle}
      </a>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="relative z-10 bg-[#1d120a] px-6 py-8 text-center text-xs text-bar-cream/40">
      <p>Must be 21+ to drink. Please drink responsibly and never drink and drive.</p>
      <p className="mt-1">Brand names are used only to describe what we pour. No affiliation implied.</p>
    </footer>
  )
}
