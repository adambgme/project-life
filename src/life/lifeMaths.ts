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
