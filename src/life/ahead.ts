import { compareDates, daysBetween, type CalendarDate } from './lifeMaths'

const DAYS_PER_YEAR = 365.2425

export type Ahead = { summersLived: number; summersAhead: number; weekendsAhead: number }

/**
 * "What's ahead, in things you'll do": the summers so far and the summers and weekends left if you live to the average
 * age for people like you (`yearsLeft` from lifeProgress). A summer counts once its midsummer (1 July) has come; an
 * average, never a forecast.
 */
export function whatsAhead(birth: CalendarDate, today: CalendarDate, yearsLeft: number): Ahead {
  const left = Math.max(0, yearsLeft)
  const midsummer = (year: number) => ({ year, month: 7, day: 1 })
  const firstSummer = compareDates(midsummer(birth.year), birth) > 0 ? birth.year : birth.year + 1
  const thisYearsHasCome = compareDates(midsummer(today.year), today) <= 0
  const lastLived = thisYearsHasCome ? today.year : today.year - 1
  // The summers whose midsummer falls between today and the average age.
  let summersAhead = 0
  while (daysBetween(today, midsummer(lastLived + summersAhead + 1)) / DAYS_PER_YEAR <= left) summersAhead++
  return {
    summersLived: Math.max(0, lastLived - firstSummer + 1),
    summersAhead,
    weekendsAhead: Math.round((left * DAYS_PER_YEAR) / 7),
  }
}
