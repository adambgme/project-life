import { describe, expect, it } from 'vitest'
import { birthDateProblem, boxIndex, boxRange, calendarDateIn, isRealDate, weekIndex, weekRange } from './lifeMaths'

const d = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}

describe('weekIndex: which weeks box a date falls in', () => {
  it.each([
    ['born that day', '1990-06-15', '1990-06-15', 0],
    ['six days old', '1990-06-15', '1990-06-21', 0],
    ['one week old', '1990-06-15', '1990-06-22', 1],
    ['day before first birthday: last box of the row', '1990-06-15', '1991-06-14', 51],
    ['first birthday starts row 2', '1990-06-15', '1991-06-15', 52],
    ['age 35, week 19 (26 Oct 2025)', '1990-06-15', '2025-10-26', 35 * 52 + 19],
    ['before birth', '1990-06-15', '1990-06-14', -1],
    ['leap year of life (2000): day 365 stays in box 51', '2000-01-01', '2000-12-31', 51],
    ['new year after a leap year starts row 2', '2000-01-01', '2001-01-01', 52],
    ['29 Feb birth: 28 Feb next year is still age 0', '1992-02-29', '1993-02-28', 51],
    ['29 Feb birth: birthday is 1 March in a common year', '1992-02-29', '1993-03-01', 52],
    ['29 Feb birth: real birthday in a leap year', '1992-02-29', '1996-02-29', 4 * 52],
  ])('%s', (_name, birth, date, expected) => {
    expect(weekIndex(d(birth), d(date))).toBe(expected)
  })
})

describe('weekRange: the dates a weeks box covers', () => {
  it.each([
    ['first box', '1990-06-15', 0, '1990-06-15', '1990-06-21'],
    ['second box', '1990-06-15', 1, '1990-06-22', '1990-06-28'],
    ['last box of a row runs to the day before the birthday', '1990-06-15', 51, '1991-06-07', '1991-06-14'],
    ['first box of row 2', '1990-06-15', 52, '1991-06-15', '1991-06-21'],
    ['last box before a 1 March birthday in a common year', '1992-02-29', 51, '1993-02-20', '1993-02-28'],
  ])('%s', (_name, birth, index, start, end) => {
    expect(weekRange(d(birth), index)).toEqual({ start: d(start), end: d(end) })
  })

  it('every day of a box maps back to that box', () => {
    const birth = d('1992-02-29')
    for (let index = 0; index < 52 * 6; index++) {
      const { start, end } = weekRange(birth, index)
      for (let day = new Date(Date.UTC(start.year, start.month - 1, start.day)); ; day.setUTCDate(day.getUTCDate() + 1)) {
        const date = { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() }
        expect(weekIndex(birth, date)).toBe(index)
        if (date.year === end.year && date.month === end.month && date.day === end.day) break
      }
    }
  })
})

describe('calendarDateIn: today in the viewer\'s time zone', () => {
  it.each([
    ['late evening in summer London is already tomorrow', '2026-06-30T23:30:00Z', 'Europe/London', '2026-07-01'],
    ['late evening in winter London is still today', '2026-12-31T23:30:00Z', 'Europe/London', '2026-12-31'],
    ['the night the clocks go forward', '2026-03-29T00:30:00Z', 'Europe/London', '2026-03-29'],
    ['behind UTC', '2026-01-01T03:00:00Z', 'America/Los_Angeles', '2025-12-31'],
    ['ahead of UTC', '2026-01-01T12:00:00Z', 'Pacific/Auckland', '2026-01-02'],
  ])('%s', (_name, instant, timeZone, expected) => {
    expect(calendarDateIn(new Date(instant), timeZone)).toEqual(d(expected))
  })
})

describe('isRealDate', () => {
  it.each([
    ['an ordinary date', '1990-06-15', true],
    ['29 Feb in a leap year', '1992-02-29', true],
    ['29 Feb in a common year', '1993-02-29', false],
    ['29 Feb 1900 (not a leap year)', '1900-02-29', false],
    ['29 Feb 2000 (a leap year)', '2000-02-29', true],
    ['31 April', '1990-04-31', false],
    ['month 13', '1990-13-01', false],
    ['day 0', '1990-01-00', false],
  ])('%s', (_name, iso, expected) => {
    expect(isRealDate(d(iso))).toBe(expected)
  })
})

