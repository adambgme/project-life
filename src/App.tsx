import { useMemo, useState } from 'react'
import { BirthDateForm } from './components/BirthDateForm'
import { LifeGrid } from './components/LifeGrid'
import { ViewToggle } from './components/ViewToggle'
import { YourDetails } from './components/YourDetails'
import { BOXES_PER_YEAR, boxIndex, calendarDateIn, type View } from './life/lifeMaths'
import { chanceOfReaching, outlook, suggestedGridYears } from './life/mortality'
import { MIN_GRID_YEARS, newProfile } from './life/store'
import { useLife } from './life/useLife'
import { useMortality } from './life/useMortality'
import { readView, writeView } from './life/viewParam'

/** A made-up life shown on a first visit, so the grid isn't empty. Never saved. */
const EXAMPLE = { name: 'Sam', profile: newProfile({ year: 1990, month: 3, day: 4 }) }

const UNIT: Record<View, string> = { weeks: 'weeks', months: 'months', years: 'years' }

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function App() {
  const today = useMemo(() => calendarDateIn(new Date(), viewerTimeZone), [])
  const { life, setLife, storageAvailable } = useLife(today)
  const [view, setView] = useState(() => readView(window.location.search))
  const isExample = !life.profile
  const profile = life.profile ?? EXAMPLE.profile
  const birthDate = profile.birthDate
  const { data: mortality, status: mortalityStatus } = useMortality(profile.nation)
  const personal = useMemo(
    () => outlook(mortality, birthDate, today, { sex: profile.sex, basis: profile.basis }),
    [mortality, birthDate, today, profile.sex, profile.basis],
  )
  const suggestedYears = suggestedGridYears(personal)
  // A hand-set length the person has since outlived falls back to the figures.
  const gridYears = profile.gridYears !== null && profile.gridYears > personal.fromAge ? profile.gridYears : suggestedYears
  const lived = Math.max(0, boxIndex(view, birthDate, today))
  const total = (gridYears * BOXES_PER_YEAR[view]).toLocaleString('en-GB')

  function changeView(next: View) {
    setView(next)
    writeView(next)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
        <div>
          <p className="font-display text-xs tracking-[0.2em] text-ink-soft uppercase">
            A life in {UNIT[view]}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Your Life</h1>
        </div>
        <ViewToggle view={view} onChange={changeView} />
      </header>

      {!storageAvailable && (
        <p role="status" className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm">
          This browser isn't letting the page save anything, so your date will be forgotten when you leave.
        </p>
      )}

      <main className="flex flex-col gap-6">
        <BirthDateForm
          birthDate={life.profile?.birthDate ?? null}
          today={today}
          onChange={(date) =>
            setLife({ ...life, profile: date ? { ...(life.profile ?? newProfile(date)), birthDate: date } : null })
          }
        />
        {life.profile && (
          <YourDetails
            profile={life.profile}
            suggestedYears={suggestedYears}
            gridYears={gridYears}
            minYears={Math.max(MIN_GRID_YEARS, personal.fromAge + 1)}
            tablesStatus={mortalityStatus}
            lifeExpectancy={personal.lifeExpectancy}
            chanceAtEnd={chanceOfReaching(personal, gridYears)}
            source={mortality.source}
            onChange={(next) => setLife({ ...life, profile: next })}
          />
        )}
        <div className="flex flex-col gap-1">
          {isExample && (
            <p className="font-display text-sm tracking-[0.12em] text-today uppercase" data-testid="example">
              An example: {EXAMPLE.name}'s life
            </p>
          )}
          <p className="font-display text-xl" aria-live="polite" data-testid="summary">
            {isExample ? `${EXAMPLE.name} has` : "You've"} lived{' '}
            <strong className="font-semibold">{lived.toLocaleString('en-GB')}</strong> {UNIT[view]}
            <span className="text-ink-soft">, of the {total} on a {gridYears}-year grid.</span>
          </p>
          {isExample && (
            <p className="text-sm text-ink-soft">Enter your date of birth above to see your own. Nothing is saved until you do.</p>
          )}
        </div>
        <div className="flex justify-center">
          <LifeGrid view={view} birthDate={birthDate} today={today} years={gridYears} />
        </div>
      </main>

      <footer className="mt-auto border-t border-rule pt-4 text-sm text-ink-soft">
        <p>Everything you enter stays in this browser.</p>
        <p>
          Based on <a className="underline" href="https://github.com/bryanbraun/your-life">Your Life</a> by Bryan
          Braun and Tim Urban's{' '}
          <a className="underline" href="https://waitbutwhy.com/2014/05/life-weeks.html">
            Your Life in Weeks
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
