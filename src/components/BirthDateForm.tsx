import { useId, useState } from 'react'
import { birthDateProblem, type CalendarDate } from '../life/lifeMaths'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Props = {
  birthDate: CalendarDate | null
  today: CalendarDate
  onChange: (birthDate: CalendarDate | null) => void
  /** Whether there's anything saved to forget. */
  canForget: boolean
  /** Delete everything saved in this browser; returns false if the person changed their mind. */
  onForget: () => boolean
}

type Fields = { day: string; month: string; year: string }

function fieldsFrom(date: CalendarDate | null): Fields {
  return date
    ? { day: String(date.day), month: String(date.month), year: String(date.year) }
    : { day: '', month: '', year: '' }
}

function check(fields: Fields, today: CalendarDate): { date: CalendarDate } | { error: string } | null {
  if (!fields.day || !fields.month || fields.year.length < 4) return null
  const date = { year: Number(fields.year), month: Number(fields.month), day: Number(fields.day) }
  const problem = birthDateProblem(date, today)
  return problem ? { error: problem } : { date }
}

/** Date of birth in UK order (day, month, year). The grid follows the form: a complete, valid date is saved, and
 * anything else (incomplete, impossible or empty) clears it, so the grid never shows a date the form doesn't. */
export function BirthDateForm({ birthDate, today, onChange, canForget, onForget }: Props) {
  const id = useId()
  const [fields, setFields] = useState(() => fieldsFrom(birthDate))
  const result = check(fields, today)
  const error = result && 'error' in result ? result.error : null

  function update(part: keyof Fields, value: string) {
    const next = { ...fields, [part]: value }
    setFields(next)
    const checked = check(next, today)
    onChange(checked && 'date' in checked ? checked.date : null)
  }

  function forget() {
    if (onForget()) setFields(fieldsFrom(null))
  }

  const input =
    'rounded-sm border border-rule bg-paper px-2 py-1.5 text-lg text-ink tabular-nums shadow-[inset_0_1px_0_rgb(0_0_0/0.04)] focus:border-ink'

  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()} noValidate>
      <fieldset className="flex flex-wrap items-end gap-3" aria-describedby={error ? `${id}-error` : undefined}>
        <legend className="mb-2 font-display text-sm tracking-[0.12em] text-ink-soft uppercase">
          Your date of birth
        </legend>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-day`} className="text-sm text-ink-soft">
            Day
          </label>
          <input
            id={`${id}-day`}
            className={`${input} w-16`}
            inputMode="numeric"
            autoComplete="bday-day"
            maxLength={2}
            placeholder="15"
            value={fields.day}
            onChange={(e) => update('day', e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!error}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-month`} className="text-sm text-ink-soft">
            Month
          </label>
          <select
            id={`${id}-month`}
            className={`${input} w-40`}
            autoComplete="bday-month"
            value={fields.month}
            onChange={(e) => update('month', e.target.value)}
            aria-invalid={!!error}
          >
            <option value="" disabled>
              Month
            </option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-year`} className="text-sm text-ink-soft">
            Year
          </label>
          <input
            id={`${id}-year`}
            className={`${input} w-24`}
            inputMode="numeric"
            autoComplete="bday-year"
            maxLength={4}
            placeholder="1990"
            value={fields.year}
            onChange={(e) => update('year', e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!error}
          />
        </div>
        {canForget && (
          <button
            type="button"
            onClick={forget}
            className="pb-2 text-sm text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink"
          >
            Forget me
          </button>
        )}
      </fieldset>
      <p id={`${id}-error`} className="text-sm text-error" role="alert">
        {error}
      </p>
    </form>
  )
}
