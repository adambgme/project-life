import { describe, expect, it } from 'vitest'
import uk from '../data/mortality/uk.json'
import { ageAtChance, chanceOfReaching, outlook } from '../life/mortality'
import { decodeMortality, type EncodedMortalityData } from '../life/mortalityData'
import { oddsSteps } from './oddsSteps'

const data = decodeMortality(uk as EncodedMortalityData)
const today = { year: 2026, month: 10, day: 26 }
const outlookFor = (year: number) => outlook(data, { year, month: 3, day: 4 }, today, { sex: 'both', basis: 'cohort' })

describe('oddsSteps: the survival curve in sentences', () => {
  // Sam, the example: born 1990, both sexes, UK, projected rates.
  const sam = outlookFor(1990)
  const steps = oddsSteps(sam, 'people like Sam')

  it('takes the next two round ages, then the 1-in-2 and 1-in-10 ages, in order', () => {
    expect(steps.map((s) => s.age)).toEqual([60, 70, Math.floor(ageAtChance(sam, 0.5)), Math.floor(ageAtChance(sam, 0.1))])
  })

  it('says each chance as the chart draws it', () => {
    for (const step of steps) expect(step.chance).toBe(chanceOfReaching(sam, step.age))
    expect(steps[0]!.text).toBe(`Of 100 people like Sam alive at 36 today, about ${Math.round(chanceOfReaching(sam, 60) * 100)} in 100 reach 60.`)
    // The critique's check: about 95 in 100 of Sam's group reach 60, not "9 in 10".
    expect(steps[0]!.text).toMatch(/about 9[45] in 100 reach 60/)
  })

  it('only claims ages that half and 1 in 10 really reach', () => {
    const half = steps.find((s) => s.label.startsWith('1 in 2'))!
    const tenth = steps.find((s) => s.label.startsWith('1 in 10'))!
    expect(half.chance).toBeGreaterThanOrEqual(0.5)
    expect(chanceOfReaching(sam, half.age + 1)).toBeLessThan(0.5)
    expect(tenth.chance).toBeGreaterThanOrEqual(0.1)
    expect(half.text).toMatch(/^Half of them reach \d+\. That's a little above the average age, 8\d, because some die young\.$/)
  })

  it('leaves out ages already passed, and starts its first sentence afresh', () => {
    const old = oddsSteps(outlookFor(1931), 'people like you')
    expect(old.every((s) => s.age > 95)).toBe(true)
    expect(old[0]!.text).toMatch(/^Of 100 people like you alive at 95 today, /)
    expect(new Set(old.map((s) => s.age)).size).toBe(old.length)
  })
})
