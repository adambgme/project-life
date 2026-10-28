import { useEffect, useMemo, useState } from 'react'
import { chanceWords } from '../life/gridChances'
import { COUNTRIES, countryName, loadCountry } from '../life/countries'
import type { CalendarDate } from '../life/lifeMaths'
import { chanceOfReaching, outlook, type MortalityData, type OutlookOptions } from '../life/mortality'
import { LineChart, type Point } from './LineChart'

/** The UK's code in the UN's tables (ISO 3166-1 alpha-3). */
const UK_CODE = 'gbr'
const percent = (p: number) => `${Math.round(p * 100)}%`

type Load = MortalityData | 'loading' | 'failed'

/** The UK and a chosen country (ISO alpha-3, '' for none), both on the UN's figures so that like is compared with like.
 * A country's tables load from this site only once it's picked. */
export function useCountryCompare(chosen: string, birthDate: CalendarDate, today: CalendarDate, options: OutlookOptions) {
  const [tables, setTables] = useState<Record<string, Load>>({})
  const columns = chosen === '' ? [] : chosen === UK_CODE ? [UK_CODE] : [UK_CODE, chosen]
  useEffect(() => {
    for (const code of columns) {
      if (tables[code]) continue
      setTables((t) => ({ ...t, [code]: 'loading' }))
      loadCountry(code)
        .then((data) => setTables((t) => ({ ...t, [code]: data })))
        .catch(() => setTables((t) => ({ ...t, [code]: 'failed' })))
    }
  }, [chosen, tables])

  const loaded = columns.map((code) => tables[code]).filter((t): t is MortalityData => typeof t === 'object')
  const ready = columns.length > 0 && loaded.length === columns.length
  const failed = columns.filter((code) => tables[code] === 'failed')
  const outlooks = useMemo(
    () => (ready ? loaded.map((data) => outlook(data, birthDate, today, options)) : []),
    [ready, chosen, tables, birthDate, today, options.sex, options.basis],
  )
  const names = columns.map((code) => countryName(code)!)

  function retry() {
    setTables((t) => Object.fromEntries(Object.entries(t).filter(([, load]) => load !== 'failed')))
  }

  return { chosen, columns, loaded, ready, failed, outlooks, names, retry }
}

export type CountryCompare = ReturnType<typeof useCountryCompare>

/** The country picker: every country in the UN's tables. */
export function CountryPicker({ chosen, onChoose }: { chosen: string; onChoose: (code: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-soft">
      Country of residence
      <select
        className="max-w-full rounded-sm border border-rule bg-paper px-2 py-1.5 text-base text-ink"
        value={chosen}
        onChange={(e) => onChoose(e.target.value)}
      >
        <option value="">Choose a country</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}

/** "If you lived in…": the survival curves and a table for people like you living in the UK and in the chosen country. */
export function CountrySection({ compare, today, options, who }: { compare: CountryCompare; today: CalendarDate; options: OutlookOptions; who: string }) {
  const { chosen, columns, loaded, ready, failed, outlooks, names, retry } = compare
  const from = outlooks[0]?.fromAge ?? 0
  const reach = [70, 80, 90].filter((age) => age > from)
  const lastAge = Math.max(105, from + 10)
  const curve = (i: number): Point[] =>
    Array.from({ length: lastAge - from + 1 }, (_, k) => ({ x: from + k, y: chanceOfReaching(outlooks[i]!, from + k) }))
  const source = loaded[0]?.source

  return (
    <div className="flex flex-col gap-4">
      {columns.length > 0 && !ready && failed.length === 0 && (
        <p className="text-sm text-ink-soft">Loading the figures for {countryName(chosen)}…</p>
      )}
      {failed.length > 0 && (
        <p role="status" className="text-sm">
          The figures for {failed.map((code) => countryName(code)).join(' and ')} couldn't be loaded.{' '}
          <button type="button" className="underline decoration-rule underline-offset-4 hover:text-ink" onClick={retry}>
            Try again
          </button>
        </p>
      )}
      {ready && (
        <>
          <LineChart
            label={`Living in ${names[0]}`}
            points={curve(0)}
            compare={outlooks.length > 1 ? { label: `Living in ${names[1]}`, points: curve(1) } : undefined}
            summary={`Survival curves for ${who}: ${names
              .map((name, i) => `living in ${name}, ${percent(chanceOfReaching(outlooks[i]!, 80))} reach 80`)
              .join('; ')}.`}
            yDomain={[0, 1]}
            yTicks={[0, 0.25, 0.5, 0.75, 1]}
            formatY={percent}
            xTicks={[from, 50, 60, 70, 80, 90, 100].filter((t, i) => i === 0 || (t > from + 4 && t <= lastAge))}
            xLabel="Age"
            describe={(p) => ({ value: `${percent(p.y)} alive at ${p.x}` })}
            table={{ xHeader: 'Age', yHeader: 'Still alive', every: 5 }}
          />
          <table className="w-full max-w-lg text-left" data-testid="country-compare">
            <caption className="sr-only">
              {who} living in {names.join(' and in ')}, on the UN's figures
            </caption>
            <thead>
              <tr className="border-b border-rule text-sm text-ink-soft">
                <th className="py-1 font-normal">
                  <span className="sr-only">Measure</span>
                </th>
                {names.map((name) => (
                  <th key={name} scope="col" className="py-1 pr-3 font-normal">
                    Living in {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-rule/60">
                <th scope="row" className="py-1.5 pr-3 font-normal">
                  Average age at death
                </th>
                {outlooks.map((o, i) => (
                  <td key={columns[i]} className="py-1.5 pr-3 font-semibold tabular-nums">
                    {o.lifeExpectancy.toFixed(1)}
                  </td>
                ))}
              </tr>
              {reach.map((age) => (
                <tr key={age} className="border-b border-rule/60">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    Chance of reaching {age}
                  </th>
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
        </>
      )}
      <p className="text-xs text-ink-soft">
        These figures are about where people live, not their nationality or ancestry. Both use the UN's medium projection
        of death rates for {loaded[0] ? `${loaded[0].firstYear} to ${loaded[0].lastYear}` : '2024 to 2100'},{' '}
        {options.basis === 'cohort'
          ? 'following the rates projected for each year of your life'
          : `holding ${today.year}'s rates fixed`}
        , and differ a little from ONS's figures for the UK.
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
