import { useEffect, useMemo, useState } from 'react'
import type { CalendarDate } from '../life/lifeMaths'
import { chanceWords } from '../life/gridChances'
import { ageAtChance, chanceOfReaching, deathRate, outlook, type Basis, type MortalityData } from '../life/mortality'
import { NATIONS, type Nation, type Profile } from '../life/store'
import { loadNation, useMortality } from '../life/useMortality'
import { CausesSection } from './CausesSection'
import { CountrySection } from './CountrySection'
import { DeprivationSection } from './DeprivationSection'
import { DotRows } from './DotRows'
import { LineChart, type Point } from './LineChart'

const NATION_NAMES: Record<Nation, string> = {
  uk: 'United Kingdom',
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
}

type Props = { profile: Profile; today: CalendarDate; isExample: boolean; onProfile: (profile: Profile) => void }

const percent = (p: number) => `${Math.round(p * 100)}%`
/** "1 in 920" → rounded to 2 significant figures: "1 in 920"; tiny or certain risks in words. */
export function oneIn(q: number): string {
  if (q <= 0) return 'almost none'
  const n = Number((1 / q).toPrecision(2))
  return n <= 1 ? 'almost certain' : `1 in ${n.toLocaleString('en-GB')}`
}

/** The Explore page: the whole statistical picture for people like you, gently, with every source shown. */
export function ExplorePage({ profile, today, isExample, onProfile }: Props) {
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

  const who = isExample ? 'people like Sam' : 'people like you'
  const sexWords = profile.sex === 'both' ? 'both sexes averaged' : `${profile.sex}s`
  const section = 'flex flex-col gap-3 border-t border-rule pt-5'
  const h2 = 'font-display text-2xl'
  const source = `${data.source.attribution}. ${data.source.edition} life tables, released ${new Date(data.source.released).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-2 border-b border-ink pb-4">
        <a href="./" className="text-sm text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink">
          ← Back to the grid
        </a>
        <p className="font-display text-xs tracking-[0.2em] text-ink-soft uppercase">Explore the figures</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight">How long people live</h1>
      </header>

      <main className="flex flex-col gap-8">
        {isExample && (
          <p className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm" data-testid="example">
            These are the figures for Sam, the made-up example. Enter your date of birth on the grid page to see yours.
          </p>
        )}
        <p className="border-l-2 border-accent bg-paper-deep px-3 py-2" data-testid="wellbeing">
          These are averages for large groups of people. They can't say what will happen to any one person, and your
          own health and circumstances matter far more. If any of this feels heavy, it's fine to close it. If you'd like
          to talk to someone, Samaritans are there any time on <a className="underline" href="tel:116123">116 123</a>.
        </p>

        <p className="text-sm text-ink-soft">
          Figures for {who}: born {profile.birthDate.year}, {sexWords}, living in {NATION_NAMES[shownNation]}, aged{' '}
          {from} today.
        </p>
        {status !== 'ready' && (
          <p role="status" className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm">
            {status === 'loading'
              ? `Loading the figures for ${NATION_NAMES[profile.nation]}; these are the UK's meanwhile.`
              : `The figures for ${NATION_NAMES[profile.nation]} couldn't be loaded, so these are the UK's. Try reloading the page.`}
          </p>
        )}

        {!isExample && (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm text-ink-soft">Which death rates</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {(
                [
                  ['cohort', 'Projected (cohort)'],
                  ['period', "This year's (period)"],
                ] as [Basis, string][]
              ).map(([basis, text]) => (
                <label key={basis} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="explore-basis"
                    checked={profile.basis === basis}
                    onChange={() => onProfile({ ...profile, basis })}
                    className="accent-accent"
                  />
                  {text}
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-soft">
              {profile.basis === 'cohort'
                ? 'Cohort figures assume death rates keep improving as ONS projects.'
                : "Period figures assume this year's death rates never change: the usual headline figure, but not a real forecast for anyone."}
            </p>
          </fieldset>
        )}

        <section className={section} aria-labelledby="survival-title">
          <h2 id="survival-title" className={h2}>
            Your survival curve
          </h2>
          <p>
            Of 100 {who} alive at {from} today, how many are still alive at each later age. On average they live to about{' '}
            <strong className="font-semibold">{Math.round(principal.lifeExpectancy)}</strong>. The shaded band runs from
            ONS's low to its high projection.
          </p>
          <LineChart
            points={survival}
            summary={`Survival curve for ${who}: falls from 100% at ${from} to ${percent(chanceOfReaching(principal, from + 10))} at ${from + 10}.`}
            yDomain={[0, 1]}
            yTicks={[0, 0.25, 0.5, 0.75, 1]}
            formatY={percent}
            xTicks={ticks}
            xLabel="Age"
            marks={[
              { x: Math.round(ageAtChance(principal, 0.5)), label: '1 in 2' },
              { x: Math.round(ageAtChance(principal, 0.1)), label: '1 in 10' },
            ]}
            describe={(p) => ({
              value: `${percent(p.y)} alive at ${p.x}`,
              detail: p.lo !== undefined ? `${percent(p.lo)}–${percent(p.hi!)} across ONS projections` : undefined,
            })}
            table={{ xHeader: 'Age', yHeader: 'Still alive', every: 5 }}
          />
          <p className="text-xs text-ink-soft">{source}</p>
        </section>

        <section className={section} aria-labelledby="reach-title">
          <h2 id="reach-title" className={h2}>
            Chance of reaching each age
          </h2>
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

        <section className={section} aria-labelledby="risk-title">
          <h2 id="risk-title" className={h2}>
            Yearly risk, from here on
          </h2>
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
          <h2 id="causes-title" className={h2}>
            What people your age most often die of
          </h2>
          <p className="text-sm text-ink-soft">
            At younger ages deaths are rare and often sudden; later on, long illnesses take over. Choose an age to see how
            it changes.
          </p>
          <CausesSection age={from} sex={profile.sex} outsideEnglandWales={profile.nation === 'scotland' || profile.nation === 'northern-ireland'} />
        </section>

        <section className={section} aria-labelledby="nations-title">
          <h2 id="nations-title" className={h2}>
            Across the UK
          </h2>
          <p>Average age at death for {who}, by where in the UK they live.</p>
          {nations === null ? (
            <p className="text-sm text-ink-soft">Loading the four nations' figures…</p>
          ) : nations.length === 0 ? (
            <p role="status" className="text-sm">The nations' figures couldn't be loaded. Try reloading the page.</p>
          ) : (
            <DotRows
              label="Average age at death by nation"
              testId="nations"
              rows={[...nations]
                .sort((a, b) => b.expectancy - a.expectancy)
                .map(({ nation, expectancy }) => ({
                  key: nation,
                  label: NATION_NAMES[nation],
                  value: expectancy,
                  chosen: nation === profile.nation,
                  chosenWords: 'where you live',
                }))}
            />
          )}
          <p className="text-xs text-ink-soft">{source}</p>
        </section>

        <section className={section} aria-labelledby="deprivation-title">
          <h2 id="deprivation-title" className={h2}>
            Rich and poor neighbourhoods
          </h2>
          <DeprivationSection nation={profile.nation} sex={profile.sex} age={from} who={who} />
        </section>

        <section className={section} aria-labelledby="country-title">
          <h2 id="country-title" className={h2}>
            If you lived in another country
          </h2>
          <p>How the outlook for {who} would compare if they lived somewhere else.</p>
          <CountrySection birthDate={profile.birthDate} today={today} options={options} who={who} />
        </section>
      </main>
    </div>
  )
}
