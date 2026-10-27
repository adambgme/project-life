import { describe, expect, it } from 'vitest'
import { describeChanges, periodExpectancy } from './summary'

const table = (qx: number) => ({
  firstYear: 2024,
  maxAge: 2,
  scale: 1,
  encoding: 'year-differences',
  rates: { male: { principal: [[qx * 100_000, qx * 100_000, qx * 100_000]] }, female: { principal: [[qx * 100_000, qx * 100_000, qx * 100_000]] } },
})

describe('the refresh summary', () => {
  it('reads life expectancy at birth from an encoded table', () => {
    // Nobody dies before 3; everyone dies at the last age continued past the table.
    expect(periodExpectancy(table(0), 'male', 2024)).toBeGreaterThan(50)
    // Half die each year: half a year plus 1/2 + 1/4 + … = 1.5.
    expect(periodExpectancy(table(0.5), 'male', 2024)).toBeCloseTo(1.5, 5)
  })

  it('lists what changed, with life expectancy differences', () => {
    const text = describeChanges(
      { uk: table(0.5), causesYear: 2025, deprivationPeriod: '2022 to 2024', countries: 237 },
      { uk: table(0.4), causesYear: 2026, deprivationPeriod: '2022 to 2024', countries: 237 },
      2026,
    )
    expect(text).toMatch(/UK life expectancy at birth, men, 2026: [\d.]+ → [\d.]+ \(\+[\d.]+\)/)
    expect(text).toContain('Causes of death: 2025 → 2026 registrations')
    expect(text).not.toContain('Deprivation')
  })
})
