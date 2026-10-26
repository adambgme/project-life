import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseQxSheet } from './onsQx'

// The first rows of the real "males period qx" sheet of ukppp24qx.xlsx (2024-based UK principal projection), trimmed
// to three year columns. Saved by `node scripts/data/make-fixtures.ts`.
const extract = JSON.parse(readFileSync(new URL('./fixtures/ukppp24qx-males-period.json', import.meta.url), 'utf8')) as (string | number | null)[][]
const copy = () => structuredClone(extract)

describe('parseQxSheet: ONS mortality rate (qx) sheets', () => {
  it('reads years, ages 0–100 and rates per 100,000 from the real layout', () => {
    const table = parseQxSheet(extract, 'Year')
    expect(table.first).toBe(2024)
    expect(table.last).toBe(2026)
    expect(table.qx).toHaveLength(3)
    expect(table.qx[0]).toHaveLength(101)
    // ONS: males, UK, 2026, age 36 = 109.51 per 100,000.
    expect(table.qx[2]![36]).toBe(109.51)
  })

  it('fails loudly when the header row changes', () => {
    const rows = copy()
    const header = rows.findIndex((row) => row[0] === 'Exact age (years)')
    rows[header]![0] = 'Age'
    expect(() => parseQxSheet(rows, 'Year')).toThrow(/header row/)
  })

  it('fails loudly when the columns are not consecutive years', () => {
    const rows = copy()
    const header = rows.findIndex((row) => row[0] === 'Exact age (years)')
    rows[header]![2] = '2027'
    expect(() => parseQxSheet(rows, 'Year')).toThrow(/consecutive/)
  })

  it('fails loudly when an age row is missing', () => {
    const rows = copy()
    const header = rows.findIndex((row) => row[0] === 'Exact age (years)')
    rows.splice(header + 1 + 50, 1)
    expect(() => parseQxSheet(rows, 'Year')).toThrow(/age 50/)
  })

  it('fails loudly on an implausible rate', () => {
    const rows = copy()
    const header = rows.findIndex((row) => row[0] === 'Exact age (years)')
    rows[header + 1 + 40]![1] = 250_000
    expect(() => parseQxSheet(rows, 'Year')).toThrow(/age 40.*250000/)
  })

  it('reads cohort sheets, whose columns are years of birth', () => {
    const rows = copy()
    const header = rows.findIndex((row) => row[0] === 'Exact age (years)')
    rows[header]![1] = 'Year of birth 2024'
    expect(parseQxSheet(rows, 'Year of birth').first).toBe(2024)
    expect(() => parseQxSheet(rows, 'Year')).toThrow(/header row/)
  })
})
