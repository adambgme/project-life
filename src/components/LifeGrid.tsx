import { memo, useRef, useState, type KeyboardEvent } from 'react'
import { BOXES_PER_YEAR, boxIndex, boxRange, type CalendarDate, type View } from '../life/lifeMaths'

type Props = {
  view: View
  birthDate: CalendarDate | null
  today: CalendarDate
  years: number
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

function cellLabel(view: View, index: number, birthDate: CalendarDate | null, todayIndex: number): string {
  const perYear = BOXES_PER_YEAR[view]
  const age = Math.floor(index / perYear)
  let label = view === 'years' ? `Age ${age}` : `Age ${age}, ${view === 'weeks' ? 'week' : 'month'} ${(index % perYear) + 1}`
  if (!birthDate) return label
  const { start, end } = boxRange(view, birthDate, index)
  label += `: ${show(start)} to ${show(end)}`
  if (index === todayIndex) label += view === 'weeks' ? ', this week' : view === 'months' ? ', this month' : ', this year'
  else if (index < todayIndex) label += ', lived'
  return label
}

/** The life grid for one view: a keyboard-navigable ARIA grid with one tab stop (ADR 0001). */
export const LifeGrid = memo(function LifeGrid({ view, birthDate, today, years }: Props) {
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
    const target = moves[e.key]
    if (target === undefined) return
    e.preventDefault()
    moveTo(target)
  }

  const label =
    view === 'weeks'
      ? 'Your life in weeks: one row per year of age, 52 weeks per row'
      : view === 'months'
        ? 'Your life in months: three years per row'
        : 'Your life in years: ten years per row'

  return (
    <figure className={`flex w-full flex-col gap-2 ${layout.maxWidth}`}>
      <div aria-hidden className="flex items-end text-[10px] text-ink-soft">
        <span className="w-8 shrink-0 pr-2 text-right whitespace-nowrap">Age ↓</span>
        <span className="font-display tracking-[0.12em] uppercase">{layout.columnTitle} →</span>
      </div>
      {layout.columnMarks.length > 0 && (
        <div aria-hidden className="ml-8 grid text-[10px] text-ink-soft tabular-nums" style={{ gridTemplateColumns: `repeat(${layout.perRow}, minmax(0, 1fr))` }}>
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
      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        aria-rowcount={rows}
        aria-colcount={layout.perRow}
        className={`flex flex-col ${layout.gap}`}
        onKeyDown={onKeyDown}
      >
        {Array.from({ length: rows }, (_, row) => {
          const ageAtRow = row * yearsPerRow
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
                  return (
                    <div
                      key={col}
                      role="gridcell"
                      aria-colindex={col + 1}
                      data-index={index}
                      data-state={state}
                      tabIndex={index === activeIndex ? 0 : -1}
                      aria-label={cellLabel(view, index, birthDate, todayIndex)}
                      onClick={() => setFocus({ view, index })}
                      className={
                        'aspect-square border ' +
                        (view === 'years' ? 'rounded-[3px] ' : 'rounded-[1px] ') +
                        (state === 'lived'
                          ? 'border-accent bg-accent'
                          : state === 'today'
                            ? 'border-today bg-today ring-1 ring-today ring-offset-1 ring-offset-paper'
                            : 'border-rule bg-transparent')
                      }
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </figure>
  )
})
