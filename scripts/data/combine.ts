import type { QxTable } from './onsQx.ts'

/**
 * Make one table of rates by calendar year and age, running past the period table's last year (2074) so everyone
 * alive today can be followed to age 100. ONS cohort tables are the period table's diagonals (born b, age a → year
 * b + a) up to 2074, and ONS extends them beyond it; we take those extended diagonals. Where no cohort covers a cell,
 * the last period year's rate is used. Overlapping cells must agree, which checks both sheets were read correctly.
 */
export function extendWithCohorts(period: QxTable, cohort: QxTable, lastYear: number, maxAge: number): QxTable {
  for (let b = cohort.first; b <= cohort.last; b++) {
    for (let age = 0; age <= maxAge; age++) {
      const year = b + age
      if (year < period.first || year > period.last) continue
      const fromCohort = cohort.qx[b - cohort.first]![age]!
      const fromPeriod = period.qx[year - period.first]![age]!
      if (Math.abs(fromCohort - fromPeriod) > 0.011) {
        throw new Error(`cohort and period tables disagree: born ${b}, age ${age} (${year}): ${fromCohort} vs ${fromPeriod}`)
      }
    }
  }
  const lastPeriod = period.qx[period.last - period.first]!
  const qx = [...period.qx]
  for (let year = period.last + 1; year <= lastYear; year++) {
    qx.push(
      Array.from({ length: maxAge + 1 }, (_, age) => {
        const b = year - age
        return b >= cohort.first && b <= cohort.last ? cohort.qx[b - cohort.first]![age]! : lastPeriod[age]!
      }),
    )
  }
  return { first: period.first, last: lastYear, qx }
}
