import type { CSSProperties } from 'react'
import type { Ahead } from '../life/ahead'

type Props = { ahead: Ahead; lifeExpectancy: number; isExample: boolean }

/** "What's ahead": the summers and weekends left at the average age for people like you, with the summers drawn as
 * dots (been, and ahead) that fill in as the row comes up the screen (styles.css, [data-summers]). */
export function AheadSection({ ahead, lifeExpectancy, isExample }: Props) {
  const average = Math.round(lifeExpectancy)
  const weekends = (Math.round(ahead.weekendsAhead / 10) * 10).toLocaleString('en-GB')
  const total = ahead.summersLived + ahead.summersAhead
  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-2xl leading-snug text-balance" data-testid="ahead">
        {isExample ? `If Sam lives to the average age for people like Sam, ${average}` : `If you live to the average age for people like you, ${average}`}
        , that's about <strong className="font-semibold">{ahead.summersAhead} more summers</strong> and{' '}
        <strong className="font-semibold">{weekends} more weekends</strong>.
      </p>
      <div
        role="img"
        aria-label={`${ahead.summersLived} summers so far, and about ${ahead.summersAhead} ahead`}
        className="flex flex-wrap gap-1.5"
        data-summers
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full ${i < ahead.summersLived ? 'bg-ink' : 'border border-ink-soft'}`}
            style={{ '--p': i / total } as CSSProperties}
          />
        ))}
      </div>
      <p className="text-sm text-ink-soft">
        Each dot is a summer: the filled ones have been, the open ones are ahead. An average for a large group of people,
        not a forecast for anyone.
      </p>
    </div>
  )
}
