import { describe, expect, it } from 'vitest'
import uk from '../data/mortality/uk.json'
import { ageAtChance, chanceOfReaching, lifeExpectancyAtBirth, outlook, suggestedGridYears } from './mortality'
import { decodeMortality, type EncodedMortalityData } from './mortalityData'

const data = decodeMortality(uk as EncodedMortalityData)

// Expected values are ONS's own published figures from the 2024-based UK principal projection: expectation of life
// (ukppp24ex.xlsx) and numbers surviving (ukppp24lx.xlsx). The model must reproduce them from the qx tables alone.

describe('life expectancy matches ONS', () => {
  it.each([
    ['males born 2024, cohort, at birth', 'male', 'cohort', 2024, 86.92],
    ['females born 2024, cohort, at birth', 'female', 'cohort', 2024, 90.21],
    ['males, period 2026, at birth', 'male', 'period', 2026, 79.7],
  ] as const)('%s', (_name, sex, basis, year, ons) => {
    expect(Math.abs(lifeExpectancyAtBirth(data, { sex, basis }, year) - ons)).toBeLessThan(0.05)
  })

  it.each([
    // ONS's cohort ex sheets are indexed by calendar year: the column for 2026 at age 36 is people born in 1990.
    ['a man born 1990, alive at 36', 'male', 'cohort', '1990-01-01', '2026-06-01', 36 + 48.52],
    ['a woman born 1985, alive at 41', 'female', 'cohort', '1985-01-01', '2026-06-01', 41 + 46.6],
    ['a man born 1981, alive at 80 (in 2061)', 'male', 'cohort', '1981-01-01', '2061-06-01', 80 + 10.87],
    ['a woman aged 36, period 2026', 'female', 'period', '1990-01-01', '2026-06-01', 36 + 48.16],
    ['a man aged 100, period 2026', 'male', 'period', '1926-01-01', '2026-06-01', 100 + 1.69],
    ['a woman aged 100, period 2074', 'female', 'period', '1974-01-01', '2074-06-01', 100 + 2.27],
  ] as const)('average age at death for %s', (_name, sex, basis, birth, today, ons) => {
    const o = outlook(data, iso(birth), iso(today), { sex, basis })
    expect(Math.abs(o.lifeExpectancy - ons)).toBeLessThan(0.05)
  })
})

describe('chance of reaching an age matches ONS', () => {
  it.each([
    ['a man born 1990 reaching 80', 'male', 80, 69033.43 / 97433.19],
    ['a man born 1990 reaching 90', 'male', 90, 39864.81 / 97433.19],
    ['a woman born 1990 reaching 95', 'female', 95, 31350.81 / 98441.92],
  ] as const)('%s, alive at 36', (_name, sex, age, ons) => {
    const o = outlook(data, iso('1990-01-01'), iso('2026-06-01'), { sex })
    expect(Math.abs(chanceOfReaching(o, age) - ons)).toBeLessThan(0.002)
  })
})

describe('reading the curve', () => {
  const man = outlook(data, iso('1990-01-01'), iso('2026-06-01'), { sex: 'male' })

  it('starts at today with certainty and only falls', () => {
    expect(man.fromAge).toBe(36)
    expect(man.survival[0]).toBe(1)
    expect(man.survival.every((s, i) => i === 0 || s <= man.survival[i - 1]!)).toBe(true)
    expect(chanceOfReaching(man, 30)).toBe(1)
  })

  it('finds the age at a given chance between the ONS points around it', () => {
    // ONS: 70.9% reach 80 and 40.9% reach 90, so the 50% age is between them.
    const median = ageAtChance(man, 0.5)
    expect(median).toBeGreaterThan(80)
    expect(median).toBeLessThan(90)
    expect(chanceOfReaching(man, median)).toBeCloseTo(0.5, 3)
  })

  it('suggests a grid that holds all but about 1 in 10 lives like yours, in whole fives', () => {
    const years = suggestedGridYears(man)
    expect(years % 5).toBe(0)
    expect(chanceOfReaching(man, years)).toBeLessThanOrEqual(0.1)
    expect(chanceOfReaching(man, years - 5)).toBeGreaterThan(0.1)
  })

  it('"both, averaged" sits between male and female', () => {
    const both = outlook(data, iso('1990-01-01'), iso('2026-06-01'), { sex: 'both' })
    const woman = outlook(data, iso('1990-01-01'), iso('2026-06-01'), { sex: 'female' })
    expect(both.lifeExpectancy).toBeGreaterThan(man.lifeExpectancy)
    expect(both.lifeExpectancy).toBeLessThan(woman.lifeExpectancy)
  })

  it('the high and low variants bracket the principal projection', () => {
    const [low, high] = (['low', 'high'] as const).map(
      (variant) => outlook(data, iso('1990-01-01'), iso('2026-06-01'), { sex: 'male', variant }).lifeExpectancy,
    )
    expect(low).toBeLessThan(man.lifeExpectancy)
    expect(high).toBeGreaterThan(man.lifeExpectancy)
  })
})

function iso(value: string) {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}
