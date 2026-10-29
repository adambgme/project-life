import { describe, expect, it } from 'vitest'
import { whatsAhead } from './ahead'

const birth = { year: 1990, month: 3, day: 4 }

describe('whatsAhead', () => {
  it('counts summers by their midsummer, and weekends from the years left', () => {
    // 26 Oct 2026: the summers of 1990 to 2026 are lived (37). 50 years left reaches Oct 2076: 2027 to 2076 ahead (50).
    expect(whatsAhead(birth, { year: 2026, month: 10, day: 26 }, 50)).toEqual({ summersLived: 37, summersAhead: 50, weekendsAhead: 2609 })
  })

  it("doesn't count this year's summer as lived before midsummer", () => {
    const spring = whatsAhead(birth, { year: 2026, month: 4, day: 1 }, 50)
    expect(spring.summersLived).toBe(36)
    expect(spring.summersAhead).toBe(50)
  })

  it('a birthday after midsummer starts with the next summer', () => {
    expect(whatsAhead({ year: 1990, month: 9, day: 1 }, { year: 2026, month: 10, day: 26 }, 0)).toEqual({ summersLived: 36, summersAhead: 0, weekendsAhead: 0 })
  })
})
