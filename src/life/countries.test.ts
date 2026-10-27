import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import uk from '../data/mortality/uk.json'
import { COUNTRIES, countryName } from './countries'
import { outlook } from './mortality'
import { decodeMortality, type EncodedMortalityData } from './mortalityData'

const country = (code: string) =>
  decodeMortality(JSON.parse(readFileSync(new URL(`../../public/data/countries/${code}.json`, import.meta.url), 'utf8')) as EncodedMortalityData)
const ONS_UK = decodeMortality(uk as EncodedMortalityData)
const birth = { year: 1990, month: 6, day: 15 }
const today = { year: 2026, month: 10, day: 27 }
const expectancy = (data: Parameters<typeof outlook>[0], basis: 'period' | 'cohort' = 'period') =>
  outlook(data, birth, today, { sex: 'both', basis }).lifeExpectancy

describe('other countries (UN WPP 2024)', () => {
  it('lists every country and area by name, with no regions', () => {
    expect(COUNTRIES).toHaveLength(237)
    expect(countryName('jpn')).toBe('Japan')
    expect(COUNTRIES.map((c) => c.name)).not.toContain('World')
  })

  it("gives the UK much the same outlook as ONS's own tables", () => {
    const un = country('gbr')
    expect(un.source.title).toMatch(/World Population Prospects 2024/)
    expect(Math.abs(expectancy(un) - expectancy(ONS_UK))).toBeLessThan(1.5)
    expect(Math.abs(expectancy(un, 'cohort') - expectancy(ONS_UK, 'cohort'))).toBeLessThan(2.5)
  })

  it('works with one projection: the high and low variants are the medium one', () => {
    const japan = country('jpn')
    expect(japan.rates.male.high).toEqual(japan.rates.male.principal)
    expect(expectancy(japan)).toBeGreaterThan(expectancy(country('gbr')))
    expect(expectancy(country('nga'))).toBeLessThan(expectancy(country('gbr')))
  })
})