describe('birthDateProblem', () => {
  const today = d('2026-10-26')
  it.each([
    ['a usable date', '1990-06-15', null],
    ['born today', '2026-10-26', null],
    ['tomorrow', '2026-10-27', 'That date is in the future.'],
    ['before 1900', '1899-12-31', 'Enter a year from 1900 onwards.'],
    ['a three-digit year', '0199-06-15', 'Enter a year from 1900 onwards.'],
    ['31 April', '1990-04-31', "That date doesn't exist. Check the day and month."],
  ])('%s', (_name, iso, expected) => {
    expect(birthDateProblem(d(iso), today)).toBe(expected)
  })
})

describe('boxIndex: which box a date falls in, per view', () => {
  it.each([
    ['months: born that day', 'months', '1990-06-15', '1990-06-15', 0],
    ['months: day before the first monthiversary', 'months', '1990-06-15', '1990-07-14', 0],
    ['months: first monthiversary', 'months', '1990-06-15', '1990-07-15', 1],
    ['months: day before first birthday', 'months', '1990-06-15', '1991-06-14', 11],
    ['months: first birthday starts row 2', 'months', '1990-06-15', '1991-06-15', 12],
    ['months: 26 Oct 2026', 'months', '1990-06-15', '2026-10-26', 36 * 12 + 4],
    ['months: born 31 Jan, 28 Feb is still month 0', 'months', '1990-01-31', '1990-02-28', 0],
    ['months: born 31 Jan, a missing day rolls to 1 March', 'months', '1990-01-31', '1990-03-01', 1],
    ['months: born 29 Feb, 28 Feb next year is month 11', 'months', '1992-02-29', '1993-02-28', 11],
    ['months: born 29 Feb, 1 March is the birthday', 'months', '1992-02-29', '1993-03-01', 12],
    ['years: day before first birthday', 'years', '1990-06-15', '1991-06-14', 0],
    ['years: 26 Oct 2026', 'years', '1990-06-15', '2026-10-26', 36],
    ['years: before birth', 'years', '1990-06-15', '1990-06-01', -1],
    ['weeks: same as weekIndex', 'weeks', '1990-06-15', '2026-10-26', 36 * 52 + 19],
  ] as const)('%s', (_name, view, birth, date, expected) => {
    expect(boxIndex(view, d(birth), d(date))).toBe(expected)
  })
})

describe('boxRange: the dates a box covers, per view', () => {
  it.each([
    ['months: first month', 'months', '1990-06-15', 0, '1990-06-15', '1990-07-14'],
    ['months: born 31 Jan, February box', 'months', '1990-01-31', 0, '1990-01-31', '1990-02-28'],
    ['months: born 31 Jan, after the roll to 1 March', 'months', '1990-01-31', 1, '1990-03-01', '1990-03-30'],
    ['months: born 31 Jan, into a 30-day month', 'months', '1990-01-31', 2, '1990-03-31', '1990-04-30'],
    ['years: age 36', 'years', '1990-06-15', 36, '2026-06-15', '2027-06-14'],
    ['years: born 29 Feb, first year', 'years', '1992-02-29', 0, '1992-02-29', '1993-02-28'],
  ] as const)('%s', (_name, view, birth, index, start, end) => {
    expect(boxRange(view, d(birth), index)).toEqual({ start: d(start), end: d(end) })
  })

  it.each(['months', 'years'] as const)('%s: every day of a box maps back to that box', (view) => {
    for (const birth of [d('1990-01-31'), d('1992-02-29')]) {
      for (let index = 0; index < (view === 'months' ? 12 * 6 : 6); index++) {
        const { start, end } = boxRange(view, birth, index)
        for (let day = new Date(Date.UTC(start.year, start.month - 1, start.day)); ; day.setUTCDate(day.getUTCDate() + 1)) {
          const date = { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() }
          expect(boxIndex(view, birth, date)).toBe(index)
          if (date.year === end.year && date.month === end.month && date.day === end.day) break
        }
      }
    }
  })
})
