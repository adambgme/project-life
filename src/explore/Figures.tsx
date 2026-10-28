import { useEffect, useMemo, useState } from 'react'
import type { CalendarDate } from '../life/lifeMaths'
import { chanceWords } from '../life/gridChances'
import { chanceOfReaching, deathRate, outlook, type MortalityData } from '../life/mortality'
import { NATION_NAMES, NATIONS, type Nation, type Profile } from '../life/store'
import { deprivationOutlook } from '../life/deprivation'
import { loadNation, useMortality } from '../life/useMortality'
import { CausesSection } from './CausesSection'
import { CountryPicker, CountrySection, useCountryCompare } from './CountrySection'
import { AreaPicker, DeprivationSection, groupName } from './DeprivationSection'
import { PlaceStrip, type PlaceGroup } from './PlaceStrip'
import { longDate } from './format'
import { LineChart, type Point } from './LineChart'
import { OddsChapter } from './OddsChapter'
import { oddsSteps } from './oddsSteps'

type Props = { profile: Profile; today: CalendarDate; isExample: boolean }

const percent = (p: number) => `${Math.round(p * 100)}%`
/** "1 in 920" → rounded to 2 significant figures: "1 in 920"; tiny or certain risks in words. */
export function oneIn(q: number): string {
  if (q <= 0) return 'almost none'
  const n = Number((1 / q).toPrecision(2))
  return n <= 1 ? 'almost certain' : `1 in ${n.toLocaleString('en-GB')}`
}

/** "Your figures", below the grid: the whole statistical picture for people like you, gently, with every source
 * shown. The choices behind it (sex, nation, cohort or period) are in Settings. */
