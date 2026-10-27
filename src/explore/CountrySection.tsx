import { useEffect, useMemo, useState } from 'react'
import { chanceWords } from '../life/gridChances'
import { COUNTRIES, countryName, loadCountry } from '../life/countries'
import type { CalendarDate } from '../life/lifeMaths'
import { chanceOfReaching, outlook, type MortalityData, type OutlookOptions } from '../life/mortality'

const UK = 'gbr'
const percent = (p: number) => `${Math.round(p * 100)}%`

type Props = { birthDate: CalendarDate; today: CalendarDate; options: OutlookOptions; who: string }

/** "If you lived in…": the outlook for people like you living in another country, beside the UK's, both on the UN's
 * figures so that like is compared with like. A country's tables load from this site only once it's picked. */
export function CountrySection({ birthDate, today, options, who }: Props) {
  const [chosen, setChosen] = useState('')
  const [tables, setTables] = useState<Record<string, MortalityData | 'failed'>>({})
  useEffect(() => {
    for (const code of chosen ? [UK, chosen] : []) {
      if (tables[code]) continue
      loadCountry(code)
        .then((data) => setTables((t) => ({ ...t, [code]: data })))
        .catch(() => setTables((t) => ({ ...t, [code]: 'failed' })))
    }
  }, [chosen, tables])

  const columns = chosen === UK ? [UK] : [UK, chosen]
  const ready = chosen !== '' && columns.every((code) => tables[code] && tables[code] !== 'failed')
  const failed = chosen !== '' && columns.some((code) => tables[code] === 'failed')
  const outlooks = useMemo(
    () => (ready ? columns.map((code) => outlook(tables[code] as MortalityData, birthDate, today, options)) : []),
    [ready, chosen, tables, birthDate, today, options.sex, options.basis],
  )
  const reach = [70, 80, 90].filter((age) => age > (outlooks[0]?.fromAge ?? 0))
  const source = Object.values(tables).find((t) => t !== 'failed')?.source

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 self-start text-sm text-ink-soft">
        Country of residence
        <select
          className="max-w-full rounded-sm border border-rule bg-paper px-2 py-1.5 text-base text-ink"
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
        >
          <option value="">Choose a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {chosen !== '' && !ready && !failed && <p className="text-sm text-ink-soft">Loading the figures for {countryName(chosen)}…</p>}
      {failed && (
        <p role="status" className="text-sm">
          The figures for {countryName(chosen)} couldn't be loaded. Try again when you're online.
        </p>
      )}
      {ready && (
        <table className="w-full max-w-lg text-left" data-testid="country-compare">
          <caption className="sr-only">
            {who} living in {columns.map((code) => countryName(code)).join(' and in ')}, on the UN's figures
          </caption>
          <thead>
            <tr className="border-b border-rule text-sm text-ink-soft">
              <th className="py-1 font-normal">
                <span className="sr-only">Measure</span>
              </th>
              {columns.map((code) => (
                <th key={code} scope="col" className="py-1 pr-3 font-normal">
                  Living in {countryName(code)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule/60">
              <th scope="row" className="py-1.5 pr-3 font-normal">Average age at death</th>
              {outlooks.map((o, i) => (
                <td key={columns[i]} className="py-1.5 pr-3 font-semibold tabular-nums">
                  {o.lifeExpectancy.toFixed(1)}
                </td>
              ))}
            </tr>
            {reach.map((age) => (
              <tr key={age} className="border-b border-rule/60">
                <th scope="row" className="py-1.5 pr-3 font-normal">Chance of reaching {age}</th>
                {outlooks.map((o, i) => (
                  <td key={columns[i]} className="py-1.5 pr-3">
                    {chanceWords(chanceOfReaching(o, age))}{' '}
                    <span className="text-ink-soft tabular-nums">({percent(chanceOfReaching(o, age))})</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-ink-soft">
        These figures are about where people live, not their nationality or ancestry. Both columns use the UN's medium
        projection, which differs a little from ONS's for the UK.
        {source && (
          <>
            {' '}
            {source.attribution},{' '}
            <a className="underline" href={source.licence}>
              CC BY 3.0 IGO
            </a>
            .
          </>
        )}
      </p>
    </div>
  )
}
