import { CATEGORIES, CATEGORY_NAMES, categoryColour, type Category, type Era, type Moment } from '../life/story'

type Props = { eras: Era[]; moments: Moment[]; colours: Partial<Record<Category, string>> }

/** What the colours and marks on the grid mean: the categories in use, plus lived, this week and moments. */
export function Legend({ eras, moments, colours }: Props) {
  const used = CATEGORIES.filter((c) => eras.some((e) => e.category === c) || moments.some((m) => m.category === c))
  const item = 'flex items-center gap-1.5'
  const swatch = 'inline-block size-3 rounded-[2px] border'
  return (
    <ul aria-label="Key" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" data-testid="legend">
      <li className={item}>
        <span aria-hidden className={`${swatch} border-accent bg-accent`} />
        Lived
      </li>
      <li className={item}>
        <span aria-hidden className={`${swatch} border-today bg-today`} />
        Now
      </li>
      {used.map((category) => (
        <li key={category} className={item}>
          <span
            aria-hidden
            className={swatch}
            style={{ background: categoryColour(category, colours), borderColor: categoryColour(category, colours) }}
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
      <li className={item}>
        <span aria-hidden className={`${swatch} border-rule`} />
        Ahead
      </li>
    </ul>
  )
}
