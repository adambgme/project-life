import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseDeprivation } from './onsDeprivation'
import type { Cell } from './xlsx'

// Real rows from ONS "Healthy life expectancy by national area deprivation" (released 15 April 2026): sheet 1 (life
// expectancy) and sheet 4 (healthy life expectancy), the latest period, plus one older row each.
const extract = (nation: 'eng' | 'wal') =>
  JSON.parse(readFileSync(new URL(`./fixtures/hleimd2224${nation}-extract.json`, import.meta.url), 'utf8')) as Record<'1' | '4', Cell[][]>

describe('parseDeprivation: life expectancy by area deprivation, sex and age', () => {
  it('reads England in tenths: the latest period, 20 age bands, with healthy life expectancy', () => {
    const { 1: le, 4: hle } = extract('eng')
    const data = parseDeprivation(le, hle)
    expect(data.period).toBe('2022 to 2024')
    expect(data.groups).toBe(10)
    expect(data.ages).toEqual([0, 1, ...Array.from({ length: 18 }, (_, i) => 5 + i * 5)])
    const atBirth = data.male[0]!
    expect(atBirth).toHaveLength(10)
    // Most deprived tenth first: men there live about 10 years less than in the least deprived.
    expect(atBirth[0]!.le).toBe(73.2)
    expect(atBirth[9]!.le - atBirth[0]!.le).toBeGreaterThan(8)
    expect(atBirth[0]!.hle).toBe(49.8)
    expect(atBirth[0]!.lci).toBeLessThan(atBirth[0]!.le)
    expect(data.female[0]![0]!.le).toBeGreaterThan(atBirth[0]!.le)
  })

  it('reads Wales in fifths', () => {
    const { 1: le, 4: hle } = extract('wal')
    const data = parseDeprivation(le, hle)
    expect(data.groups).toBe(5)
    expect(data.male[0]![0]!.le).toBe(73.6)
  })

  const edit = (sheet: Cell[][], fn: (rows: Cell[][]) => Cell[][]) => fn(sheet.map((r) => [...r]))
  const isRow = (decile: number, sex: string, age: string) => (r: Cell[]) =>
    r[0] === '2022 to 2024' && r[1] === decile && r[2] === sex && r[4] === age

  it.each([
    ['a changed header', (rows: Cell[][]) => rows.map((r) => (r[0] === 'Period' ? r.map((c) => (c === 'LE' ? 'Life expectancy' : c)) : r)), /header/],
    ['a missing age band', (rows: Cell[][]) => rows.filter((r) => !isRow(4, 'Female', '50 to 54')(r)), /tenth 4 female 50 to 54/],
    ['a value that is not a number', (rows: Cell[][]) => rows.map((r) => (isRow(2, 'Male', '<1')(r) ? r.map((c, i) => (i === 6 ? '[x]' : c)) : r)), /not a number/],
    ['an implausible life expectancy', (rows: Cell[][]) => rows.map((r) => (isRow(2, 'Male', '<1')(r) ? r.map((c, i) => (i === 6 ? 150 : c)) : r)), /implausible/],
  ])('fails loudly on %s', (_name, change, message) => {
    const { 1: le, 4: hle } = extract('eng')
    expect(() => parseDeprivation(edit(le, change), hle)).toThrow(message)
  })
})
