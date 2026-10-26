import { useMemo } from 'react'
import { BirthDateForm } from './components/BirthDateForm'
import { WeeksGrid } from './components/WeeksGrid'
import { calendarDateIn, weekIndex } from './life/lifeMaths'
import { useLife } from './life/useLife'

/** Years shown on the grid until the life expectancy engine sets a default (T3). */
const GRID_YEARS = 90

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function App() {
  const today = useMemo(() => calendarDateIn(new Date(), viewerTimeZone), [])
  const { life, setLife, storageAvailable } = useLife(today)
  const birthDate = life.profile?.birthDate ?? null
  const weeksLived = birthDate ? Math.max(0, weekIndex(birthDate, today)) : null

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <header className="border-b border-ink pb-4">
        <p className="font-display text-xs tracking-[0.2em] text-ink-soft uppercase">A life in weeks</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Your Life</h1>
      </header>

      {!storageAvailable && (
        <p role="status" className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm">
          This browser isn't letting the page save anything, so your date will be forgotten when you leave.
        </p>
      )}

      <main className="flex flex-col gap-6">
        <BirthDateForm
          birthDate={birthDate}
          today={today}
          onChange={(date) => setLife({ ...life, profile: date ? { birthDate: date } : null })}
        />
        <p className="font-display text-xl" aria-live="polite" data-testid="summary">
          {weeksLived !== null ? (
            <>
              You've lived <strong className="font-semibold">{weeksLived.toLocaleString('en-GB')}</strong> weeks.
            </>
          ) : (
            'Enter your date of birth to fill in the weeks you have lived.'
          )}
        </p>
        <WeeksGrid birthDate={birthDate} today={today} years={GRID_YEARS} />
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
