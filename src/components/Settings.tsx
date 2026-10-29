import { useEffect, useId, useRef, useState } from 'react'
import type { Basis, Sex } from '../life/mortality'
import { MAX_GRID_YEARS, NATION_NAMES, NATIONS, type Nation, type Profile, type Statistics } from '../life/store'

const SEX_NAMES: Record<Sex, string> = { female: 'Female', male: 'Male', both: 'Both, averaged' }

type Props = {
  profile: Profile
  /** Years the statistics suggest (shown when the person hasn't chosen their own). */
  suggestedYears: number
  /** Years on the grid now: the person's own choice, or the suggestion. */
  gridYears: number
  /** The shortest length allowed: never at or below today's age. */
  minYears: number
  lifeExpectancy: number
  /** Chance (0–1) of people like you reaching the end of the grid. */
  chanceAtEnd: number
  source: { attribution: string; url: string; edition: string }
  onChange: (profile: Profile) => void
  open: boolean
  onClose: () => void
  /** Delete everything saved in this browser; returns false if the person changed their mind. */
  onForget: () => boolean
}

const field = 'rounded-sm border border-rule bg-paper px-2 py-1.5 text-base text-ink focus:border-ink'
const label = 'text-sm text-ink-soft'

const STATISTICS_NAMES: Record<Statistics, string> = { numbers: 'just the numbers', grid: 'chances on the grid', hidden: 'statistics hidden' }

/** What's chosen in Settings, for a line: "Female", "England", "projected rates", "100-year grid", "just the numbers". */
export function settingsSummary(profile: Profile, gridYears: number): string[] {
  const hidden = profile.statistics === 'hidden'
  return [
    ...(hidden ? [] : [SEX_NAMES[profile.sex].replace(', averaged', ' sexes'), NATION_NAMES[profile.nation], profile.basis === 'cohort' ? 'projected rates' : "this year's rates"]),
    `${gridYears}-year grid`,
    STATISTICS_NAMES[profile.statistics],
    ...(profile.patterns ? ['patterns on eras'] : []),
  ]
}

/** Settings, in a panel beside the grid (a sheet from the bottom on phones): the details that size the grid and the
 * figures from ONS life tables, the person's own grid length, how much statistics to show, and forgetting it all. It
 * doesn't cover the page, so each change shows on the grid straight away. Escape or Done closes it, and focus goes
 * back to whatever opened it. */
