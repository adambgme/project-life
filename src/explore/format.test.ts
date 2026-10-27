import { describe, expect, it } from 'vitest'
import { longDate } from './format'

describe('longDate', () => {
  it('keeps the published day in any time zone', () => {
    const tz = process.env.TZ
    for (const zone of ['America/Los_Angeles', 'Pacific/Auckland', 'Europe/London']) {
      process.env.TZ = zone
      expect(longDate('2026-04-15')).toBe('15 April 2026')
    }
    process.env.TZ = tz
  })
})
