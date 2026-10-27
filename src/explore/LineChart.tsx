import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

export type Point = { x: number; y: number; lo?: number; hi?: number }

type Props = {
  /** The main series; `lo`/`hi` draw an uncertainty band as a light wash. */
  points: Point[]
  /** A second series to compare against, at the same x values: drawn dashed, so it never relies on colour. With it,
   * both series are named in a legend, the readout and the table; `label` names the main one. */
  compare?: { label: string; points: Point[] }
  label?: string
  /** What the chart shows, for screen readers (the visible title is outside). */
  summary: string
  yScale?: 'linear' | 'log'
  yDomain: [number, number]
  yTicks: number[]
  formatY: (y: number) => string
  xTicks: number[]
  xLabel: string
  /** Labelled points along the line, e.g. "1 in 2". */
  marks?: { x: number; label: string }[]
  /** The readout for the hovered or focused point (also the table rows). */
  describe: (p: Point) => { value: string; detail?: string }
  /** Columns for the table view. */
  table: { xHeader: string; yHeader: string; every: number }
}

const M = { top: 16, right: 24, bottom: 36, left: 68 }

/** The element's width in CSS pixels, so the chart draws at its real size and its text stays readable on phones. */
function useWidth<T extends Element>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** A line chart (one series, or two to compare) with an optional band: 2px line, 10% wash, hairline grid, crosshair readout on hover
 * and with the arrow keys, and a table view so no value depends on hovering. */
export function LineChart(props: Props) {
  const { points, compare, label, summary, yScale = 'linear', yDomain, yTicks, formatY, xTicks, xLabel, marks = [], describe, table } = props
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const [frame, measured] = useWidth<HTMLDivElement>()
  const W = Math.max(280, measured)
  const H = W < 480 ? 220 : 280
  const x0 = points[0]!.x
  const x1 = points[points.length - 1]!.x
  const sx = (x: number) => M.left + ((x - x0) / (x1 - x0 || 1)) * (W - M.left - M.right)
  const toUnit = (y: number) =>
    yScale === 'log'
      ? (Math.log10(y) - Math.log10(yDomain[0])) / (Math.log10(yDomain[1]) - Math.log10(yDomain[0]))
      : (y - yDomain[0]) / (yDomain[1] - yDomain[0])
  const sy = (y: number) => H - M.bottom - Math.min(1, Math.max(0, toUnit(y))) * (H - M.top - M.bottom)

  const path = (series: Point[]) => series.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('')
  const line = path(points)
  const comparing = (i: number) => compare?.points[i]
  const banded = points.filter((p) => p.lo !== undefined && p.hi !== undefined)
  const band = banded.length
    ? banded.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.hi!).toFixed(1)}`).join('') +
      [...banded].reverse().map((p) => `L${sx(p.x).toFixed(1)} ${sy(p.lo!).toFixed(1)}`).join('') +
      'Z'
    : ''

  function nearest(clientX: number, rect: DOMRect) {
    const x = x0 + ((clientX - rect.left) / rect.width * W - M.left) / (W - M.left - M.right) * (x1 - x0)
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[best]!.x - x)) best = i
    })
    return best
  }

  function onKey(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    setActive((i) => Math.max(0, Math.min(points.length - 1, (i ?? -1) + step)))
  }

  const p = active === null ? null : points[active]!
  const c = active === null ? undefined : comparing(active)
  const readout = p && describe(p)
  const dashed = '6 4'

  return (
    <div className="flex flex-col gap-2">
      {compare && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-hidden data-testid="chart-legend">
          {[
            { name: label, dash: undefined, colour: 'var(--color-accent)' },
            { name: compare.label, dash: dashed, colour: 'var(--color-ink)' },
          ].map((item) => (
            <li key={item.name} className="flex items-center gap-2">
              <svg width="28" height="8" aria-hidden>
                <line x1="1" x2="27" y1="4" y2="4" stroke={item.colour} strokeWidth={2} strokeDasharray={item.dash} strokeLinecap="round" />
              </svg>
              {item.name}
            </li>
          ))}
        </ul>
      )}
      <div className="relative" ref={frame}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none overflow-visible outline-offset-4"
          role="img"
          aria-label={summary}
          aria-describedby={`${id}-readout`}
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => setActive((i) => i ?? 0)}
          onBlur={() => setActive(null)}
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} stroke="var(--color-rule)" strokeWidth={1} />
              <text x={M.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-ink-soft text-[11px] tabular-nums">
                {formatY(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={H - M.bottom + 18} textAnchor="middle" className="fill-ink-soft text-[11px] tabular-nums">
              {t}
            </text>
          ))}
          <text x={W - M.right} y={H - 4} textAnchor="end" className="fill-ink-soft text-[11px]">
            {xLabel}
          </text>
          {band && <path d={band} fill="var(--color-accent)" fillOpacity={0.12} />}
          {compare && <path d={path(compare.points)} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeDasharray={dashed} strokeLinejoin="round" />}
          <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {marks.map((m) => {
            const at = points.reduce((a, b) => (Math.abs(b.x - m.x) < Math.abs(a.x - m.x) ? b : a))
            return (
              <g key={m.label}>
                <circle cx={sx(at.x)} cy={sy(at.y)} r={4.5} fill="var(--color-accent)" stroke="var(--color-paper)" strokeWidth={2} />
                <text x={sx(at.x) + 8} y={sy(at.y) - 8} className="fill-ink text-[12px]">
                  {m.label}
                </text>
              </g>
            )
          })}
          {p && (
            <g aria-hidden>
              <line x1={sx(p.x)} x2={sx(p.x)} y1={M.top} y2={H - M.bottom} stroke="var(--color-ink-soft)" strokeWidth={1} />
              <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill="var(--color-accent)" stroke="var(--color-paper)" strokeWidth={2} />
              {c && <circle cx={sx(c.x)} cy={sy(c.y)} r={4.5} fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth={2} />}
            </g>
          )}
        </svg>
        <div
          id={`${id}-readout`}
          aria-live="polite"
          className={`pointer-events-none absolute top-0 rounded-sm border border-rule bg-paper px-2 py-1 text-sm shadow-sm ${readout ? '' : 'sr-only'}`}
          style={p ? { left: `min(calc(${(sx(p.x) / W) * 100}% + 8px), calc(100% - 11rem))` } : undefined}
          data-testid="chart-readout"
        >
          {readout && (
            <>
              <strong className="block font-semibold">
                {compare ? `${label}: ` : ''}
                {readout.value}
              </strong>
              {c && compare && (
                <strong className="block font-semibold">
                  {compare.label}: {describe(c).value}
                </strong>
              )}
              <span className="text-ink-soft">{readout.detail}</span>
            </>
          )}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft">Show the numbers</summary>
        <table className="mt-2 w-full max-w-sm text-left tabular-nums">
          <thead>
            <tr className="border-b border-rule">
              <th className="py-1 font-normal text-ink-soft">{table.xHeader}</th>
              <th className="py-1 font-normal text-ink-soft">{compare ? label : table.yHeader}</th>
              {compare && <th className="py-1 font-normal text-ink-soft">{compare.label}</th>}
            </tr>
          </thead>
          <tbody>
            {points.map((pt, i) =>
              pt.x % table.every === 0 ? (
                <tr key={pt.x} className="border-b border-rule/60">
                  <td className="py-0.5">{pt.x}</td>
                  <td className="py-0.5">{describe(pt).value}</td>
                  {compare && <td className="py-0.5">{describe(comparing(i)!).value}</td>}
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </details>
    </div>
  )
}
