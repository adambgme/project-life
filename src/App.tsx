import { useMemo, useState } from 'react'
import { BirthDateForm } from './components/BirthDateForm'
import { LifeGrid } from './components/LifeGrid'
import { ViewToggle } from './components/ViewToggle'
import { Legend } from './components/Legend'
import { StoryPanel, type PanelMode } from './components/StoryPanel'
import { YourDetails } from './components/YourDetails'
import { EXAMPLE } from './life/example'
import { BOXES_PER_YEAR, boxIndex, calendarDateIn, type View } from './life/lifeMaths'
import { chanceOfReaching, outlook, suggestedGridYears } from './life/mortality'
import { emptyLife, MIN_GRID_YEARS, newProfile } from './life/store'
import { categoryColour, layoutStory, type Era, type Moment } from './life/story'
import { useLife } from './life/useLife'
import { useMortality } from './life/useMortality'
import { readView, writeView } from './life/viewParam'

const UNIT: Record<View, string> = { weeks: 'weeks', months: 'months', years: 'years' }

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function App() {
  const today = useMemo(() => calendarDateIn(new Date(), viewerTimeZone), [])
  const { life, setLife, storageAvailable } = useLife(today)
  const [view, setView] = useState(() => readView(window.location.search))
  const storyCount = life.eras.length + life.moments.length
  // A saved story with no (valid) birth date yet, e.g. while the date is being retyped: say it's kept, not Sam's life.
  const waitingForDate = !life.profile && (storyCount > 0 || Object.keys(life.colours).length > 0)
  const isExample = !life.profile && !waitingForDate
  // What the grid draws. Without a birth date (example, or waiting for one) the example drives the calculations;
  // while waiting, none of it is shown.
  const shown = life.profile ? life : EXAMPLE.life
  const profile = shown.profile!
  const [panel, setPanel] = useState<PanelMode | null>(null)
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
  const story = useMemo(
    () => layoutStory(view, birthDate, today, shown.eras, shown.moments),
    [view, birthDate, today, shown.eras, shown.moments],
  )
  const erasById = useMemo(() => new Map(shown.eras.map((e) => [e.id, e])), [shown.eras])
  const momentsById = useMemo(() => new Map(shown.moments.map((m) => [m.id, m])), [shown.moments])
  const colours = shown.colours
  const colourOf = useMemo(() => (entry: Era | Moment) => categoryColour(entry.category, colours), [colours])
  const openBox = useMemo(() => (isExample ? undefined : (index: number) => setPanel({ kind: 'box', index })), [isExample])

  function forget(): boolean {
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
    if (
      storyCount > 0 &&
      !window.confirm(
        `This deletes your date of birth and your story (${plural(life.eras.length, 'era')}, ${plural(life.moments.length, 'moment')}) from this browser. Forget everything?`,
      )
    ) {
      return false
    }
    setPanel(null)
    setLife(emptyLife)
    return true
  }

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
          canForget={!!life.profile || waitingForDate}
          onForget={forget}
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
        {waitingForDate ? (
          <p role="status" className="border-l-2 border-accent bg-paper-deep px-3 py-2" data-testid="waiting">
            Your story ({storyCount} {storyCount === 1 ? 'entry' : 'entries'}) is saved in this browser. Finish your date
            of birth to see it on the grid.
          </p>
        ) : (
        <>
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
        {!isExample && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPanel({ kind: 'list' })}
              className="rounded-sm bg-ink px-4 py-2 font-display text-paper"
            >
              Your story
            </button>
            <span className="text-sm text-ink-soft">
              {life.eras.length + life.moments.length === 0
                ? 'Tap any box to add an era or a moment there.'
                : `${life.eras.length} ${life.eras.length === 1 ? 'era' : 'eras'}, ${life.moments.length} ${life.moments.length === 1 ? 'moment' : 'moments'}. Tap a box to add or edit.`}
            </span>
          </div>
        )}
        <div className="flex justify-center">
          <LifeGrid
            view={view}
            birthDate={birthDate}
            today={today}
            years={gridYears}
            story={story}
            eras={erasById}
            moments={momentsById}
            colourOf={colourOf}
            onOpenBox={openBox}
          />
        </div>
        <Legend eras={shown.eras} moments={shown.moments} colours={colours} />
        </>
        )}
        {life.profile && (
          <StoryPanel
            mode={panel}
            life={life}
            birthDate={life.profile.birthDate}
            today={today}
            view={view}
            story={story}
            colourOf={colourOf}
            onMode={setPanel}
            onLife={setLife}
          />
        )}
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
