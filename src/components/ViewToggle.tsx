import type { View } from '../life/lifeMaths'

const VIEWS: { view: View; label: string }[] = [
  { view: 'years', label: 'Years' },
  { view: 'months', label: 'Months' },
  { view: 'weeks', label: 'Weeks' },
]

/** Years / Months / Weeks, as a group of radio buttons styled as a segmented control. */
export function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <fieldset className="flex w-fit rounded-sm border border-ink p-0.5">
      <legend className="sr-only">Show your life in</legend>
      {VIEWS.map((option) => (
        <label
          key={option.view}
          className={
            'cursor-pointer rounded-[2px] px-3 py-1 font-display text-sm tracking-wide has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-today ' +
            (option.view === view ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-deep')
          }
        >
          <input
            type="radio"
            name="view"
            value={option.view}
            checked={option.view === view}
            onChange={() => onChange(option.view)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
