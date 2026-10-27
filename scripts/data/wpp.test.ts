import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkPlausible, readWpp } from './wpp'

// Real rows from UN WPP 2024 (medium variant, single ages): Japan, Hong Kong (a name with a comma) and the Eastern Asia
// region, 2024–2025.
const lines = (sex: 'male' | 'female') =>
  readFileSync(new URL(`./fixtures/wpp2024-${sex}-extract.csv`, import.meta.url), 'utf8').trimEnd().split('\n')
const read = (sex: 'male' | 'female', edit: (l: string[]) => string[] = (l) => l) => {
  const reader = readWpp(sex)
  edit(lines(sex)).forEach(reader.line)
  return reader.finish()
}

describe('readWpp: UN life tables, one country at a time', () => {
  it('keeps countries and areas (not regions), with qx for each year and single age 0–99', () => {
    const countries = read('male')
    expect([...countries.keys()].sort()).toEqual(['HKG', 'JPN'])
    const japan = countries.get('JPN')!
    expect(japan.name).toBe('Japan')
    expect(countries.get('HKG')!.name).toBe('China, Hong Kong SAR')
    expect(japan.firstYear).toBe(2024)
    expect(japan.qx).toHaveLength(2)
    expect(japan.qx[0]).toHaveLength(100)
    // Infant mortality in Japan is around 2 per 1,000; by 99 about a third die within the year.
    expect(japan.qx[0]![0]).toBeGreaterThan(0.0005)
    expect(japan.qx[0]![0]).toBeLessThan(0.005)
    expect(japan.qx[0]![99]).toBeGreaterThan(0.2)
    expect(japan.qx[0]![99]).toBeLessThan(0.6)
  })

  it('reads the female file as female', () => {
    const female = read('female').get('JPN')!
    const male = read('male').get('JPN')!
    expect(female.qx[0]![70]).toBeLessThan(male.qx[0]![70]!)
  })

  const japanAge = (age: number, year = 2024) => (row: string) => row.includes(',Japan,') && row.includes(`,${year},`) && new RegExp(`,${age},1,0\\.`).test(row)

  it.each([
    ['a changed header', (l: string[]) => [l[0]!.replace(',qx,', ',q,'), ...l.slice(1)], /header/],
    ['the other sex', (l: string[]) => l.map((row) => row.replace(',1,Male,', ',2,Female,')), /expected male/],
    ['another variant', (l: string[]) => l.map((row) => row.replace(',Medium,', ',High,')), /variant/],
    ['a qx that is not a probability', (l: string[]) => l.map((row) => (japanAge(40)(row) ? row.replace(/^((?:[^,]*,){20})[^,]*/, '$11.5') : row)), /qx/],
    ['a missing age', (l: string[]) => l.filter((row) => !japanAge(55)(row)), /JPN 2024: no age 55/],
    ['a missing year', (l: string[]) => l.filter((row) => !(row.includes(',Japan,') && row.includes(',2025,'))), /JPN: years/],
  ])('fails loudly on %s', (_name, edit, message) => {
    expect(() => read('male', edit)).toThrow(message)
  })

  it('accepts real tables and rejects implausible ones', () => {
    const japan = read('male').get('JPN')!
    expect(() => checkPlausible(japan)).not.toThrow()
    const inflated = { ...japan, qx: japan.qx.map((ages) => ages.map((q) => Math.min(1, q * 100))) }
    expect(() => checkPlausible(inflated)).toThrow(/JPN 2024: life expectancy at birth of [\d.]+ is implausible/)
  })
})
