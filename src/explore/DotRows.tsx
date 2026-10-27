export type DotRow = { key: string; label: string; value: number; chosen?: boolean; chosenWords?: string }

/** A dot plot on a shared scale, one row each. A chosen row has a filled, larger dot and a bold label, so colour isn't
 * needed to tell it apart. Every dot is labelled with its value. */
export function DotRows({ rows, label, testId }: { rows: DotRow[]; label: string; testId?: string }) {
  const values = rows.map((r) => r.value)
  const min = Math.floor(Math.min(...values) - 1)
  const max = Math.ceil(Math.max(...values) + 1)
  const at = (v: number) => `${((v - min) / (max - min)) * 100}%`
  return (
    <ul className="flex flex-col gap-3" aria-label={label} data-testid={testId}>
      {rows.map(({ key, label, value, chosen, chosenWords }) => (
        <li key={key} className="grid grid-cols-[9rem_1fr] items-center gap-3 text-sm">
          <span className={chosen ? 'font-semibold' : 'text-ink-soft'}>
            {label}
            {chosen && chosenWords && <span className="sr-only"> ({chosenWords})</span>}
          </span>
          <span className="relative mr-10 h-6 border-b border-rule">
            <span
              aria-hidden
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${chosen ? 'size-3.5 bg-accent ring-2 ring-paper' : 'size-2.5 border-2 border-ink-soft bg-paper'}`}
              style={{ left: at(value) }}
            />
            <span className={`absolute -top-1 translate-x-2 tabular-nums ${chosen ? 'font-semibold' : ''}`} style={{ left: at(value) }}>
              {value.toFixed(1)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
