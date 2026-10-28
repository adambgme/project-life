import { DotRows, type DotRow } from './DotRows'

export type PlaceGroup = { key: string; title: string; label: string; rows: DotRow[] }

/** A scale for every group: whole five-year steps around all the values, so no gap looks bigger than it is. */
export function sharedDomain(groups: PlaceGroup[]): [number, number] {
  const values = groups.flatMap((g) => g.rows.map((r) => r.value))
  return [Math.floor(Math.min(...values) / 5) * 5, Math.ceil(Math.max(...values) / 5) * 5]
}

/** "Same birth year, different place": every group's dots on one age axis, so the size of each difference can be
 * compared at a glance (a two-year gap looks like two years wherever it is). Rows come up one at a time as the strip
 * scrolls into view (styles.css, [data-strip]). */
export function PlaceStrip({ groups }: { groups: PlaceGroup[] }) {
  const shown = groups.filter((g) => g.rows.length > 0)
  if (shown.length === 0) return null
  const domain = sharedDomain(shown)
  const ticks = Array.from({ length: (domain[1] - domain[0]) / 5 + 1 }, (_, i) => domain[0] + i * 5)
  const at = (v: number) => `${((v - domain[0]) / (domain[1] - domain[0])) * 100}%`
  return (
    <div className="flex flex-col gap-5" data-strip>
      {shown.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <h4 className="font-display text-sm tracking-[0.08em] text-ink-soft uppercase">{group.title}</h4>
          <DotRows rows={group.rows} label={group.label} testId={group.key} domain={domain} />
        </div>
      ))}
      <div aria-hidden className="grid grid-cols-[9rem_1fr] gap-3 text-xs text-ink-soft tabular-nums">
        <span className="text-right">Average age at death</span>
        <span className="relative mr-10 h-4 border-t border-ink-soft">
          {ticks.map((t) => (
            <span key={t} className="absolute top-1 -translate-x-1/2" style={{ left: at(t) }}>
              {t}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}
