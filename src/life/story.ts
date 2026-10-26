/**
 * The person's story on the grid: eras (date ranges) and moments (single past dates), each with a category.
 */
import { boxIndex, compareDates, type CalendarDate, type View } from './lifeMaths'

export const CATEGORIES = ['home', 'work', 'education', 'relationships', 'travel', 'health', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_NAMES: Record<Category, string> = {
  home: 'Home',
  work: 'Work',
  education: 'Education',
  relationships: 'Relationships',
  travel: 'Travel',
  health: 'Health',
  other: 'Other',
}

/** Light-theme defaults as hex, for colour pickers (the page itself uses the theme's CSS variables). */
export const DEFAULT_COLOURS: Record<Category, string> = {
  home: '#b85c38',
  work: '#3e5f8a',
  education: '#9c7020',
  relationships: '#a9466a',
  travel: '#2f7f7c',
  health: '#6f4a8e',
  other: '#6e675e',
}

/** CSS colour for a category: the person's choice, or the theme's default. */
export function categoryColour(category: Category, chosen: Partial<Record<Category, string>>): string {
  return chosen[category] ?? `var(--color-cat-${category})`
}

/** A period of life. `end: null` means it's still going on (it runs to today). */
export type Era = { id: string; label: string; category: Category; start: CalendarDate; end: CalendarDate | null }
/** A single day that happened. */
export type Moment = { id: string; label: string; category: Category; date: CalendarDate }

export type BoxStory = { eras: string[]; moments: string[] }

/** For one view, the eras (newest start first) and moments in each box that has any. */
export function layoutStory(
  view: View,
  birth: CalendarDate,
  today: CalendarDate,
  eras: Era[],
  moments: Moment[],
): Map<number, BoxStory> {
  const boxes = new Map<number, BoxStory>()
  const at = (index: number) => {
    let box = boxes.get(index)
    if (!box) boxes.set(index, (box = { eras: [], moments: [] }))
    return box
  }
  const newestFirst = [...eras].sort((a, b) => compareDates(b.start, a.start))
  for (const era of newestFirst) {
    const end = era.end ?? today
    if (compareDates(end, birth) < 0 || compareDates(end, era.start) < 0) continue
    const first = Math.max(0, boxIndex(view, birth, era.start))
    const last = boxIndex(view, birth, end)
    for (let index = first; index <= last; index++) at(index).eras.push(era.id)
  }
  for (const moment of moments) {
    const index = boxIndex(view, birth, moment.date)
    if (index >= 0) at(index).moments.push(moment.id)
  }
  return boxes
}
