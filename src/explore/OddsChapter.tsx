import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { OddsStep } from './oddsSteps'

/** Whether a media query matches now, kept up to date. */
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

// Steps beside a chart that stays put need the width, and are motion: phones and reduced motion get the still version.
const STEPPED = '(min-width: 48rem) and (prefers-reduced-motion: no-preference)'

type Props = {
  steps: OddsStep[]
  /** The survival chart, with one step picked out (stepped) or every step marked (still). */
  chart: (show: { highlight?: OddsStep; marks?: OddsStep[] }) => ReactNode
}

/**
 * "Your odds, step by step": on wide screens the chart stays in place while the sentences scroll past it, and the one
 * in the middle of the screen picks out its point (the data-journalism "sticky graphic" pattern: CSS sticky, and an
 * IntersectionObserver for the step). Elsewhere, a still chart with every point marked and the sentences beneath it.
 * Either way every sentence is on the page, readable without scrolling through it.
 */
export function OddsChapter({ steps, chart }: Props) {
  const stepped = useMedia(STEPPED) && steps.length > 1
  const [active, setActive] = useState(0)
  const list = useRef<HTMLOListElement>(null)
  // New figures (another nation's tables arriving, say) can bring new ages, and so new step elements to watch.
  const ages = steps.map((step) => step.age).join()

  useEffect(() => {
    if (!stepped || !list.current) return
    const items = [...list.current.querySelectorAll<HTMLElement>('[data-step]')]
    // The step crossing the middle of the screen (a band a tenth of its height) is the active one.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step))
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [stepped, ages])

  if (!stepped) {
    return (
      <div className="flex flex-col gap-3" data-testid="odds" data-mode="still">
        {chart({ marks: steps })}
        <ol className="flex flex-col gap-2 border-l-2 border-accent pl-4">
          {steps.map((step) => (
            <li key={step.age}>{step.text}</li>
          ))}
        </ol>
      </div>
    )
  }

  const current = steps[Math.min(active, steps.length - 1)]!
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8" data-testid="odds" data-mode="stepped">
      <ol ref={list} className="flex flex-col py-[20vh]">
        {steps.map((step, i) => (
          <li
            key={step.age}
            data-step={i}
            aria-current={i === active ? 'step' : undefined}
            className="flex min-h-[55vh] items-center first:min-h-[35vh] last:min-h-[35vh]"
          >
            <p
              className={`font-display text-xl leading-snug transition-colors duration-500 ${i === active ? 'text-ink' : 'text-ink-soft'}`}
            >
              {step.text}
            </p>
          </li>
        ))}
      </ol>
      <div className="sticky top-[20vh] self-start">{chart({ highlight: current })}</div>
    </div>
  )
}
