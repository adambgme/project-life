/** Save small extracts of real source sheets for the parser tests. Run after `npm run data:fetch`. */
import { mkdirSync, writeFileSync } from 'node:fs'
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
