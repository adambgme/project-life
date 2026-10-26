import { describe, expect, it } from 'vitest'
import { extendWithCohorts } from './combine'

// Tiny hand-made tables with ages 0–2 (maxAge 2). Period columns are calendar years 2000–2001; cohort columns are
// years of birth 1999–2000. Cohort values agree with the period diagonal where both exist.
const period = { first: 2000, last: 2001, qx: [[10, 20, 30], [11, 21, 31]] }
const cohort = { first: 1999, last: 2000, qx: [[9, 20, 31], [10, 21, 32]] }

describe('extendWithCohorts: one table of rates by calendar year and age', () => {
  it('keeps the period table, then continues past its last year along cohort diagonals', () => {
    const table = extendWithCohorts(period, cohort, 2003, 2)
    expect(table.first).toBe(2000)
    expect(table.last).toBe(2003)
    expect(table.qx[0]).toEqual([10, 20, 30])
    expect(table.qx[1]).toEqual([11, 21, 31])
    // 2002: age 2 → born 2000 (cohort 32); age 1 → born 2001 (no cohort: last period year, 21);
    // age 0 → born 2002 (no cohort: 11).
    expect(table.qx[2]).toEqual([11, 21, 32])
    // 2003: age 2 → born 2001 (no cohort: 31).
    expect(table.qx[3]).toEqual([11, 21, 31])
  })

  it('fails loudly when a cohort disagrees with the period table where they overlap', () => {
    const bad = { ...cohort, qx: [[9, 20, 31], [10, 25, 32]] }
    expect(() => extendWithCohorts(period, bad, 2003, 2)).toThrow(/born 2000.*age 1/)
  })
})
