import { useId, useState, type FormEvent } from 'react'
import { ageOn, birthdayIn, compareDates, parseIsoDate, toIsoDate, type CalendarDate } from '../life/lifeMaths'
import { MAX_GRID_YEARS, MAX_LABEL_LENGTH } from '../life/store'
import { CATEGORIES, CATEGORY_NAMES, goalDate, type Category, type Era, type Goal, type Moment } from '../life/story'

export type Draft =
  | { kind: 'era'; entry: Era; isNew: boolean }
  | { kind: 'moment'; entry: Moment; isNew: boolean }
  | { kind: 'goal'; entry: Goal; isNew: boolean }

type Props = {
  draft: Draft
  birthDate: CalendarDate
  today: CalendarDate
  onSave: (draft: Draft) => void
  onDelete: (draft: Draft) => void
  onCancel: () => void
}

const field = 'w-full rounded-sm border border-rule bg-paper px-2 py-1.5 text-base text-ink focus:border-ink'
const label = 'text-sm text-ink-soft'

/** Add or edit one era or moment, with precise dates. */
export function EntryForm({ draft, birthDate, today, onSave, onDelete, onCancel }: Props) {
  const id = useId()
  const isEra = draft.kind === 'era'
  const isGoal = draft.kind === 'goal'
  const [text, setText] = useState(draft.entry.label)
  const [category, setCategory] = useState<Category>(draft.entry.category)
  const [start, setStart] = useState(
    toIsoDate(draft.kind === 'era' ? draft.entry.start : draft.kind === 'moment' ? draft.entry.date : goalDate(birthDate, draft.entry)),
  )
  const [byAge, setByAge] = useState(draft.kind === 'goal' && draft.entry.target.kind === 'age')
  const [age, setAge] = useState(
    draft.kind === 'goal' && draft.entry.target.kind === 'age' ? String(draft.entry.target.age) : String(ageOn(birthDate, today) + 10),
  )
  const [ongoing, setOngoing] = useState(isEra ? draft.entry.end === null : false)
  const [end, setEnd] = useState(isEra && draft.entry.end ? toIsoDate(draft.entry.end) : toIsoDate(today))
  const [problem, setProblem] = useState<string | null>(null)

  function submitGoal(name: string) {
    const ageNumber = Number(age)
    const startDate = parseIsoDate(start)
    const validAge = Number.isInteger(ageNumber) && ageNumber > 0 && ageNumber <= MAX_GRID_YEARS
    const target = byAge
      ? validAge
        ? { kind: 'age' as const, age: ageNumber }
        : null
      : startDate
        ? { kind: 'date' as const, date: startDate }
        : null
    const when = byAge ? (validAge ? birthdayIn(birthDate, birthDate.year + ageNumber) : null) : startDate
    const issue = !name
      ? 'Give it a name.'
      : !target || !when
        ? byAge
          ? `Enter an age from 1 to ${MAX_GRID_YEARS}.`
          : 'Enter the date.'
        : compareDates(when, today) <= 0
          ? 'A goal is something ahead of you. Pick a later date or age.'
          : null
    setProblem(issue)
    if (issue || !target || draft.kind !== 'goal') return
    onSave({ ...draft, entry: { ...draft.entry, label: name, category, target } })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = text.trim()
    if (isGoal) return submitGoal(name)
    const startDate = parseIsoDate(start)
    const endDate = parseIsoDate(end)
    const issue = !name
      ? 'Give it a name.'
      : !startDate
        ? `Enter ${isEra ? 'a start date' : 'the date'}.`
        : compareDates(startDate, birthDate) < 0
          ? "That's before you were born."
          : !isEra && compareDates(startDate, today) > 0
            ? 'Moments are things that have happened. Pick a date up to today.'
            : isEra && ongoing && compareDates(startDate, today) > 0
              ? 'An era that\'s still going must have started by today. Untick "Still going" to plan one ahead.'
            : isEra && !ongoing && !endDate
              ? 'Enter an end date, or tick "Still going".'
              : isEra && !ongoing && compareDates(endDate!, startDate) < 0
                ? 'The end is before the start.'
                : null
    setProblem(issue)
    if (issue || !startDate) return
    if (draft.kind === 'era') {
      onSave({ ...draft, entry: { ...draft.entry, label: name, category, start: startDate, end: ongoing ? null : endDate } })
    } else if (draft.kind === 'moment') {
      onSave({ ...draft, entry: { ...draft.entry, label: name, category, date: startDate } })
    }
  }

  const noun = draft.kind
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="font-display text-2xl">
        {draft.isNew ? `New ${noun}` : `Edit ${noun}`}
      </h3>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-name`} className={label}>
          Name
        </label>
        <input
          id={`${id}-name`}
          className={field}
          value={text}
          maxLength={MAX_LABEL_LENGTH}
          placeholder={
            isEra ? 'e.g. University, Living in Bristol' : isGoal ? 'e.g. Retire, Run a marathon' : 'e.g. Moved house, Got married'
          }
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-category`} className={label}>
          Category
        </label>
        <select id={`${id}-category`} className={field} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_NAMES[c]}
            </option>
          ))}
        </select>
      </div>
      {isGoal && (
        <fieldset className="flex flex-wrap gap-x-5 gap-y-1">
          <legend className={`${label} mb-1`}>Aim for</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${id}-target`} checked={!byAge} onChange={() => setByAge(false)} className="accent-accent" />
            A date
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${id}-target`} checked={byAge} onChange={() => setByAge(true)} className="accent-accent" />
            An age
          </label>
        </fieldset>
      )}
      {isGoal && byAge ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-age`} className={label}>
            Age
          </label>
          <input
            id={`${id}-age`}
            className={`${field} w-24`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_GRID_YEARS}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
      ) : (
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-start`} className={label}>
            {isEra ? 'From' : 'Date'}
          </label>
          <input
            id={`${id}-start`}
            type="date"
            className={field}
            value={start}
            min={toIsoDate(birthDate)}
            max={draft.kind === 'moment' ? toIsoDate(today) : undefined}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        {isEra && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-end`} className={label}>
              To
            </label>
            <input
              id={`${id}-end`}
              type="date"
              className={field}
              value={end}
              min={start}
              disabled={ongoing}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        )}
      </div>
      )}
      {isEra && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="accent-accent" />
          Still going
        </label>
      )}
      <p role="alert" className="text-sm text-error">
        {problem}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-sm bg-ink px-4 py-2 font-display text-paper">
          Save {noun}
        </button>
        <button type="button" onClick={onCancel} className="px-2 py-2 text-sm text-ink-soft underline underline-offset-4">
          Cancel
        </button>
        {!draft.isNew && (
          <button
            type="button"
            onClick={() => onDelete(draft)}
            className="ml-auto px-2 py-2 text-sm text-error underline underline-offset-4"
          >
            Delete {noun}
          </button>
        )}
      </div>
    </form>
  )
}
