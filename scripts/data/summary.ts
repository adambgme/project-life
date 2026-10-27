/**
 * A plain summary of what a data refresh changed, for the PR body: compares the generated data committed at HEAD with
 * the freshly built files (`node scripts/data/summary.ts`).
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

type Table = {
  firstYear: number
  maxAge: number
  scale: number
  rates: Record<'male' | 'female', { principal: number[][] }>
}
type Snapshot = { uk: Table; causesYear: number; deprivationPeriod: string; countries: number }

/** Period life expectancy at birth in `year` (qx per 100,000 × scale, years stored as differences; past the last age
 * the rates rise at the pace of the last two ages, as in the app). */
export function periodExpectancy(table: Table, sex: 'male' | 'female', year: number): number {
  const rows = table.rates[sex].principal
  let row = [...rows[0]!]
  for (let y = 1; y <= Math.min(year - table.firstYear, rows.length - 1); y++) row = row.map((v, age) => v + rows[y]![age]!)
  const q = row.map((v) => v / table.scale / 100_000)
  let alive = 1
  let years = 0.5
  for (let age = 0; age < 120; age++) {
    const last = q[table.maxAge]!
    const before = q[table.maxAge - 1]!
    const rate = age <= table.maxAge ? q[age]! : Math.min(1, before > 0 ? last * (last / before) ** (age - table.maxAge) : last)
    alive *= 1 - rate
    years += alive
  }
  return years
}

export function describeChanges(before: Snapshot, after: Snapshot, year: number): string {
  const lines: string[] = []
  for (const [sex, word] of [['male', 'men'], ['female', 'women']] as const) {
    const [a, b] = [periodExpectancy(before.uk, sex, year), periodExpectancy(after.uk, sex, year)]
    const d = b - a
    lines.push(`- UK life expectancy at birth, ${word}, ${year}: ${a.toFixed(2)} → ${b.toFixed(2)} (${d >= 0 ? '+' : ''}${d.toFixed(2)})`)
  }
  if (after.causesYear !== before.causesYear) lines.push(`- Causes of death: ${before.causesYear} → ${after.causesYear} registrations`)
  if (after.deprivationPeriod !== before.deprivationPeriod) lines.push(`- Deprivation: ${before.deprivationPeriod} → ${after.deprivationPeriod}`)
  if (after.countries !== before.countries) lines.push(`- Countries: ${before.countries} → ${after.countries}`)
  return lines.join('\n')
}

const FILES = { uk: 'src/data/mortality/uk.json', causes: 'src/data/causes/england-wales.json', deprivation: 'src/data/deprivation.json' }

function snapshot(read: (path: string) => string, countries: number): Snapshot {
  return {
    uk: JSON.parse(read(FILES.uk)),
    causesYear: JSON.parse(read(FILES.causes)).year,
    deprivationPeriod: JSON.parse(read(FILES.deprivation)).england.period,
    countries,
  }
}

if (import.meta.main) {
  const root = new URL('../../', import.meta.url)
  const committed = (path: string) => execFileSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8' })
  const countriesAtHead = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', 'public/data/countries/'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean).length
  const before = snapshot(committed, countriesAtHead)
  const after = snapshot((path) => readFileSync(new URL(path, root), 'utf8'), readdirSync(new URL('public/data/countries/', root)).length)
  console.log(describeChanges(before, after, new Date().getFullYear()))
}
