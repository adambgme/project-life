/** Turn the cached ONS spreadsheets into one JSON file per nation in src/data/mortality/. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { extendWithCohorts } from './combine.ts'
import { MAX_AGE, parseQxSheet } from './onsQx.ts'
import { NATIONS, PROJECTIONS, VARIANTS, qxFile } from './sources.ts'
import { readSheetRows } from './xlsx.ts'

/** Follow everyone alive today (born 1900 onwards) and anyone born before 2030 to age 100. */
const LAST_YEAR = 2030 + MAX_AGE
/** Rates are stored as integers: qx per 100,000 × SCALE, to 4 significant figures (a change of under 0.05% of a
 * rate). Each year after the first is stored as the difference from the year before, which compresses well because
 * rates change smoothly; src/life/mortalityData.ts decodes it. */
const SCALE = 100
const fourFigures = (n: number) => Number(n.toPrecision(4))
const differences = (rows: number[][]) => rows.map((row, i) => (i === 0 ? row : row.map((v, age) => v - rows[i - 1]![age]!)))
const SEXES = { male: 'males', female: 'females' } as const

const out = new URL('../../src/data/mortality/', import.meta.url)
mkdirSync(out, { recursive: true })

for (const nation of NATIONS) {
  const rates: Record<string, Record<string, number[][]>> = { male: {}, female: {} }
  let firstYear = 0
  for (const variant of VARIANTS) {
    const file = new URL(`../../data-cache/${qxFile(nation, variant).name}`, import.meta.url)
    for (const [sex, sheetSex] of Object.entries(SEXES)) {
      const period = parseQxSheet(await readSheetRows(file, `${sheetSex} period qx`), 'Year')
      const cohort = parseQxSheet(await readSheetRows(file, `${sheetSex} cohort qx`), 'Year of birth')
      const table = extendWithCohorts(period, cohort, LAST_YEAR, MAX_AGE)
      // Keep the projection years only (from the edition's base year); earlier years are history.
      const base = Number(PROJECTIONS.edition.slice(0, 4))
      firstYear = base
      const rows = table.qx.slice(base - table.first).map((ages) => ages.map((q) => fourFigures(Math.round(q * SCALE))))
      rates[sex]![variant] = differences(rows)
    }
  }
  const data = {
    nation,
    source: PROJECTIONS,
    firstYear,
    lastYear: LAST_YEAR,
    maxAge: MAX_AGE,
    scale: SCALE,
    encoding: 'year-differences',
    rates,
  }
  const json = JSON.stringify(data)
  writeFileSync(new URL(`${nation}.json`, out), json + '\n')
  console.log(`${nation}.json: ${(json.length / 1024).toFixed(0)} KB`)
}
