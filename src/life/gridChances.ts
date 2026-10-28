/**
 * The statistics overlay: for every box, the chance (0–1) of a person like you being alive at its start, under the
 * principal projection and ONS's low and high variants. Boxes up to this week are certain.
 */
import { BOXES_PER_YEAR, boxIndex, boxRange, daysBetween, type CalendarDate, type View } from './lifeMaths'
import { chanceOfReaching, type Outlook } from './mortality'

export type GridChances = {
  principal: Float32Array
  low: Float32Array
  high: Float32Array
  /** First box where the chance is below 1 in 2, and below 1 in 10 (-1 if none on the grid). */
  half: number
  tenth: number
}

export function boxChances(
  view: View,
  birth: CalendarDate,
  today: CalendarDate,
  years: number,
  outlooks: { principal: Outlook; low: Outlook; high: Outlook },
): GridChances {
  const total = years * BOXES_PER_YEAR[view]
  const now = boxIndex(view, birth, today)
  const make = () => new Float32Array(total).fill(1)
  const result = { principal: make(), low: make(), high: make(), half: -1, tenth: -1 }
  for (let index = Math.max(0, now + 1); index < total; index++) {
    const age = ageAt(view, birth, index)
    result.principal[index] = chanceOfReaching(outlooks.principal, age)
    result.low[index] = chanceOfReaching(outlooks.low, age)
    result.high[index] = chanceOfReaching(outlooks.high, age)
    if (result.half < 0 && result.principal[index]! < 0.5) result.half = index
    if (result.tenth < 0 && result.principal[index]! < 0.1) result.tenth = index
  }
  return result
}

/** The first box ahead where fewer than half of people like you are still alive (-1 if it's beyond the grid): the
 * one mark the grid shows even without the full chances. */
export function halfBox(view: View, birth: CalendarDate, today: CalendarDate, years: number, principal: Outlook): number {
  const total = years * BOXES_PER_YEAR[view]
  for (let index = Math.max(0, boxIndex(view, birth, today) + 1); index < total; index++) {
    if (chanceOfReaching(principal, ageAt(view, birth, index)) < 0.5) return index
  }
  return -1
}

/** Age in years at the start of a box. */
function ageAt(view: View, birth: CalendarDate, index: number): number {
  return daysBetween(birth, boxRange(view, birth, index).start) / 365.25
}

/** A chance in gentle, rounded words: "about 3 in 4", "about 7 in 10", "fewer than 1 in 100". */
export function chanceWords(p: number): string {
  if (p >= 0.995) return 'almost certainly'
  if (p >= 0.95) return 'more than 9 in 10'
  for (const [value, words] of [
    [0.75, 'about 3 in 4'],
    [0.5, 'about 1 in 2'],
    [0.25, 'about 1 in 4'],
  ] as const) {
    if (Math.abs(p - value) <= 0.03) return words
  }
  if (p >= 0.095) return `about ${Math.round(p * 10)} in 10`
  const in100 = Math.round(p * 100)
  return in100 >= 1 ? `about ${in100} in 100` : 'fewer than 1 in 100'
}
