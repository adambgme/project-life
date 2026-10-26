/**
 * Calendar maths for the life grid. Everything works on calendar dates (no times, no time zones):
 * a date is turned into a day number and back, so DST and UTC offsets can't shift a box.
 *
 * Weeks follow Wait But Why: 52 boxes per row, one row per year of age, each row starting on a
 * birthday. A year has 365 or 366 days, so the 52nd box of a row holds 8 or 9 days.
 */

/** A calendar date. `month` is 1–12. */
export type CalendarDate = { year: number; month: number; day: number }

export const WEEKS_PER_ROW = 52

function dayNumber({ year, month, day }: CalendarDate): number {
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000)
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Whether the parts make a date that exists (no 31 April, no 29 February in a common year). */
export function isRealDate({ year, month, day }: CalendarDate): boolean {
  if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || day < 1) return false
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!
  return day <= daysInMonth
}

export const EARLIEST_BIRTH_YEAR = 1900

/** Why a birth date can't be used, or null if it can. */
export function birthDateProblem(date: CalendarDate, today: CalendarDate): string | null {
  if (!isRealDate(date)) return "That date doesn't exist. Check the day and month."
  if (date.year < EARLIEST_BIRTH_YEAR) return `Enter a year from ${EARLIEST_BIRTH_YEAR} onwards.`
  if (compareDates(date, today) > 0) return 'That date is in the future.'
  return null
}

/** Days from `a` to `b` (negative if `b` is earlier). */
export function daysBetween(a: CalendarDate, b: CalendarDate): number {
  return dayNumber(b) - dayNumber(a)
}

/** Compare two dates: negative if `a` is earlier, 0 if equal, positive if later. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return dayNumber(a) - dayNumber(b)
}

/** The birthday in a given year. Someone born on 29 February has their birthday on 1 March in
 * common years (the UK legal convention). */
export function birthdayIn(birth: CalendarDate, year: number): CalendarDate {
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(year)) return { year, month: 3, day: 1 }
  return { year, month: birth.month, day: birth.day }
}

/** Completed years of age on a date (-1 before birth). */
export function ageOn(birth: CalendarDate, date: CalendarDate): number {
  if (dayNumber(date) < dayNumber(birth)) return -1
  const years = date.year - birth.year
  return dayNumber(date) >= dayNumber(birthdayIn(birth, date.year)) ? years : years - 1
}

/** The weeks box (0-based, row-major) that a date falls in, or -1 before birth. */
export function weekIndex(birth: CalendarDate, date: CalendarDate): number {
  const age = ageOn(birth, date)
  if (age < 0) return -1
  const sinceBirthday = dayNumber(date) - dayNumber(birthdayIn(birth, birth.year + age))
  return age * WEEKS_PER_ROW + Math.min(Math.floor(sinceBirthday / 7), WEEKS_PER_ROW - 1)
}

function fromDayNumber(n: number): CalendarDate {
  const date = new Date(n * 86_400_000)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

/** The first and last dates covered by a weeks box. */
export function weekRange(birth: CalendarDate, index: number): { start: CalendarDate; end: CalendarDate } {
  const age = Math.floor(index / WEEKS_PER_ROW)
  const week = index % WEEKS_PER_ROW
  const rowStart = dayNumber(birthdayIn(birth, birth.year + age))
  const start = rowStart + week * 7
  const end = week === WEEKS_PER_ROW - 1 ? dayNumber(birthdayIn(birth, birth.year + age + 1)) - 1 : start + 6
  return { start: fromDayNumber(start), end: fromDayNumber(end) }
}

/** The calendar date at an instant in a time zone (the viewer's "today"). */
export function calendarDateIn(instant: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(instant)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day') }
}

/** The three ways to view a life. Every view has one group of boxes per year of age. */
export type View = 'weeks' | 'months' | 'years'

export const BOXES_PER_YEAR: Record<View, number> = { weeks: WEEKS_PER_ROW, months: 12, years: 1 }

/** The date `months` months after birth. A day the month doesn't have rolls to the 1st of the next month, matching
 * the 29 February → 1 March birthday rule. */
function monthiversary(birth: CalendarDate, months: number): CalendarDate {
  const total = birth.month - 1 + months
  const date = { year: birth.year + Math.floor(total / 12), month: (total % 12) + 1, day: birth.day }
  if (isRealDate(date)) return date
  return date.month === 12 ? { year: date.year + 1, month: 1, day: 1 } : { year: date.year, month: date.month + 1, day: 1 }
}

/** The box (0-based) a date falls in for a view, or -1 before birth. */
export function boxIndex(view: View, birth: CalendarDate, date: CalendarDate): number {
  if (view === 'weeks') return weekIndex(birth, date)
  const age = ageOn(birth, date)
  if (age < 0 || view === 'years') return age
  const months = (date.year - birth.year) * 12 + (date.month - birth.month) - (date.day < birth.day ? 1 : 0)
  return months
}

/** The first and last dates covered by a box in a view. */
export function boxRange(view: View, birth: CalendarDate, index: number): { start: CalendarDate; end: CalendarDate } {
  if (view === 'weeks') return weekRange(birth, index)
  const startOf = (i: number) =>
    view === 'years' ? birthdayIn(birth, birth.year + i) : monthiversary(birth, i)
  return { start: startOf(index), end: fromDayNumber(dayNumber(startOf(index + 1)) - 1) }
}

/** `YYYY-MM-DD`, as used by date inputs and the saved data. */
export function toIsoDate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Parse `YYYY-MM-DD`; null unless it's a real date. */
export function parseIsoDate(iso: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  return isRealDate(date) ? date : null
}
