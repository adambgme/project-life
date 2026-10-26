import { describe, expect, it } from 'vitest'
import uk from '../data/mortality/uk.json'
import { boxIndex } from './lifeMaths'
import { chanceOfReaching, outlook } from './mortality'
import { decodeMortality, type EncodedMortalityData } from './mortalityData'
import { boxChances, chanceWords } from './gridChances'

const data = decodeMortality(uk as EncodedMortalityData)
const birth = { year: 1990, month: 6, day: 15 }
const today = { year: 2026, month: 10, day: 26 }
const o = (variant: 'principal' | 'low' | 'high') => outlook(data, birth, today, { sex: 'male', variant })
const chances = boxChances('weeks', birth, today, 100, { principal: o('principal'), low: o('low'), high: o('high') })

describe('boxChances: the chance of being alive at each box', () => {
  it('is certain up to this week, then only falls', () => {
    const now = boxIndex('weeks', birth, today)
    expect(chances.principal[now]).toBe(1)
    expect(chances.principal[0]).toBe(1)
    for (let i = now + 1; i < chances.principal.length; i++) {
      expect(chances.principal[i]!).toBeLessThanOrEqual(chances.principal[i - 1]!)
    }
  })

  it('matches the curve at a box (age 80: within a week of the ONS-checked figure)', () => {
    const at80 = 80 * 52
    expect(chances.principal[at80]!).toBeCloseTo(chanceOfReaching(o('principal'), 80), 2)
  })

  it('the low and high projections bracket it', () => {
    for (const i of [60 * 52, 80 * 52, 95 * 52]) {
      expect(chances.low[i]!).toBeLessThanOrEqual(chances.principal[i]!)
      expect(chances.high[i]!).toBeGreaterThanOrEqual(chances.principal[i]!)
    }
  })

  it('marks the first boxes where the chance falls below 1 in 2 and 1 in 10', () => {
    expect(chances.principal[chances.half]!).toBeLessThan(0.5)
    expect(chances.principal[chances.half - 1]!).toBeGreaterThanOrEqual(0.5)
    expect(chances.principal[chances.tenth]!).toBeLessThan(0.1)
    expect(chances.principal[chances.tenth - 1]!).toBeGreaterThanOrEqual(0.1)
  })
})

describe('chanceWords', () => {
  it.each([
    [0.999, 'almost certainly'],
    [0.96, 'more than 9 in 10'],
    [0.75, 'about 3 in 4'],
    [0.71, 'about 7 in 10'],
    [0.5, 'about 1 in 2'],
    [0.26, 'about 1 in 4'],
    [0.12, 'about 1 in 10'],
    [0.04, 'about 4 in 100'],
    [0.003, 'fewer than 1 in 100'],
  ])('%f → %s', (p, words) => {
    expect(chanceWords(p)).toBe(words)
  })
})
