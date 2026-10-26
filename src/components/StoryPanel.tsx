import { useEffect, useRef } from 'react'
import { boxRange, compareDates, type CalendarDate, type View } from '../life/lifeMaths'
import type { Life } from '../life/store'
import {
  CATEGORIES,
  CATEGORY_NAMES,
  DEFAULT_COLOURS,
  countdown,
  goalDate,
  weeksToGo,
  type BoxStory,
  type Category,
  type Era,
  type Goal,
  type Moment,
} from '../life/story'
import { EntryForm, type Draft } from './EntryForm'

export type PanelMode = { kind: 'list' } | { kind: 'box'; index: number } | { kind: 'edit'; draft: Draft; back: PanelMode }

type Props = {
  mode: PanelMode | null
  life: Life
  birthDate: CalendarDate
  today: CalendarDate
  view: View
  story: Map<number, BoxStory>
  colourOf: (entry: { category: Category }) => string
  onMode: (mode: PanelMode | null) => void
  onLife: (life: Life) => void
}

const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const utc = ({ year, month, day }: CalendarDate) => new Date(Date.UTC(year, month - 1, day))
const span = (era: Era) => `${monthYear.format(utc(era.start))} – ${era.end ? monthYear.format(utc(era.end)) : 'now'}`

const button = 'rounded-sm border border-ink px-3 py-1.5 font-display text-sm hover:bg-paper-deep'
const link = 'text-sm text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink'

/** "Your story": every era and moment, add and edit them, and category colours. A side drawer on wide screens and a
 * bottom sheet on phones (a native modal dialog, so focus stays inside and Escape closes it). */
