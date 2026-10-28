import { useEffect, useMemo, useState } from 'react'
import { BirthDateForm } from './components/BirthDateForm'
import { ImportButton } from './components/ImportButton'
import { ImportDialog, type PendingImport } from './components/ImportDialog'
import { LifeGrid } from './components/LifeGrid'
import { ViewToggle } from './components/ViewToggle'
import { Legend } from './components/Legend'
import { LifeBar } from './components/LifeBar'
import { StoryPanel, type PanelMode } from './components/StoryPanel'
import { Settings, settingsSummary } from './components/Settings'
import { EXAMPLE } from './life/example'
import { BOXES_PER_YEAR, boxIndex, calendarDateIn, type View } from './life/lifeMaths'
import { chanceOfReaching, lifeProgress, outlook, suggestedGridYears } from './life/mortality'
import { CLASSIC_GRID_YEARS, emptyLife, MIN_GRID_YEARS, NATION_NAMES, newProfile } from './life/store'
import { categoryColour, countdown, goalDate, layoutStory, weeksToGo, type Category } from './life/story'
import { useLife } from './life/useLife'
import { useMortality } from './life/useMortality'
import { boxChances, halfBox } from './life/gridChances'
import { exportFile, readLinkFragment } from './life/transfer'
import { readPage, readView, writeView } from './life/viewParam'
import { Figures } from './explore/Figures'
import { PrintShareDialog } from './share/PrintShareDialog'
import { resolveColour, type DrawInput } from './share/drawLife'