export function Settings(props: Props) {
  const { profile, suggestedYears, gridYears, minYears, lifeExpectancy, chanceAtEnd, source, onChange, open, onClose, onForget } =
    props
  const id = useId()
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch })
  const hidden = profile.statistics === 'hidden'
  // The box holds draft text while typing; it's checked when the person leaves the box or presses Enter.
  const [draft, setDraft] = useState(String(gridYears))
  useEffect(() => setDraft(String(gridYears)), [gridYears])
  const draftYears = Number(draft)
  const draftValid = draft !== '' && Number.isInteger(draftYears) && draftYears >= minYears && draftYears <= MAX_GRID_YEARS

  function commitDraft() {
    if (draftValid) set({ gridYears: draftYears === suggestedYears ? null : draftYears })
    else setDraft(String(gridYears))
  }

  const ref = useRef<HTMLDialogElement>(null)
  // Shown without showModal: the page stays live behind it. Focus moves in on opening and back out on closing.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      const opener = document.activeElement as HTMLElement | null
      dialog.show()
      dialog.querySelector<HTMLElement>('h2')?.focus()
      return () => opener?.focus()
    }
  }, [open])
  useEffect(() => {
    if (!open) ref.current?.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      data-testid="settings"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClose={onClose}
      className="settings-panel fixed z-20 m-0 flex-col overflow-y-auto border-rule bg-paper p-0 text-ink shadow-[0_0_40px_rgb(0_0_0/0.15)] open:flex print:hidden"
    >
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rule bg-paper px-5 py-3">
      <h2 id={`${id}-title`} tabIndex={-1} className="font-display text-xl font-semibold outline-none">
        Settings
      </h2>
      <button type="button" onClick={onClose} className="rounded-sm bg-ink px-4 py-1.5 font-display text-paper">
        Done
      </button>
    </div>
    <div className="flex flex-col gap-4 px-5 py-4">

      <div className="flex flex-wrap items-end gap-3">
        <div className={`flex flex-col gap-1 ${hidden ? 'hidden' : ''}`}>
          <label htmlFor={`${id}-sex`} className={label}>
            Life tables for
          </label>
          <select
            id={`${id}-sex`}
            className={field}
            value={profile.sex}
            onChange={(e) => set({ sex: e.target.value as Sex })}
            aria-describedby={`${id}-sex-note`}
          >
            {(['female', 'male', 'both'] as const).map((sex) => (
              <option key={sex} value={sex}>
                {SEX_NAMES[sex]}
              </option>
            ))}
          </select>
        </div>
        <div className={`flex flex-col gap-1 ${hidden ? 'hidden' : ''}`}>
          <label htmlFor={`${id}-nation`} className={label}>
            Where you live
          </label>
          <select
            id={`${id}-nation`}
            className={field}
            value={profile.nation}
            onChange={(e) => set({ nation: e.target.value as Nation })}
          >
            {NATIONS.map((nation) => (
              <option key={nation} value={nation}>
                {NATION_NAMES[nation]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-years`} className={label}>
            Grid length (years)
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`${id}-years`}
              className={`${field} w-20 tabular-nums`}
              type="number"
              inputMode="numeric"
              min={minYears}
              max={MAX_GRID_YEARS}
              value={draft}
              aria-invalid={!draftValid}
              aria-describedby={`${id}-years-hint`}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft()
                if (e.key === 'Escape') setDraft(String(gridYears))
              }}
            />
            {profile.gridYears !== null && (
              <button
                type="button"
                onClick={() => set({ gridYears: null })}
                className="text-sm text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink"
              >
                {hidden ? `Back to ${suggestedYears}` : `Use the figures (${suggestedYears})`}
              </button>
            )}
          </div>
        </div>
      </div>

      <p id={`${id}-years-hint`} className={`text-xs ${draftValid ? 'sr-only' : 'text-error'}`}>
        The grid can run from {minYears} to {MAX_GRID_YEARS} years.
      </p>

      <p id={`${id}-sex-note`} className={`text-xs text-ink-soft ${hidden ? 'hidden' : ''}`}>
        ONS life tables record only two sexes. "Both, averaged" uses the average of the two.
      </p>

      <fieldset className={`flex flex-col gap-1 ${profile.statistics === 'hidden' ? 'hidden' : ''}`}>
        <legend className={`${label} mb-1`}>Which death rates</legend>
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
                name={`${id}-basis`}
                checked={profile.basis === basis}
                onChange={() => set({ basis })}
                className="accent-accent"
              />
              {text}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-soft">
          {profile.basis === 'cohort'
            ? 'Cohort figures assume death rates keep improving as ONS projects, so they run a few years longer than the headline figure.'
            : "Period figures assume this year's death rates never change: the usual headline figure, but not a real forecast for anyone."}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className={`${label} mb-1`}>Statistics</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {(
            [
              ['numbers', 'Just the numbers'],
              ['grid', 'Show my chances on the grid'],
              ['hidden', 'Hide all statistics'],
            ] as [Statistics, string][]
          ).map(([statistics, text]) => (
            <label key={statistics} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${id}-statistics`}
                checked={profile.statistics === statistics}
                onChange={() => set({ statistics })}
                className="accent-accent"
              />
              {text}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={profile.patterns}
          onChange={(e) => set({ patterns: e.target.checked })}
          className="mt-1 accent-accent"
          aria-describedby={`${id}-patterns-note`}
        />
        <span>
          Patterns on eras
          <span id={`${id}-patterns-note`} className="block text-xs text-ink-soft">
            Each kind of era gets its own texture as well as its colour: easier to tell apart for colour-blind eyes and
            on a black-and-white print.
          </span>
        </span>
      </label>

      {profile.statistics === 'hidden' ? (
        <p className="text-base" data-testid="life-expectancy">
          The grid runs to {gridYears} years.{' '}
          <span className="text-ink-soft">
            Statistics are hidden, so it isn't sized from them; turn them back on above whenever you like.
          </span>
        </p>
      ) : (
        <p className="text-base" data-testid="life-expectancy">
          People like you live to about <strong className="font-semibold">{Math.round(lifeExpectancy)}</strong> on
          average.{' '}
          <span className="text-ink-soft">
            {gridYears === suggestedYears && profile.gridYears === null
              ? `The grid runs to ${gridYears}, `
              : `You've set the grid to ${gridYears} years, `}
            {chanceInWords(chanceAtEnd)}
          </span>
        </p>
      )}

      <p className={`text-xs text-ink-soft ${hidden ? 'hidden' : ''}`}>
        {source.attribution}. <a className="underline" href={source.url}>ONS {source.edition} life tables</a>.
        Averages describe groups of people, not any one person.
      </p>

      <div className="flex flex-col gap-1 border-t border-rule pt-4">
        <button
          type="button"
          onClick={onForget}
          className="self-start text-sm text-error underline decoration-rule underline-offset-4"
        >
          Forget me
        </button>
        <p className="text-xs text-ink-soft">Deletes your date of birth and your story from this browser.</p>
      </div>
    </div>
    </dialog>
  )
}

/** "about 7 in 100 people like you reach that age", rounded gently. */
export function chanceInWords(chance: number): string {
  if (chance >= 0.995) return 'an age almost everyone like you reaches.'
  if (chance < 0.005) return 'an age very few people like you reach.'
  return `an age about ${Math.round(chance * 100)} in 100 people like you reach.`
}