export function StoryPanel({ mode, life, birthDate, today, view, story, colourOf, onMode, onLife }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (mode && !dialog.open) dialog.showModal()
    if (!mode && dialog.open) dialog.close()
  }, [mode])

  const newId = () => crypto.randomUUID()
  const startEra = (start: CalendarDate, end: CalendarDate | null, back: PanelMode) =>
    onMode({ kind: 'edit', back, draft: { kind: 'era', isNew: true, entry: { id: newId(), label: '', category: 'home', start, end } } })
  const startMoment = (date: CalendarDate, back: PanelMode) =>
    onMode({ kind: 'edit', back, draft: { kind: 'moment', isNew: true, entry: { id: newId(), label: '', category: 'other', date } } })
  const startGoal = (date: CalendarDate, back: PanelMode) =>
    onMode({
      kind: 'edit',
      back,
      draft: { kind: 'goal', isNew: true, entry: { id: newId(), label: '', category: 'other', target: { kind: 'date', date } } },
    })
  const edit = (draft: Draft, back: PanelMode) => onMode({ kind: 'edit', back, draft })

  function save(draft: Draft) {
    if (draft.kind === 'era') {
      onLife({ ...life, eras: life.eras.filter((e) => e.id !== draft.entry.id).concat(draft.entry) })
    } else if (draft.kind === 'moment') {
      onLife({ ...life, moments: life.moments.filter((m) => m.id !== draft.entry.id).concat(draft.entry) })
    } else {
      onLife({ ...life, goals: life.goals.filter((g) => g.id !== draft.entry.id).concat(draft.entry) })
    }
    onMode(mode?.kind === 'edit' ? mode.back : { kind: 'list' })
  }

  function remove(draft: Draft) {
    if (draft.kind === 'era') onLife({ ...life, eras: life.eras.filter((e) => e.id !== draft.entry.id) })
    else if (draft.kind === 'moment') onLife({ ...life, moments: life.moments.filter((m) => m.id !== draft.entry.id) })
    else onLife({ ...life, goals: life.goals.filter((g) => g.id !== draft.entry.id) })
    onMode(mode?.kind === 'edit' ? mode.back : { kind: 'list' })
  }

  /** A goal reached becomes a moment dated today, opened for editing in case it happened on another day. */
  function tickOff(goal: Goal, back: PanelMode) {
    const moment: Moment = { id: newId(), label: goal.label, category: goal.category, date: today }
    onLife({ ...life, goals: life.goals.filter((g) => g.id !== goal.id), moments: [...life.moments, moment] })
    onMode({ kind: 'edit', back, draft: { kind: 'moment', isNew: false, entry: moment } })
  }

  const eras = [...life.eras].sort((a, b) => compareDates(a.start, b.start))
  const moments = [...life.moments].sort((a, b) => compareDates(a.date, b.date))
  const goals = [...life.goals].sort((a, b) => compareDates(goalDate(birthDate, a), goalDate(birthDate, b)))

  function GoalList({ goalList, back }: { goalList: Goal[]; back: PanelMode }) {
    return (
      <ul className="flex flex-col divide-y divide-rule border-y border-rule" aria-label="Goals" data-testid="goal-list">
        {goalList.map((goal) => {
          const date = goalDate(birthDate, goal)
          return (
            <li key={goal.id} className="flex items-center gap-3 py-2">
              <span aria-hidden className="size-3.5 shrink-0 rounded-[2px] border-2" style={{ borderColor: colourOf(goal) }} />
              <span className="flex-1">
                <span className="block">{goal.label}</span>
                <span className="block text-xs text-ink-soft">
                  {goal.target.kind === 'age' ? `At ${goal.target.age} · ` : ''}
                  {fullDate.format(utc(date))} · {countdown(weeksToGo(today, date))}
                </span>
              </span>
              <button type="button" className={link} aria-label={`Done: ${goal.label}`} onClick={() => tickOff(goal, back)}>
                Done
              </button>
              <button type="button" className={link} aria-label={`Edit goal ${goal.label}`} onClick={() => edit({ kind: 'goal', isNew: false, entry: goal }, back)}>
                Edit
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  function EntryList({ eraList, momentList, back }: { eraList: Era[]; momentList: Moment[]; back: PanelMode }) {
    return (
      <ul className="flex flex-col divide-y divide-rule border-y border-rule">
        {eraList.map((era) => (
          <li key={era.id} className="flex items-center gap-3 py-2">
            <span aria-hidden className="size-3.5 shrink-0 rounded-[2px]" style={{ background: colourOf(era) }} />
            <span className="flex-1">
              <span className="block">{era.label}</span>
              <span className="block text-xs text-ink-soft">
                {CATEGORY_NAMES[era.category]} · {span(era)}
              </span>
            </span>
            <button type="button" className={link} aria-label={`Edit era ${era.label}`} onClick={() => edit({ kind: 'era', isNew: false, entry: era }, back)}>
              Edit
            </button>
          </li>
        ))}
        {momentList.map((moment) => (
          <li key={moment.id} className="flex items-center gap-3 py-2">
            <span aria-hidden className="size-3.5 shrink-0 rounded-full ring-1 ring-ink" style={{ background: colourOf(moment) }} />
            <span className="flex-1">
              <span className="block">{moment.label}</span>
              <span className="block text-xs text-ink-soft">
                {CATEGORY_NAMES[moment.category]} · {fullDate.format(utc(moment.date))}
              </span>
            </span>
            <button
              type="button"
              className={link}
              aria-label={`Edit moment ${moment.label}`}
              onClick={() => edit({ kind: 'moment', isNew: false, entry: moment }, back)}
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    )
  }

  let body = null
  if (mode?.kind === 'edit') {
    body = (
      <EntryForm
        key={mode.draft.entry.id}
        draft={mode.draft}
        birthDate={birthDate}
        today={today}
        onSave={save}
        onDelete={remove}
        onCancel={() => onMode(mode.back)}
      />
    )
  } else if (mode?.kind === 'box') {
    const { start, end } = boxRange(view, birthDate, mode.index)
    const here = story.get(mode.index)
    const isPast = compareDates(start, today) <= 0
    const first = compareDates(start, birthDate) < 0 ? birthDate : start
    body = (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">
          {fullDate.format(utc(start))} – {fullDate.format(utc(end))}
        </h2>
        {here ? (
          <>
            {here.goals.length > 0 && <GoalList goalList={goals.filter((g) => here.goals.includes(g.id))} back={mode} />}
            {here.eras.length + here.moments.length > 0 && (
              <EntryList
                eraList={eras.filter((e) => here.eras.includes(e.id))}
                momentList={moments.filter((m) => here.moments.includes(m.id))}
                back={mode}
              />
            )}
          </>
        ) : (
          <p className="text-ink-soft">Nothing here yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => startEra(first, isPast ? null : end, mode)}>
            Start an era here
          </button>
          {isPast && (
            <button
              type="button"
              className={button}
              onClick={() => startMoment(compareDates(end, today) > 0 ? today : first, mode)}
            >
              Add a moment here
            </button>
          )}
          {compareDates(start, today) > 0 && (
            <button type="button" className={button} onClick={() => startGoal(start, mode)}>
              Set a goal here
            </button>
          )}
        </div>
        <button type="button" className={`${link} self-start`} onClick={() => onMode({ kind: 'list' })}>
          See your whole story
        </button>
      </div>
    )
  } else if (mode?.kind === 'list') {
    body = (
      <div className="flex flex-col gap-5">
        <h2 className="font-display text-3xl">Your story</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => startEra(today, null, mode)}>
            Add an era
          </button>
          <button type="button" className={button} onClick={() => startMoment(today, mode)}>
            Add a moment
          </button>
          <button
            type="button"
            className={button}
            onClick={() => startGoal({ year: today.year + 1, month: today.month, day: Math.min(today.day, 28) }, mode)}
          >
            Add a goal
          </button>
        </div>
        {goals.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-display text-sm tracking-[0.12em] text-ink-soft uppercase">Goals</h3>
            <GoalList goalList={goals} back={mode} />
          </section>
        )}
        {eras.length + moments.length > 0 ? (
          <EntryList eraList={eras} momentList={moments} back={mode} />
        ) : (
          <p className="text-ink-soft">
            Eras are stretches of life (school, a job, a home); moments are single days. Tap any box on the grid to add
            one there.
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-display tracking-wide">Category colours</summary>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {CATEGORIES.map((category: Category) => (
              <li key={category} className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${CATEGORY_NAMES[category]} colour`}
                  value={life.colours[category] ?? DEFAULT_COLOURS[category]}
                  onChange={(e) => onLife({ ...life, colours: { ...life.colours, [category]: e.target.value } })}
                  className="h-7 w-9 cursor-pointer rounded-sm border border-rule bg-paper"
                />
                {CATEGORY_NAMES[category]}
              </li>
            ))}
          </ul>
          {Object.keys(life.colours).length > 0 && (
            <button type="button" className={`${link} mt-3`} onClick={() => onLife({ ...life, colours: {} })}>
              Reset colours
            </button>
          )}
        </details>
      </div>
    )
  }

  return (
    <dialog
      ref={ref}
      aria-label={mode?.kind === 'list' ? 'Your story' : 'Edit your story'}
      onClose={() => onMode(null)}
      onClick={(e) => e.target === ref.current && onMode(null)}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-lg border-t border-ink bg-paper p-5 text-ink backdrop:bg-ink/30 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-none sm:w-[28rem] sm:rounded-none sm:border-t-0 sm:border-l"
    >
      <button type="button" onClick={() => onMode(null)} className={`${link} float-right`}>
        Close
      </button>
      {body}
    </dialog>
  )
}
