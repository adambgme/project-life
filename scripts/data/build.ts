/** Turn the cached sources into the JSON the app uses: one file per UK nation in src/data/mortality/ (bundled), one
 * per country in public/data/countries/ (fetched from the site when picked), causes and deprivation in src/data/. */
import { createReadStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import { extendWithCohorts } from './combine.ts'
import { MAX_AGE, parseQxSheet } from './onsQx.ts'
import { parseCausesCsv } from './nomisCauses.ts'
import { parseDeprivation } from './onsDeprivation.ts'
import { CAUSES, DEPRIVATION, NATIONS, PROJECTIONS, VARIANTS, WPP, qxFile } from './sources.ts'
import { WPP_MAX_AGE, checkPlausible, readWpp, type WppCountry } from './wpp.ts'
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

// Causes of death, England and Wales (latest registrations year).
const causes = parseCausesCsv(readFileSync(new URL(`../../data-cache/${CAUSES.name}`, import.meta.url), 'utf8'))
const causesOut = new URL('../../src/data/causes/', import.meta.url)
mkdirSync(causesOut, { recursive: true })
const causesJson = JSON.stringify({
  area: 'England and Wales',
  source: { title: CAUSES.title, url: CAUSES.page(causes.year), attribution: CAUSES.attribution, year: causes.year },
  ...causes,
})
writeFileSync(new URL('england-wales.json', causesOut), causesJson + '\n')
console.log(`causes/england-wales.json: ${(causesJson.length / 1024).toFixed(0)} KB (${causes.year}, ${causes.causes.length} causes)`)

// Other countries (UN WPP 2024, medium variant): one file each, in the same encoding as the nations' tables.
const bySex: Record<string, Map<string, WppCountry>> = {}
for (const file of WPP.files) {
  const reader = readWpp(file.sex)
  const input = createReadStream(new URL(`../../data-cache/${file.name}`, import.meta.url)).pipe(createGunzip())
  for await (const line of createInterface({ input })) reader.line(line)
  bySex[file.sex] = reader.finish()
  bySex[file.sex]!.forEach(checkPlausible)
  // WPP 2024 covers 237 countries and areas; far fewer means the file or its layout changed.
  if (bySex[file.sex]!.size < 230) throw new Error(`WPP ${file.sex}: only ${bySex[file.sex]!.size} countries`)
}
const countriesOut = new URL('../../public/data/countries/', import.meta.url)
rmSync(countriesOut, { recursive: true, force: true })
mkdirSync(countriesOut, { recursive: true })
const index: { code: string; name: string }[] = []
let countryBytes = 0
for (const [code, male] of bySex.male!) {
  const female = bySex.female!.get(code)
  if (!female) throw new Error(`WPP: ${code} has male tables but no female ones`)
  const encode = (c: WppCountry) => ({ principal: differences(c.qx.map((ages) => ages.map((q) => fourFigures(Math.round(q * 100_000 * SCALE))))) })
  const json = JSON.stringify({
    nation: code.toLowerCase(),
    name: male.name,
    source: { ...WPP, files: undefined },
    firstYear: male.firstYear,
    lastYear: male.firstYear + male.qx.length - 1,
    maxAge: WPP_MAX_AGE,
    scale: SCALE,
    encoding: 'year-differences',
    rates: { male: encode(male), female: encode(female) },
  })
  writeFileSync(new URL(`${code.toLowerCase()}.json`, countriesOut), json + '\n')
  countryBytes += json.length
  index.push({ code: code.toLowerCase(), name: male.name })
}
index.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
writeFileSync(new URL('../../src/data/countries.json', import.meta.url), JSON.stringify(index) + '\n')
console.log(`countries: ${index.length} files, ${(countryBytes / 1024 / 1024).toFixed(1)} MB in all`)

// Life expectancy by area deprivation (England: tenths; Wales: fifths).
const deprivation: Record<string, unknown> = {}
for (const file of DEPRIVATION.files) {
  const path = new URL(`../../data-cache/${file.name}`, import.meta.url)
  deprivation[file.nation] = parseDeprivation(await readSheetRows(path, '1'), await readSheetRows(path, '4'))
}
const deprivationJson = JSON.stringify({ source: { ...DEPRIVATION, files: undefined }, ...deprivation })
writeFileSync(new URL('../../src/data/deprivation.json', import.meta.url), deprivationJson + '\n')
console.log(`deprivation.json: ${(deprivationJson.length / 1024).toFixed(0)} KB`)
