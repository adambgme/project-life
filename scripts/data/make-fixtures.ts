/** Save small extracts of real source sheets for the parser tests. Run after `npm run data:fetch`. */
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import { readSheetRows } from './xlsx.ts'

const rows = await readSheetRows(new URL('../../data-cache/ukppp24qx.xlsx', import.meta.url), 'males period qx')
const header = rows.findIndex((row) => row[0] === 'Exact age (years)')
const yearCol = rows[header]!.findIndex((cell) => String(cell).endsWith('2024'))
const trimmed = rows.slice(0, header + 102).map((row, i) =>
  i < header ? row.slice(0, 1) : [row[0] ?? null, ...row.slice(yearCol, yearCol + 3)],
)
trimmed[header]![1] = 'Year 2024'
mkdirSync(new URL('./fixtures/', import.meta.url), { recursive: true })
writeFileSync(new URL('./fixtures/ukppp24qx-males-period.json', import.meta.url), JSON.stringify(trimmed) + '\n')
console.log('saved fixture with', trimmed.length, 'rows')

// UN WPP 2024 life tables: the header, a region (skipped), Japan and Hong Kong (a name with a comma), 2024–2025.
for (const sex of ['Male', 'Female']) {
  const file = new URL(`../../data-cache/WPP2024_Life_Table_Complete_Medium_${sex}_2024-2100.csv.gz`, import.meta.url)
  const keep: string[] = []
  for await (const line of createInterface({ input: createReadStream(file).pipe(createGunzip()) })) {
    if (keep.length === 0) keep.push(line)
    else if (/,(2024|2025),/.test(line) && (/,"?(Japan|China, Hong Kong SAR)"?,/.test(line) || (line.includes(',Eastern Asia,') && line.includes(',2024,')))) keep.push(line)
  }
  writeFileSync(new URL(`./fixtures/wpp2024-${sex.toLowerCase()}-extract.csv`, import.meta.url), keep.join('\n') + '\n')
  console.log(`saved WPP ${sex} fixture with`, keep.length, 'lines')
}

// ONS life expectancy by area deprivation: the latest period's rows (plus one older row) from sheets 1 and 4.
for (const nation of ['eng', 'wal']) {
  const file = new URL(`../../data-cache/hleimd2224${nation}.xlsx`, import.meta.url)
  const extract: Record<string, unknown[]> = {}
  for (const sheet of ['1', '4']) {
    const rows = await readSheetRows(file, sheet)
    const header = rows.findIndex((row) => row[0] === 'Period')
    const latest = rows.filter((row) => row[0] === '2022 to 2024')
    extract[sheet] = [...rows.slice(0, header + 2), ...latest]
  }
  writeFileSync(new URL(`./fixtures/hleimd2224${nation}-extract.json`, import.meta.url), JSON.stringify(extract) + '\n')
  console.log(`saved deprivation ${nation} fixture`)
}
