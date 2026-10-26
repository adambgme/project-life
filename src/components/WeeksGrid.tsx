import { memo, useRef, useState, type KeyboardEvent } from 'react'
import { WEEKS_PER_ROW, weekIndex, weekRange, type CalendarDate } from '../life/lifeMaths'

type Props = {
  birthDate: CalendarDate | null
  today: CalendarDate
  years: number
}

const formatDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const show = ({ year, month, day }: CalendarDate) => formatDate.format(new Date(Date.UTC(year, month - 1, day)))

function cellLabel(index: number, birthDate: CalendarDate | null, todayIndex: number): string {
  const age = Math.floor(index / WEEKS_PER_ROW)
  const week = (index % WEEKS_PER_ROW) + 1
  let label = `Age ${age}, week ${week}`
  if (!birthDate) return label
  const { start, end } = weekRange(birthDate, index)
  label += `: ${show(start)} to ${show(end)}`
  if (index === todayIndex) label += ', this week'
  else if (index < todayIndex) label += ', lived'
  return label
}

/** One row per year of age, 52 boxes per row. A keyboard-navigable ARIA grid with one tab stop. */
export const WeeksGrid = memo(function WeeksGrid({ birthDate, today, years }: Props) {
  const total = years * WEEKS_PER_ROW
  const todayIndex = birthDate ? weekIndex(birthDate, today) : -1
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const activeIndex = focusIndex ?? Math.max(0, Math.min(todayIndex, total - 1))
  const gridRef = useRef<HTMLDivElement>(null)

  function moveTo(index: number) {
    const next = Math.max(0, Math.min(total - 1, index))
    setFocusIndex(next)
    gridRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    const rowStart = activeIndex - (activeIndex % WEEKS_PER_ROW)
    const moves: Record<string, number> = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      ArrowDown: activeIndex + WEEKS_PER_ROW,
      ArrowUp: activeIndex - WEEKS_PER_ROW,
      Home: e.ctrlKey ? 0 : rowStart,
      End: e.ctrlKey ? total - 1 : rowStart + WEEKS_PER_ROW - 1,
      PageDown: activeIndex + WEEKS_PER_ROW * 10,
      PageUp: activeIndex - WEEKS_PER_ROW * 10,
    }
    const target = moves[e.key]
    if (target === undefined) return
    e.preventDefault()
    moveTo(target)
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Your life in weeks: one row per year of age, 52 weeks per row"
      aria-rowcount={years}
      aria-colcount={WEEKS_PER_ROW}
      className="flex flex-col gap-[2px] sm:gap-[3px]"
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: years }, (_, age) => (
        <div
          key={age}
          role="row"
          aria-rowindex={age + 1}
          className={`grid grid-cols-[repeat(52,minmax(0,1fr))] gap-[1px] sm:gap-[2px] ${age > 0 && age % 10 === 0 ? 'mt-1.5' : ''}`}
        >
          {Array.from({ length: WEEKS_PER_ROW }, (_, week) => {
            const index = age * WEEKS_PER_ROW + week
            const state = index === todayIndex ? 'today' : index < todayIndex ? 'lived' : 'ahead'
            return (
              <div
                key={week}
                role="gridcell"
                aria-colindex={week + 1}
                data-index={index}
                data-state={state}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-label={cellLabel(index, birthDate, todayIndex)}
                onClick={() => setFocusIndex(index)}
                className={
                  'aspect-square rounded-[1px] border ' +
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
      ))}
    </div>
  )
})
