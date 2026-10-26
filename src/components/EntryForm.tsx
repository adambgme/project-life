import { useId, useState, type FormEvent } from 'react'
import { compareDates, parseIsoDate, toIsoDate, type CalendarDate } from '../life/lifeMaths'
import { MAX_LABEL_LENGTH } from '../life/store'
import { CATEGORIES, CATEGORY_NAMES, type Category, type Era, type Moment } from '../life/story'

export type Draft =
  | { kind: 'era'; entry: Era; isNew: boolean }
  | { kind: 'moment'; entry: Moment; isNew: boolean }

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
  const [text, setText] = useState(draft.entry.label)
  const [category, setCategory] = useState<Category>(draft.entry.category)
  const [start, setStart] = useState(toIsoDate(isEra ? draft.entry.start : draft.entry.date))
  const [ongoing, setOngoing] = useState(isEra ? draft.entry.end === null : false)
  const [end, setEnd] = useState(isEra && draft.entry.end ? toIsoDate(draft.entry.end) : toIsoDate(today))
  const [problem, setProblem] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = text.trim()
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
    } else {
      onSave({ ...draft, entry: { ...draft.entry, label: name, category, date: startDate } })
    }
  }

  const noun = isEra ? 'era' : 'moment'
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
          placeholder={isEra ? 'e.g. University, Living in Bristol' : 'e.g. Moved house, Got married'}
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
            max={isEra ? undefined : toIsoDate(today)}
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
