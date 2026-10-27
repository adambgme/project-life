import type { LifeProgress } from '../life/mortality'

type Props = { progress: LifeProgress; who: 'you' | string; source: string }

/** How much of an average lifetime is lived, as a bar: lived in ink, ahead in a light wash, with the share in words
 * beside it so nothing depends on reading the bar. */
export function LifeBar({ progress, who, source }: Props) {
  const percent = Math.round(progress.fraction * 100)
  const years = Math.round(progress.yearsLeft)
  return (
    <div className="flex flex-col gap-1.5" data-testid="life-bar">
      <p className="text-base">
        That's about <strong className="font-semibold">{percent}%</strong> of an average lifetime for{' '}
        {who === 'you' ? 'people like you' : `people like ${who}`}: around {years} {years === 1 ? 'year' : 'years'} to go, to
        about {progress.expectedYear}.
      </p>
      <div
        role="progressbar"
        aria-label="Share of an average lifetime lived"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        className="h-3 w-full max-w-xl overflow-hidden rounded-[4px] bg-rule/50 print:border print:border-rule"
      >
        <div className="h-full rounded-r-[4px] bg-ink" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-ink-soft">An average for a large group of people, not a forecast for anyone. {source}</p>
    </div>
  )
}
