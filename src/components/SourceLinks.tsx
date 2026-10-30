import { FACTS_CHECKED, type Source } from '../data'

// Numbered source links, e.g. "Sources: [1] [2]". Hover or focus shows what each one is.
export function SourceLinks({ sources, house, className = '' }: { sources: Source[]; house?: boolean; className?: string }) {
  if (house) return <p className={`text-xs text-bar-cream/45 ${className}`}>House recipe</p>
  if (sources.length === 0) return null
  return (
    <p className={`text-xs text-bar-cream/45 ${className}`}>
      Sources:{' '}
      {sources.map((s, i) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          title={s.label}
          aria-label={`Source ${i + 1}: ${s.label}`}
          className="pointer-events-auto mr-1 underline decoration-bar-amber/40 hover:text-bar-amber"
        >
          [{i + 1}]
        </a>
      ))}
      <span className="ml-1">· checked {FACTS_CHECKED}</span>
    </p>
  )
}

// Full list with labels, for places with room (the bottle card).
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <div className="text-xs text-bar-cream/50">
      <p className="uppercase tracking-widest">Sources · checked {FACTS_CHECKED}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-bar-amber/40 hover:text-bar-amber">
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
