import { describe, expect, it } from 'vitest'
import { deprivationOutlook } from './deprivation'

describe('deprivationOutlook: average age at death by how deprived an area is', () => {
  it('uses the age band you are in, in England by tenths', () => {
    const at37 = deprivationOutlook('england', 'male', 37)
    expect(at37.area).toBe('England')
    expect(at37.unit).toBe('tenth')
    expect(at37.fromAge).toBe(35)
    expect(at37.groups).toHaveLength(10)
    // Average age at death is the band's first age plus the further years expected; the least deprived live longest.
    const [most, least] = [at37.groups[0]!, at37.groups[9]!]
    expect(most.ageAtDeath).toBeCloseTo(35 + most.years, 5)
    expect(least.ageAtDeath).toBeGreaterThan(most.ageAtDeath + 5)
    expect(most.healthyYears).toBeLessThan(most.years)
    expect(most.low).toBeLessThan(most.ageAtDeath)
    expect(most.high).toBeGreaterThan(most.ageAtDeath)
  })

  it('uses Wales in fifths for Wales, and England for the rest of the UK', () => {
    expect(deprivationOutlook('wales', 'female', 50)).toMatchObject({ area: 'Wales', unit: 'fifth', fromAge: 50 })
    expect(deprivationOutlook('wales', 'female', 50).groups).toHaveLength(5)
    for (const nation of ['uk', 'scotland', 'northern-ireland'] as const) expect(deprivationOutlook(nation, 'male', 50).area).toBe('England')
  })

  it('averages men and women for both sexes', () => {
    const fifth = (sex: 'male' | 'female' | 'both') => deprivationOutlook('england', sex, 60).groups[4]!.ageAtDeath
    expect(fifth('both')).toBeCloseTo((fifth('male') + fifth('female')) / 2, 5)
  })

  it('covers every age: under 1, and 90 and over', () => {
    expect(deprivationOutlook('england', 'male', 0).fromAge).toBe(0)
    expect(deprivationOutlook('england', 'male', 3).fromAge).toBe(1)
    expect(deprivationOutlook('england', 'male', 104).fromAge).toBe(90)
  })
})