export function Figures({ profile, today, isExample }: Props) {
  const { data, status } = useMortality(profile.nation)
  // Until a nation's tables arrive (or if they can't), the figures are the UK's: say so, never label them otherwise.
  const shownNation: Nation = status === 'ready' ? profile.nation : 'uk'
  const options = { sex: profile.sex, basis: profile.basis }
  const [principal, low, high] = useMemo(
    () =>
      (['principal', 'low', 'high'] as const).map((variant) =>
        outlook(data, profile.birthDate, today, { ...options, variant }),
      ),
    [data, profile.birthDate, today, profile.sex, profile.basis],
  ) as [ReturnType<typeof outlook>, ReturnType<typeof outlook>, ReturnType<typeof outlook>]
  const from = principal.fromAge
  // Run each chart a little past today's age, however old (the model continues past the tables' last age, 100).
  const lastAge = Math.max(105, from + 10)
  const lastRiskAge = Math.max(100, from + 10)
  const ticks = [from, 50, 60, 70, 80, 90, 100, 110, 120].filter((t, i) => i === 0 || (t > from + 4 && t <= lastAge))

  const survival: Point[] = []
  for (let age = from; age <= lastAge; age++) {
    survival.push({ x: age, y: chanceOfReaching(principal, age), lo: chanceOfReaching(low, age), hi: chanceOfReaching(high, age) })
  }
  const deathRates: Point[] = []
  for (let age = from; age <= lastRiskAge; age++) {
    const year = profile.basis === 'cohort' ? profile.birthDate.year + age : today.year
    deathRates.push({ x: age, y: deathRate(data, profile.sex, 'principal', year, age) })
  }
  const reach = [70, 75, 80, 85, 90, 95, 100].filter((age) => age > from)

  const [nations, setNations] = useState<{ nation: Nation; expectancy: number }[] | null>(null)
  useEffect(() => {
    let current = true
    void Promise.all(
      NATIONS.map(async (nation) => {
        const tables: MortalityData = await loadNation(nation)
        return { nation, expectancy: outlook(tables, profile.birthDate, today, { sex: profile.sex, basis: profile.basis }).lifeExpectancy }
      }),
    )
      .then((rows) => current && setNations(rows))
      .catch(() => current && setNations([]))
    return () => {
      current = false
    }
  }, [profile.birthDate, profile.sex, profile.basis, today])

  // Same birth year, different place: the nations (above), neighbourhoods and another country, on one scale.
  const deprivation = deprivationOutlook(profile.nation, profile.sex, from)
  const [mine, setMine] = useState<number | null>(null)
  const myArea = mine !== null && mine <= deprivation.groups.length ? mine : null
  const [country, setCountry] = useState('')
  const compare = useCountryCompare(country, profile.birthDate, today, options)

  const who = isExample ? 'people like Sam' : 'people like you'
  const sexWords = profile.sex === 'both' ? 'both sexes averaged' : `${profile.sex}s`
  const section = 'flex flex-col gap-3 border-t border-rule pt-5'
  const h3 = 'font-display text-2xl'
  const source = `${data.source.attribution}. ${data.source.edition} life tables, released ${longDate(data.source.released)}.`

  const places: PlaceGroup[] = [
    {
      key: 'nations',
      title: 'Across the UK (ONS)',
      label: 'Average age at death by nation',
      rows: [...(nations ?? [])]
        .sort((a, b) => b.expectancy - a.expectancy)
        .map(({ nation, expectancy }) => ({
          key: nation,
          label: NATION_NAMES[nation],
          value: expectancy,
          chosen: nation === profile.nation,
          chosenWords: 'where you live',
        })),
    },
    {
      key: 'deprivation',
      title: `Neighbourhoods in ${deprivation.area}, ${deprivation.period} (ONS)`,
      label: `Average age at death for ${who} by area deprivation, ${deprivation.area}`,
      rows: deprivation.groups.map((g) => ({
        key: String(g.group),
        label: groupName(deprivation, g.group, true),
        value: g.ageAtDeath,
        chosen: g.group === myArea,
        chosenWords: 'your area',
      })),
    },
    {
      key: 'countries',
      title: 'Other countries (UN)',
      label: 'Average age at death by country of residence, on the UN figures',
      rows: compare.ready
        ? compare.outlooks.map((o, i) => ({
            key: compare.columns[i]!,
            label: compare.names[i]!,
            value: o.lifeExpectancy,
            chosen: i > 0,
            chosenWords: 'the country you chose',
          }))
        : [],
    },
  ]
  const spread = (group: PlaceGroup) => {
    const values = group.rows.map((r) => r.value)
    return values.length > 1 ? Math.max(...values) - Math.min(...values) : 0
  }
  const [nationGap, areaGap] = [spread(places[0]!), spread(places[1]!)]
  const gap =
    nationGap > 0 && areaGap > 0
      ? areaGap > nationGap
        ? `The widest gap is between neighbourhoods: ${areaGap.toFixed(1)} years from the most to the least deprived ${deprivation.unit}, against ${nationGap.toFixed(1)} across the UK's nations.`
        : `The widest gap is across the UK's nations: ${nationGap.toFixed(1)} years, against ${areaGap.toFixed(1)} between the most and least deprived neighbourhoods.`
      : null

  return (
    <section id="figures" aria-labelledby="figures-title" className="flex max-w-3xl scroll-mt-4 flex-col gap-8 border-t border-ink pt-6 print:hidden">
      <header className="flex flex-col gap-2">
        <p className="font-display text-xs tracking-[0.2em] text-ink-soft uppercase">How long people live</p>
        <h2 id="figures-title" className="font-display text-4xl font-semibold tracking-tight">
          {isExample ? "Sam's figures" : 'Your figures'}
        </h2>
      </header>

      <div className="flex flex-col gap-8">
        {isExample && (
          <p className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm" data-testid="example-figures">
            These are the figures for Sam, the made-up example. Enter your date of birth above to see yours.
          </p>
        )}
        <p className="border-l-2 border-accent bg-paper-deep px-3 py-2" data-testid="wellbeing">
          These are averages for large groups of people. They can't say what will happen to any one person, and your
          own health and circumstances matter far more. If any of this feels heavy, it's fine to skip it. If you'd like
          to talk to someone, Samaritans are there any time on <a className="underline" href="tel:116123">116 123</a>.
        </p>

        <p className="text-sm text-ink-soft">
          Figures for {who}: born {profile.birthDate.year}, {sexWords}, living in {NATION_NAMES[shownNation]}, aged{' '}
          {from} today, using {profile.basis === 'cohort' ? 'projected (cohort)' : "this year's (period)"} death rates.
          {!isExample && 'Change these in Settings.'}
        </p>

        <section className={section} aria-labelledby="survival-title" data-reveal>
          <h3 id="survival-title" className={h3}>
            {isExample ? "Sam's odds, step by step" : 'Your odds, step by step'}
          </h3>
          <p>
            Of 100 {who} alive at {from} today, how many are still alive at each later age. On average they live to about{' '}
            <strong className="font-semibold">{Math.round(principal.lifeExpectancy)}</strong>. The shaded band runs from
            ONS's low to its high projection.
          </p>
          <OddsChapter
            steps={oddsSteps(principal, who)}
            chart={({ highlight, marks }) => (
              <LineChart
                points={survival}
                summary={`Survival curve for ${who}: falls from 100% at ${from} to ${percent(chanceOfReaching(principal, from + 10))} at ${from + 10}.`}
                yDomain={[0, 1]}
                yTicks={[0, 0.25, 0.5, 0.75, 1]}
                formatY={percent}
                xTicks={ticks}
                xLabel="Age"
                marks={marks?.map((step) => ({ x: step.age, label: step.short }))}
                highlight={highlight && { x: highlight.age, label: highlight.label }}
                describe={(p) => ({
                  value: `${percent(p.y)} alive at ${p.x}`,
                  detail: p.lo !== undefined ? `${percent(p.lo)}–${percent(p.hi!)} across ONS projections` : undefined,
                })}
                table={{ xHeader: 'Age', yHeader: 'Still alive', every: 5 }}
              />
            )}
          />
          <p className="text-xs text-ink-soft">{source}</p>
        </section>

        <section className={section} aria-labelledby="reach-title" data-reveal>
          <h3 id="reach-title" className={h3}>
            Chance of reaching each age
          </h3>
          {reach.length === 0 && <p>You've already reached every age on this list.</p>}
          <table className={`w-full max-w-md text-left ${reach.length ? '' : 'hidden'}`} data-testid="reach-table">
            <thead>
              <tr className="border-b border-rule text-sm text-ink-soft">
                <th className="py-1 font-normal">Age</th>
                <th className="py-1 font-normal">Chance for {who}</th>
              </tr>
            </thead>
            <tbody>
              {reach.map((age) => {
                const p = chanceOfReaching(principal, age)
                return (
                  <tr key={age} className="border-b border-rule/60">
                    <td className="py-1.5 tabular-nums">{age}</td>
                    <td className="py-1.5">
                      {chanceWords(p)} <span className="text-ink-soft tabular-nums">({percent(p)})</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-ink-soft">{source}</p>
        </section>

        <section className={section} aria-labelledby="risk-title" data-reveal>
          <h3 id="risk-title" className={h3}>
            Yearly risk, from here on
          </h3>
          <p>
            The chance of dying within the year at each age. It's low for decades and then rises steeply, roughly
            doubling every eight years in later life, so the scale goes up in steps of ten.
          </p>
          <LineChart
            points={deathRates}
            summary={`Yearly risk of dying for ${who}: ${oneIn(deathRates[0]!.y)} at ${from}, rising to ${oneIn(deathRates[deathRates.length - 1]!.y)} at ${lastRiskAge}.`}
            yScale="log"
            yDomain={[0.0002, 0.5]}
            yTicks={[0.001, 0.01, 0.1]}
            formatY={oneIn}
            xTicks={ticks.filter((t) => t <= lastRiskAge)}
            xLabel="Age"
            describe={(p) => ({ value: `${oneIn(p.y)} at ${p.x}`, detail: 'chance of dying within the year' })}
            table={{ xHeader: 'Age', yHeader: 'Yearly risk', every: 5 }}
          />
          <p className="text-xs text-ink-soft">{source}</p>
        </section>

        <section className={section} aria-labelledby="causes-title">
          <h3 id="causes-title" className={h3}>
            What people {isExample ? "Sam's" : 'your'} age most often die of
          </h3>
          <p className="text-sm text-ink-soft">
            At younger ages deaths are rare and often sudden; later on, long illnesses take over. Choose an age to see how
            it changes.
          </p>
          <CausesSection age={from} sex={profile.sex} outsideEnglandWales={profile.nation === 'scotland' || profile.nation === 'northern-ireland'} />
        </section>

        <section className={section} aria-labelledby="places-title" data-reveal>
          <h3 id="places-title" className={h3}>
            Same birth year, different place
          </h3>
          <p>
            The average age at death for {who}, depending on where they live: which part of the UK, how deprived the
            neighbourhood, and, if you choose one, another country. Every group sits on the same scale, so the size of each
            gap can be compared. Each group comes from its own source, so compare within a group.
          </p>
          <div className="flex flex-wrap gap-4">
            <AreaPicker outlook={deprivation} mine={myArea} onPick={setMine} />
            <CountryPicker chosen={country} onChoose={setCountry} />
          </div>
          {nations === null && <p className="text-sm text-ink-soft">Loading the four nations' figures…</p>}
          {nations?.length === 0 && (
            <p role="status" className="text-sm">The nations' figures couldn't be loaded. Try reloading the page.</p>
          )}
          <PlaceStrip groups={places} />
          {gap && <p data-testid="widest-gap">{gap}</p>}

          <h4 className="mt-4 font-display text-xl">Neighbourhoods</h4>
          <DeprivationSection outlook={deprivation} nation={profile.nation} sex={profile.sex} age={from} />

          <h4 className="mt-4 font-display text-xl">If you lived in another country</h4>
          {country === '' ? (
            <p className="text-sm text-ink-soft">Choose a country above to compare its survival curve with the UK's.</p>
          ) : (
            <CountrySection compare={compare} today={today} options={options} who={who} />
          )}
          <p className="text-xs text-ink-soft">UK nations: {source}</p>
        </section>
      </div>
    </section>
  )
}