const UNIT: Record<View, string> = { weeks: 'weeks', months: 'months', years: 'years' }

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function App() {
  const today = useMemo(() => calendarDateIn(new Date(), viewerTimeZone), [])
  const { life, setLife, storageAvailable, newerSave } = useLife(today)
  const [view, setView] = useState(() => readView(window.location.search))
  // Old links to the Explore page (`?page=explore`) land on the figures, now below the grid.
  const [page] = useState(() => readPage(window.location.search))
  useEffect(() => {
    if (page === 'explore') document.getElementById('figures')?.scrollIntoView()
  }, [page])
  const storyCount = life.eras.length + life.moments.length + life.goals.length
  // A saved story with no (valid) birth date yet, e.g. while the date is being retyped: say it's kept, not Sam's life.
  const waitingForDate = !life.profile && (storyCount > 0 || Object.keys(life.colours).length > 0)
  const isExample = !life.profile && !waitingForDate
  // What the grid draws. Without a birth date (example, or waiting for one) the example drives the calculations;
  // while waiting, none of it is shown.
  const shown = life.profile ? life : EXAMPLE.life
  const profile = shown.profile!
  const [panel, setPanel] = useState<PanelMode | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [sharing, setSharing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Settings sits beside the page; the story panel and print dialog cover it, so they never open together.
  useEffect(() => {
    if (panel || sharing) setSettingsOpen(false)
  }, [panel, sharing])
  // The date form starts afresh after forgetting.
  const [formKey, setFormKey] = useState(0)

  // A "send to my phone" link, on load or opened into a tab that already has the page: offer its contents.
  useEffect(() => {
    const check = () =>
      void readLinkFragment(window.location.hash).then((result) => result && setPendingImport({ source: 'link', result }))
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  /** Done with an import: take a link's data out of the address (unless it's for a newer version, so a reload can
   * read it). */
  function closeImport() {
    if (pendingImport?.source === 'link' && !(!pendingImport.result.ok && pendingImport.result.newer)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setPendingImport(null)
  }

  function exportBackup() {
    const { name, text } = exportFile(life, today)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click()
    // Some browsers start the download after the click returns, so keep the file around for a moment.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const birthDate = profile.birthDate
  const { data: mortality, status: mortalityStatus } = useMortality(profile.nation)
  const personal = useMemo(
    () => outlook(mortality, birthDate, today, { sex: profile.sex, basis: profile.basis }),
    [mortality, birthDate, today, profile.sex, profile.basis],
  )
  // With statistics hidden the grid can't be sized from them (its length would give the figures away): use the
  // classic 90 years unless the person chose a length.
  const suggestedYears = profile.statistics === 'hidden' ? CLASSIC_GRID_YEARS : suggestedGridYears(personal)
  // A hand-set length the person has since outlived falls back to the figures.
  const gridYears = profile.gridYears !== null && profile.gridYears > personal.fromAge ? profile.gridYears : suggestedYears
  const lived = Math.max(0, boxIndex(view, birthDate, today))
  const total = (gridYears * BOXES_PER_YEAR[view]).toLocaleString('en-GB')
  const showChances = !isExample && profile.statistics === 'grid'
  const chances = useMemo(() => {
    if (!showChances) return undefined
    const variant = (v: 'low' | 'high') => outlook(mortality, birthDate, today, { sex: profile.sex, basis: profile.basis, variant: v })
    return boxChances(view, birthDate, today, gridYears, { principal: personal, low: variant('low'), high: variant('high') })
  }, [showChances, mortality, birthDate, today, profile.sex, profile.basis, view, gridYears, personal])
  // Without the full chances, the grid still marks where fewer than half of people like you are still alive, so the
  // grid and the life bar tell the same story.
  const half = useMemo(
    () => (showChances || profile.statistics === 'hidden' ? -1 : halfBox(view, birthDate, today, gridYears, personal)),
    [showChances, profile.statistics, view, birthDate, today, gridYears, personal],
  )
  const story = useMemo(
    () => layoutStory(view, birthDate, today, shown.eras, shown.moments, shown.goals),
    [view, birthDate, today, shown.eras, shown.moments, shown.goals],
  )
  const goalsById = useMemo(() => new Map(shown.goals.map((g) => [g.id, g])), [shown.goals])
  const nextGoal = shown.goals
    .map((goal) => ({ goal, weeks: weeksToGo(today, goalDate(birthDate, goal)) }))
    .filter(({ weeks }) => weeks >= 0)
    .sort((a, b) => a.weeks - b.weeks)[0]
  const erasById = useMemo(() => new Map(shown.eras.map((e) => [e.id, e])), [shown.eras])
  const momentsById = useMemo(() => new Map(shown.moments.map((m) => [m.id, m])), [shown.moments])
  const colours = shown.colours
  const colourOf = useMemo(() => (entry: { category: Category }) => categoryColour(entry.category, colours), [colours])
  const openBox = useMemo(() => (isExample ? undefined : (index: number) => setPanel({ kind: 'box', index })), [isExample])

  function forget(): boolean {
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
    if (
      storyCount > 0 &&
      !window.confirm(
        `This deletes your date of birth and your story (${plural(life.eras.length, 'era')}, ${plural(life.moments.length, 'moment')}, ${plural(life.goals.length, 'goal')}) from this browser. Forget everything?`,
      )
    ) {
      return false
    }
    setPanel(null)
    setSettingsOpen(false)
    setLife(emptyLife)
    setFormKey((key) => key + 1)
    return true
  }

  // The grid inks in when the page opens and when the birth date changes; switching views just fades the new one in.
  const frameKey = `${view}|${birthDate.year}-${birthDate.month}-${birthDate.day}`
  const [quietFrame, setQuietFrame] = useState<string | null>(null)

  function changeView(next: View) {
    setQuietFrame(`${next}|${birthDate.year}-${birthDate.month}-${birthDate.day}`)
    setView(next)
    writeView(next)
  }

  /** The grid as the share image and poster see it (colours resolved for the canvas). */
  const drawing = (labels: boolean): DrawInput => {
    const css = (name: string) => resolveColour(`var(--color-${name})`)
    return {
      view,
      years: gridYears,
      todayIndex: boxIndex(view, birthDate, today),
      story,
      eras: erasById,
      moments: momentsById,
      goals: goalsById,
      colours: {
        paper: css('paper'),
        ink: css('ink'),
        inkSoft: css('ink-soft'),
        rule: css('rule'),
        lived: css('ink'),
        today: css('today'),
        accent: css('accent'),
        category: (category) => resolveColour(categoryColour(category, colours)),
      },
      chances,
      patterns: !isExample && profile.patterns,
      labels,
      title: 'Your Life',
      subtitle: `A life in ${UNIT[view]}`,
    }
  }

  return (
    <div
      className={`mx-auto flex min-h-dvh max-w-3xl flex-col lg:max-w-6xl gap-8 px-4 py-8 sm:px-8 sm:py-12 print:min-h-0 print:max-w-none print:gap-3 print:p-0 ${settingsOpen ? 'xl:mr-[26rem]' : ''}`}
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4" data-print-part>
        <div>
          <p className="font-display text-xs tracking-[0.2em] text-ink-soft uppercase">
            A life in {UNIT[view]}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Your Life</h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <ViewToggle view={view} onChange={changeView} />
          {life.profile && (
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-expanded={settingsOpen}
              className="flex items-center gap-1.5 rounded-sm border border-ink px-3 py-1 font-display text-sm tracking-wide hover:bg-paper-deep"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h7M13 4h1M2 12h1M7 12h7" />
                <circle cx="11" cy="4" r="2" />
                <circle cx="5" cy="12" r="2" />
              </svg>
              Settings
            </button>
          )}
        </div>
      </header>

      {life.profile && (
        <Settings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onForget={forget}
          profile={life.profile}
          suggestedYears={suggestedYears}
          gridYears={gridYears}
          minYears={Math.max(MIN_GRID_YEARS, personal.fromAge + 1)}
          lifeExpectancy={personal.lifeExpectancy}
          chanceAtEnd={chanceOfReaching(personal, gridYears)}
          source={mortality.source}
          onChange={(next) => setLife({ ...life, profile: next })}
        />
      )}

      {!storageAvailable && (
        <p role="status" className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm print:hidden">
          {newerSave
            ? 'This browser has your life saved by a newer version of this page. Reload to see it; nothing here will be saved until then.'
            : "This browser isn't letting the page save anything, so your date will be forgotten when you leave."}
        </p>
      )}

      <main className="flex flex-col gap-6 print:gap-3">
        <div className="print:hidden">
        <BirthDateForm
          key={formKey}
          birthDate={life.profile?.birthDate ?? null}
          today={today}
          legend={life.profile ? 'Your date of birth' : `This is ${EXAMPLE.name}'s life. See yours:`}
          onChange={(date) =>
            setLife({ ...life, profile: date ? { ...(life.profile ?? newProfile(date)), birthDate: date } : null })
          }
        />
        </div>
        {!life.profile && (
          <p className="-mt-3 text-sm text-ink-soft">
            Have a backup?{' '}
            <ImportButton className="underline decoration-rule underline-offset-4 hover:text-ink" onPending={setPendingImport} />
          </p>
        )}
        {life.profile && mortalityStatus !== 'ready' && (
          <p role="status" className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm print:hidden">
            {mortalityStatus === 'loading'
              ? `Loading the figures for ${NATION_NAMES[life.profile.nation]}; showing the UK's meanwhile.`
              : `The figures for ${NATION_NAMES[life.profile.nation]} couldn't be loaded, so these are the UK's. Try reloading the page.`}
          </p>
        )}
        {waitingForDate && (
          <p className="text-sm text-ink-soft">
            Want to start again?{' '}
            <button type="button" onClick={forget} className="underline decoration-rule underline-offset-4 hover:text-ink">
              Forget me
            </button>
          </p>
        )}
        {waitingForDate ? (
          <p role="status" className="border-l-2 border-accent bg-paper-deep px-3 py-2" data-testid="waiting">
            Your story ({storyCount} {storyCount === 1 ? 'entry' : 'entries'}) is saved in this browser. Finish your date
            of birth to see it on the grid.
          </p>
        ) : (
        <>
        {/* On wide screens the grid takes the right and the summary stays beside it on the left; on phones and paper
            they stack. */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-x-12 print:flex print:gap-3">
        <div className="flex flex-col gap-6 lg:sticky lg:top-8 print:static print:gap-3">
        <div className="flex flex-col gap-1" data-print-part>
          {isExample && (
            <p className="font-display text-sm tracking-[0.12em] text-today uppercase" data-testid="example">
              An example: {EXAMPLE.name}'s life
            </p>
          )}
          {/* The headline: who, then the number large, then what it's out of. One line each on screen; one line in all on
              the poster. */}
          <p className="flex flex-col font-display leading-none poster:block poster:text-xl" aria-live="polite" data-testid="summary">
            <span className="text-lg text-ink-soft poster:text-xl poster:text-ink">{isExample ? `${EXAMPLE.name} has` : "You've"} lived</span>{' '}
            <span className="py-1 text-4xl sm:text-5xl lg:text-4xl poster:p-0 poster:text-xl">
              <strong className="text-5xl font-semibold tracking-tight tabular-nums sm:text-7xl lg:text-6xl poster:text-xl">{lived.toLocaleString('en-GB')}</strong>{' '}
              {UNIT[view]}
            </span>{' '}
            <span className="text-lg text-ink-soft poster:text-xl">of the {total} on a {gridYears}-year grid.</span>
          </p>
          {profile.statistics !== 'hidden' && (
            <LifeBar
              progress={lifeProgress(personal, birthDate, today)}
              who={isExample ? EXAMPLE.name : 'you'}
              source={`Based on ONS ${mortality.source.edition} life tables.`}
            />
          )}
          {nextGoal && (
            <p className="text-base" data-testid="next-goal">
              Next goal: <strong className="font-semibold">{nextGoal.goal.label}</strong>, {countdown(nextGoal.weeks)}.
            </p>
          )}
          {isExample && (
            <p className="text-sm text-ink-soft">
              Nothing is saved until you enter your date of birth. On your own grid you can tap any box to add an era, a
              moment or a goal.
            </p>
          )}
        </div>
        <div className="-mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft print:hidden">
          {life.profile && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-left underline decoration-rule underline-offset-4 hover:text-ink"
              data-testid="settings-summary"
            >
              {settingsSummary(life.profile, gridYears)} · Change
            </button>
          )}
          {profile.statistics !== 'hidden' && (
            <a href="#figures" className="underline decoration-rule underline-offset-4 hover:text-ink">
              See {isExample ? `${EXAMPLE.name}'s` : 'your'} figures below ↓
            </a>
          )}
        </div>
        {!isExample && (
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={() => setPanel({ kind: 'list' })}
              className="rounded-sm bg-ink px-3 py-1.5 font-display text-sm text-paper"
            >
              Your story
            </button>
            <button type="button" onClick={() => setSharing(true)} className="rounded-sm border border-ink px-3 py-1.5 font-display text-sm">
              Print or share
            </button>
            <span className="text-sm text-ink-soft">
              {storyCount === 0
                ? 'Tap any box to add an era, a moment or a goal there.'
                : `${[
                    [life.eras.length, 'era'],
                    [life.moments.length, 'moment'],
                    [life.goals.length, 'goal'],
                  ]
                    .map(([n, word]) => `${n} ${word}${n === 1 ? '' : 's'}`)
                    .join(', ')}. Tap a box to add or edit.`}
            </span>
          </div>
        )}
        {/* A new view fades in rather than jumping (styles.css). */}
        </div>
        <div className="flex flex-col gap-6 print:gap-3">
        {/* Motion (styles.css): the grid inks in, or a new view fades in rather than jumping. */}
        <div key={frameKey} className="relative flex justify-center" data-grid-frame data-ink-in={frameKey !== quietFrame || undefined}>
          <LifeGrid
            view={view}
            birthDate={birthDate}
            today={today}
            years={gridYears}
            story={story}
            eras={erasById}
            moments={momentsById}
            goals={goalsById}
            colourOf={colourOf}
            chances={chances}
            half={half}
            patterns={!isExample && profile.patterns}
            onOpenBox={openBox}
          />
        </div>
        <Legend eras={shown.eras} moments={shown.moments} goals={shown.goals} colours={colours} chances={!!chances} half={half >= 0} patterns={!isExample && profile.patterns} />
        </div>
        </div>
        {profile.statistics !== 'hidden' && <Figures profile={profile} today={today} isExample={isExample} />}
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
            onExport={exportBackup}
            onPendingImport={setPendingImport}
          />
        )}
        {life.profile && (
          <PrintShareDialog open={sharing} onClose={() => setSharing(false)} drawing={drawing} fileName={`your-life-${view}.png`} />
        )}
        <ImportDialog
          pending={pendingImport}
          current={life}
          onCancel={closeImport}
          onReplace={(imported) => {
            setPanel(null)
            closeImport()
            setLife(imported)
          }}
        />
      </main>

      <footer className="mt-auto border-t border-rule pt-4 text-sm text-ink-soft print:hidden">
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
