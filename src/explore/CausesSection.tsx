import { useEffect, useState } from 'react'
import type { Sex } from '../life/mortality'

type Band = { from: number; to: number | null }
type CausesData = {
  area: string
  source: { title: string; url: string; attribution: string; year: number }
  year: number
  bands: Band[]
  causes: { code: string; name: string }[]
  deaths: Record<'total' | 'male' | 'female', Record<string, number[]>>
  all: Record<'total' | 'male' | 'female', number[]>
}

const bandName = (b: Band) => (b.to === null ? `${b.from} and over` : b.from === b.to ? `under 1` : `${b.from} to ${b.to}`)
const SHOWN = 6

/** "What people your age most often die of": ONS leading causes for an age band, as shares of all deaths there. */
export function CausesSection({ age, sex, outsideEnglandWales }: { age: number; sex: Sex; outsideEnglandWales: boolean }) {
  const [data, setData] = useState<CausesData | null | 'failed'>(null)
  useEffect(() => {
    import('../data/causes/england-wales.json')
      .then((m) => setData(m.default as CausesData))
      .catch(() => setData('failed'))
  }, [])
  const key = sex === 'both' ? 'total' : sex
  const [chosen, setChosen] = useState<number | null>(null)

  if (data === null) return <p className="text-sm text-ink-soft">Loading the causes of death…</p>
  if (data === 'failed') return <p role="status" className="text-sm">The causes of death couldn't be loaded. Try reloading the page.</p>

  const ownBand = Math.max(0, data.bands.findIndex((b) => age >= b.from && (b.to === null || age <= b.to)))
  // Never a band you've already passed (e.g. after a birthday or a changed date).
  const band = Math.max(chosen ?? ownBand, ownBand)
  const all = data.all[key][band]!
  const ranked = data.causes
    .map((cause) => ({ ...cause, deaths: data.deaths[key][cause.code]![band]! }))
    .filter((c) => c.deaths > 0)
    .sort((a, b) => b.deaths - a.deaths)
  const top = ranked.slice(0, SHOWN)
  const max = top[0]?.deaths ?? 1
  const share = (n: number) => `${((n / all) * 100).toFixed(n / all < 0.1 ? 1 : 0)}%`
  const who = sex === 'both' ? 'people' : sex === 'male' ? 'men' : 'women'

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 self-start text-sm text-ink-soft">
        Ages
        <select
          className="rounded-sm border border-rule bg-paper px-2 py-1.5 text-base text-ink"
          value={band}
          onChange={(e) => setChosen(Number(e.target.value))}
        >
          {data.bands.map((b, i) =>
            i >= ownBand ? (
              <option key={i} value={i}>
                {bandName(b)}
                {i === ownBand ? ' (your age now)' : ''}
              </option>
            ) : null,
          )}
        </select>
      </label>
      <p>
        Of the <strong className="font-semibold">{all.toLocaleString('en-GB')}</strong> deaths of {who} aged{' '}
        {bandName(data.bands[band]!)} registered in {data.area} in {data.year}, the most common causes were:
      </p>
      <ol className="flex flex-col gap-2" data-testid="causes">
        {top.map((cause) => (
          // On phones the name goes above its bar, so the bars keep the width.
          <li key={cause.code} className="grid grid-cols-1 items-center gap-x-3 gap-y-0.5 text-sm sm:grid-cols-[minmax(8rem,14rem)_1fr]">
            <span>{cause.name}</span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-4 max-h-6 rounded-r-[4px] bg-accent"
                style={{ width: `${Math.max(2, (cause.deaths / max) * 75)}%` }}
              />
              <span className="tabular-nums">{share(cause.deaths)}</span>
            </span>
          </li>
        ))}
      </ol>
      {top.some((c) => c.code === 'LC41') && (
        <p className="text-sm" data-testid="causes-support">
          If you're struggling or having thoughts of suicide, you can talk to Samaritans any time, free, on{' '}
          <a className="underline" href="tel:116123">
            116 123
          </a>
          .
        </p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft">Show all causes at this age</summary>
        <table className="mt-2 w-full max-w-lg text-left">
          <thead>
            <tr className="border-b border-rule text-ink-soft">
              <th className="py-1 font-normal">Cause</th>
              <th className="py-1 text-right font-normal">Deaths</th>
              <th className="py-1 text-right font-normal">Share</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((cause) => (
              <tr key={cause.code} className="border-b border-rule/60">
                <td className="py-0.5">{cause.name}</td>
                <td className="py-0.5 text-right tabular-nums">{cause.deaths.toLocaleString('en-GB')}</td>
                <td className="py-0.5 text-right tabular-nums">{share(cause.deaths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="text-xs text-ink-soft">
        Shares are of all deaths at that age, using the ONS leading-causes groups (cancers and accidents split by type), so
        they don't add up to 100%.{' '}
        {outsideEnglandWales
          ? "Scotland and Northern Ireland record causes of death separately, so these figures are for England and Wales; theirs will follow. "
          : 'Scotland and Northern Ireland record causes separately; their figures will follow. '}
        {data.source.attribution}. <a className="underline" href={data.source.url}>Deaths registered, {data.year}</a>.
      </p>
    </div>
  )
}
