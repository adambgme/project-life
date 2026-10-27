import { memo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { BOXES_PER_YEAR, boxIndex, boxRange, type CalendarDate, type View } from '../life/lifeMaths'
import { chanceWords, type GridChances } from '../life/gridChances'
import { categoryPattern, countdown, goalDate, weeksToGo, type BoxStory, type Category, type Era, type Goal, type Moment } from '../life/story'

type Props = {
  view: View
  birthDate: CalendarDate | null
  today: CalendarDate
  years: number
  /** Eras and moments by box (from layoutStory). */
  story: Map<number, BoxStory>
  eras: Map<string, Era>
  moments: Map<string, Moment>
  goals: Map<string, Goal>
  /** CSS colour for an entry's category. */
  colourOf: (entry: { category: Category }) => string
  /** The statistics overlay, when shown. */
  chances?: GridChances
  /** Texture each era by its category, so eras don't rely on colour alone. */
  patterns?: boolean
  /** Open a box (click, tap or Enter); absent when the grid is read-only. */
  onOpenBox?: (index: number) => void
}

type Layout = {
  /** Boxes per row on screen. */
  perRow: number
  /** Label rows whose starting age is a multiple of this. */
  labelEvery: number
  /** Extra space before rows whose starting age is a multiple of this. */
  breakEvery: number
  /** Week (or month) numbers shown above the columns. */
  columnMarks: number[]
  columnTitle: string
  maxWidth: string
  gap: string
}

const LAYOUTS: Record<View, Layout> = {
  weeks: {
    perRow: 52,
    labelEvery: 5,
    breakEvery: 10,
    columnMarks: [1, 10, 20, 30, 40, 52],
    columnTitle: 'Week of the year',
    maxWidth: 'max-w-3xl',
    gap: 'gap-[1px] sm:gap-[2px]',
  },
  months: {
    perRow: 36,
    labelEvery: 6,
    breakEvery: 30,
    columnMarks: [],
    columnTitle: 'Three years per row',
    maxWidth: 'max-w-2xl',
    gap: 'gap-[2px] sm:gap-[3px]',
  },
  years: {
    perRow: 10,
    labelEvery: 10,
    breakEvery: 1000,
    columnMarks: [],
    columnTitle: 'Ten years per row',
    maxWidth: 'max-w-md',
    gap: 'gap-[4px] sm:gap-[6px]',
  },
}

const formatDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const show = ({ year, month, day }: CalendarDate) => formatDate.format(new Date(Date.UTC(year, month - 1, day)))

const UNIT_NAMES: Record<View, string> = { weeks: 'Week', months: 'Month', years: 'Year' }

/** "Week 1,891 of 5,200. Age 36, week 20: 26 Oct 2026 to 1 Nov 2026, this week": where the box sits in the whole
 * life first (left out with `total` null, for the short visible line), then the age and dates. */
function cellLabel(view: View, index: number, total: number | null, birthDate: CalendarDate | null, todayIndex: number): string {
  const perYear = BOXES_PER_YEAR[view]
  const age = Math.floor(index / perYear)
  // In years the age already says it ("Age 36" is year 37), so only weeks and months give a position.
  const position = total === null || view === 'years' ? '' : `${UNIT_NAMES[view]} ${(index + 1).toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')}. `
  let label = position + (view === 'years' ? `Age ${age}` : `Age ${age}, ${view === 'weeks' ? 'week' : 'month'} ${(index % perYear) + 1}`)
  if (!birthDate) return label
  const { start, end } = boxRange(view, birthDate, index)
  label += `: ${show(start)} to ${show(end)}`
  if (index === todayIndex) label += view === 'weeks' ? ', this week' : view === 'months' ? ', this month' : ', this year'
  else if (index < todayIndex) label += ', lived'
  return label
}

type Lookup = { eras: Map<string, Era>; moments: Map<string, Moment>; goals: Map<string, Goal>; birth: CalendarDate | null; today: CalendarDate }

/** "about 7 in 10 chance of being alive then", plus the 1-in-2 and 1-in-10 marks. */
function chanceLabel(index: number, chances: GridChances | undefined, todayIndex: number): string {
  if (!chances || index <= todayIndex) return ''
  const p = chances.principal[index]!
  const words = p >= 0.995 ? 'almost certainly alive then' : `${chanceWords(p)} chance of being alive then`
  if (index === chances.half) return `${words}; about half of people like you live beyond here`
  if (index === chances.tenth) return `${words}; about 1 in 10 people like you live beyond here`
  return words
}

/** Future boxes fade with the chance of being alive; a soft tint shows where ONS's projections disagree. */
function chanceStyle(index: number, chances: GridChances): CSSProperties {
  const p = chances.principal[index]!
  const spread = chances.high[index]! - chances.low[index]!
  const marker = index === chances.half || index === chances.tenth
  return {
    borderColor: `color-mix(in srgb, var(--color-ink-soft) ${Math.round(15 + 85 * p)}%, transparent)`,
    backgroundColor: spread > 0.02 ? `color-mix(in srgb, var(--color-accent) ${Math.round(Math.min(35, spread * 140))}%, transparent)` : undefined,
    outline: marker ? '1.5px solid var(--color-ink)' : undefined,
    outlineOffset: marker ? '1px' : undefined,
  }
}

/** What's in a box, in words: "goal: Retire (1,233 weeks to go); Uni, Living in Leeds; moment: Graduated". */
function storyLabel(box: BoxStory | undefined, { eras, moments, goals, birth, today }: Lookup): string {
  if (!box) return ''
  const parts = []
  if (box.goals.length && birth) {
    const named = box.goals.map((id) => {
      const goal = goals.get(id)!
      return `${goal.label} (${countdown(weeksToGo(today, goalDate(birth, goal)))})`
    })
    parts.push(`${box.goals.length === 1 ? 'goal' : 'goals'}: ${named.join(', ')}`)
  }
  if (box.eras.length) parts.push(`${box.eras.length === 1 ? 'era' : 'eras'}: ${box.eras.map((id) => eras.get(id)?.label).join(', ')}`)
  if (box.moments.length) {
    const names = box.moments.map((id) => moments.get(id)?.label).join(', ')
    parts.push(`${box.moments.length === 1 ? 'moment' : 'moments'}: ${names}`)
  }
  return parts.join('; ')
}

/** Era colour fill (faded for boxes still ahead) with thin stripes for overlapping eras, and a dot for moments. */
function storyStyle(
  box: BoxStory | undefined,
  state: string,
  { eras, goals }: Lookup,
  colourOf: Props['colourOf'],
  patterns: boolean,
): CSSProperties | undefined {
  if (!box) return undefined
  // A goal outlines its box in the goal's colour, over any fill (but never hides this week's marker).
  const goal = box.goals.length && state !== 'today' ? goals.get(box.goals[0]!) : undefined
  const outline: CSSProperties = goal ? { boxShadow: `inset 0 0 0 2px ${colourOf(goal)}`, borderColor: colourOf(goal) } : {}
  if (box.eras.length === 0 || state === 'today') return goal ? outline : undefined
  const [top, ...others] = box.eras.map((id) => colourOf(eras.get(id)!))
  const fill = state === 'ahead' ? `color-mix(in srgb, ${top} 35%, transparent)` : top
  const stripes = others.slice(0, 2).map((c, i) => `${c} ${i * 25}% ${(i + 1) * 25}%`)
  const layers = [
    patterns ? categoryPattern(eras.get(box.eras[0]!)!.category, state === 'ahead' ? top : undefined) : undefined,
    stripes.length ? `linear-gradient(to top, ${stripes.join(', ')}, transparent ${stripes.length * 25}%)` : undefined,
  ].filter(Boolean)
  return {
    backgroundColor: fill,
    borderColor: top,
    ...outline,
    backgroundImage: layers.length ? layers.join(', ') : undefined,
  }
}

/** The life grid for one view: a keyboard-navigable ARIA grid with one tab stop (ADR 0001). */
export const LifeGrid = memo(function LifeGrid(props: Props) {
  const { view, birthDate, today, years, story, eras, moments, goals, colourOf, chances, patterns = false, onOpenBox } = props
  const lookup: Lookup = { eras, moments, goals, birth: birthDate, today }
  const layout = LAYOUTS[view]
  const perYear = BOXES_PER_YEAR[view]
  const total = years * perYear
  const rows = Math.ceil(total / layout.perRow)
  const yearsPerRow = layout.perRow / perYear
  const todayIndex = birthDate ? boxIndex(view, birthDate, today) : -1
  const [focus, setFocus] = useState<{ view: View; index: number } | null>(null)
  const activeIndex =
    focus?.view === view ? Math.min(focus.index, total - 1) : Math.max(0, Math.min(todayIndex, total - 1))
  const gridRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [focusWithin, setFocusWithin] = useState(false)
  const detailIndex = hoverIndex ?? (focusWithin ? activeIndex : null)

  function moveTo(index: number) {
    const next = Math.max(0, Math.min(total - 1, index))
    setFocus({ view, index: next })
    gridRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    const rowStart = activeIndex - (activeIndex % layout.perRow)
    const moves: Record<string, number> = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      ArrowDown: activeIndex + layout.perRow,
      ArrowUp: activeIndex - layout.perRow,
      Home: e.ctrlKey ? 0 : rowStart,
      End: e.ctrlKey ? total - 1 : rowStart + layout.perRow - 1,
      PageDown: activeIndex + perYear * 10,
      PageUp: activeIndex - perYear * 10,
    }
    if ((e.key === 'Enter' || e.key === ' ') && onOpenBox) {
      e.preventDefault()
      onOpenBox(activeIndex)
      return
    }
    const target = moves[e.key]
    if (target === undefined) return
    e.preventDefault()
    moveTo(target)
  }

  const shape =
    view === 'weeks'
      ? 'Your life in weeks: one row per year of age, 52 weeks per row'
      : view === 'months'
        ? 'Your life in months: three years per row'
        : 'Your life in years: ten years per row'
  const lived = Math.max(0, Math.min(todayIndex, total))
  const label = birthDate ? `${shape}. ${lived.toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')} ${view} lived.` : shape

  return (
    <figure className={`flex w-full flex-col gap-2 ${layout.maxWidth} print:max-w-(--print-grid-width)`} data-testid="grid-figure">
      <div aria-hidden className="flex items-end text-[10px] text-ink-soft">
        <span className="w-8 shrink-0 pr-2 text-right whitespace-nowrap">Age ↓</span>
        <span className="font-display tracking-[0.12em] uppercase">{layout.columnTitle} →</span>
      </div>
      {layout.columnMarks.length > 0 && (
        <div
          aria-hidden
          className={`ml-8 grid text-[10px] text-ink-soft tabular-nums ${chances ? 'mr-10' : ''}`}
          style={{ gridTemplateColumns: `repeat(${layout.perRow}, minmax(0, 1fr))` }}
          data-testid="column-marks"
        >
          {layout.columnMarks.map((mark) => (
            <span
              key={mark}
              style={{ gridColumnStart: mark }}
              className={`whitespace-nowrap ${mark === layout.perRow ? 'justify-self-end' : ''}`}
            >
              {mark}
            </span>
          ))}
        </div>
      )}
      <p aria-hidden className="min-h-5 truncate text-xs text-ink-soft print:hidden" data-testid="box-details">
        {detailIndex !== null &&
          [
            cellLabel(view, detailIndex, null, birthDate, todayIndex),
            chanceLabel(detailIndex, chances, todayIndex),
            storyLabel(story.get(detailIndex), lookup),
          ]
            .filter(Boolean)
            .join(' · ')}
      </p>
      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        aria-rowcount={rows}
        aria-colcount={layout.perRow}
        className={`flex flex-col ${layout.gap}`}
        onKeyDown={onKeyDown}
        onFocus={() => setFocusWithin(true)}
        onBlur={() => setFocusWithin(false)}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {Array.from({ length: rows }, (_, row) => {
          const ageAtRow = row * yearsPerRow
          const rowStart = row * layout.perRow
          const inRow = (i: number) => i >= rowStart && i < rowStart + layout.perRow
          const mark = chances
            ? [inRow(chances.half) && '1 in 2', inRow(chances.tenth) && '1 in 10'].filter(Boolean).join(' · ')
            : ''
          return (
            <div key={row} className={`flex items-center ${row > 0 && ageAtRow % layout.breakEvery === 0 ? 'mt-1.5' : ''}`}>
              <span aria-hidden className="w-8 shrink-0 pr-2 text-right text-[10px] leading-none text-ink-soft tabular-nums">
                {ageAtRow % layout.labelEvery === 0 ? ageAtRow : ''}
              </span>
              <div
                role="row"
                aria-rowindex={row + 1}
                className={`grid min-w-0 flex-1 ${layout.gap}`}
                style={{ gridTemplateColumns: `repeat(${layout.perRow}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: Math.min(layout.perRow, total - row * layout.perRow) }, (_, col) => {
                  const index = row * layout.perRow + col
                  const state = index === todayIndex ? 'today' : index < todayIndex ? 'lived' : 'ahead'
                  const box = story.get(index)
                  const about = [chanceLabel(index, chances, todayIndex), storyLabel(box, lookup)].filter(Boolean).join('. ')
                  const storyLook = storyStyle(box, state, lookup, colourOf, patterns)
                  // The chances overlay sits under any era or goal styling, so its marks stay visible.
                  const chanceLook = chances && state === 'ahead' ? chanceStyle(index, chances) : undefined
                  const look = chanceLook || storyLook ? { ...chanceLook, ...storyLook } : undefined
                  return (
                    <div
                      key={col}
                      role="gridcell"
                      aria-colindex={col + 1}
                      data-index={index}
                      data-state={state}
                      tabIndex={index === activeIndex ? 0 : -1}
                      aria-label={cellLabel(view, index, total, birthDate, todayIndex) + (about ? `. ${about}` : '')}
                      data-eras={box?.eras.length || undefined}
                      data-moments={box?.moments.length || undefined}
                      data-goals={box?.goals.length || undefined}
                      data-chance={chances && state === 'ahead' ? chances.principal[index]!.toFixed(3) : undefined}
                      style={look}
                      onMouseEnter={() => setHoverIndex(index)}
                      onClick={() => {
                        setFocus({ view, index })
                        onOpenBox?.(index)
                      }}
                      className={
                        'relative aspect-square border ' +
                        (onOpenBox ? 'cursor-pointer ' : '') +
                        (box?.moments.length
                          ? "after:absolute after:inset-[28%] after:rounded-full after:bg-paper after:ring-1 after:ring-ink after:content-[''] "
                          : '') +
                        (view === 'years' ? 'rounded-[3px] ' : 'rounded-[1px] ') +
                        (state === 'lived'
                          ? 'border-ink bg-ink'
                          : state === 'today'
                            ? 'border-today bg-today ring-2 ring-ink ring-offset-2 ring-offset-paper'
                            : 'border-rule bg-transparent')
                      }
                    />
                  )
                })}
              </div>
              {chances && (
                <span aria-hidden className="w-10 shrink-0 pl-1.5 text-[10px] leading-none whitespace-nowrap text-ink-soft" data-testid={mark ? 'chance-mark' : undefined}>
                  {mark}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </figure>
  )
})
