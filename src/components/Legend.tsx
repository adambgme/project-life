import { CATEGORIES, CATEGORY_NAMES, categoryColour, categoryPattern, type Category, type Era, type Goal, type Moment } from '../life/story'

type Props = {
  eras: Era[]
  moments: Moment[]
  goals: Goal[]
  colours: Partial<Record<Category, string>>
  chances?: boolean
  /** The 1-in-2 mark alone (without the chances). */
  half?: boolean
  patterns?: boolean
}

/** What the colours and marks on the grid mean: the categories in use, plus lived, this week and moments. */
export function Legend({ eras, moments, goals, colours, chances, half, patterns }: Props) {
  const used = CATEGORIES.filter((c) => [...eras, ...moments, ...goals].some((entry) => entry.category === c))
  const item = 'flex items-center gap-1.5'
  const swatch = 'inline-block size-3 rounded-[2px] border'
  return (
    <ul aria-label="Key" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" data-testid="legend" data-print-part>
      <li className={item}>
        <span aria-hidden className={`${swatch} border-ink bg-ink`} />
        Lived
      </li>
      <li className={item}>
        <span aria-hidden className={`${swatch} border-today bg-today ring-1 ring-ink ring-offset-1 ring-offset-paper`} />
        Now
      </li>
      {used.map((category) => (
        <li key={category} className={item}>
          <span
            aria-hidden
            className={swatch}
            style={{
              backgroundColor: categoryColour(category, colours),
              // Only eras are textured on the grid, so only their categories are in the key.
              backgroundImage: patterns && eras.some((e) => e.category === category) ? categoryPattern(category) : undefined,
              borderColor: categoryColour(category, colours),
            }}
          />
          {CATEGORY_NAMES[category]}
        </li>
      ))}
      {moments.length > 0 && (
        <li className={item}>
          <span aria-hidden className="inline-block size-2 rounded-full bg-paper ring-1 ring-ink" />
          Moment
        </li>
      )}
      {goals.length > 0 && (
        <li className={item}>
          <span aria-hidden className={`${swatch} border-2 border-ink`} />
          Goal
        </li>
      )}
      <li className={item}>
        <span aria-hidden className={`${swatch} border-rule`} />
        Ahead
      </li>
      {half && !chances && (
        <li className={item}>
          <span aria-hidden className={`${swatch} border-rule outline outline-1 outline-offset-1 outline-ink`} />
          Where 1 in 2 people like you are still alive
        </li>
      )}
      {chances && (
        <>
          <li className={item}>
            <span aria-hidden className={`${swatch} border-ink-soft`} />
            <span aria-hidden className={`${swatch} border-ink-soft/30`} />
            Fades with the chance of being alive
          </li>
          <li className={item}>
            <span aria-hidden className={`${swatch} border-rule bg-accent/25`} />
            Tinted where ONS projections differ
          </li>
          <li className={item}>
            <span aria-hidden className={`${swatch} border-rule outline outline-1 outline-offset-1 outline-ink`} />
            Where 1 in 2 and 1 in 10 people like you are still alive
          </li>
        </>
      )}
    </ul>
  )
}
