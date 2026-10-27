import data from '../data/deprivation.json'
import type { Sex } from './mortality'
import type { Nation } from './store'

/** ONS life expectancy by area deprivation, 2022 to 2024: England in tenths of the Index of Multiple Deprivation,
 * Wales in fifths of the Welsh index. Group 1 is the most deprived. Scotland and Northern Ireland have their own
 * indices that ONS doesn't cover, so everyone outside Wales sees England's figures. */
export const DEPRIVATION_SOURCE = data.source
export const DEPRIVATION_PERIOD = data.england.period

type Figure = { le: number; lci: number; uci: number; hle: number }

export type DeprivationGroup = {
  /** 1 = most deprived. */
  group: number
  /** Further years expected from the band's first age, and of those, the years in "good" health. */
  years: number
  healthyYears: number
  /** Average age at death, with its 95% confidence interval. */
  ageAtDeath: number
  low: number
  high: number
}

export type DeprivationOutlook = {
  area: 'England' | 'Wales'
  unit: 'tenth' | 'fifth'
  /** The first age of the age band the figures are for (0, 1, 5, 10 … 90). */
  fromAge: number
  groups: DeprivationGroup[]
}

export function deprivationOutlook(nation: Nation, sex: Sex, age: number): DeprivationOutlook {
  const table = nation === 'wales' ? data.wales : data.england
  const band = table.ages.findLastIndex((from) => from <= Math.max(0, age))
  const fromAge = table.ages[band]!
  const pick = (s: 'male' | 'female') => (table[s] as Figure[][])[band]!
  const sexes = sex === 'both' ? [pick('male'), pick('female')] : [pick(sex)]
  const mean = (group: number, key: keyof Figure) => sexes.reduce((sum, rows) => sum + rows[group]![key], 0) / sexes.length
  return {
    area: nation === 'wales' ? 'Wales' : 'England',
    unit: table.groups === 10 ? 'tenth' : 'fifth',
    fromAge,
    groups: Array.from({ length: table.groups }, (_, i) => ({
      group: i + 1,
      years: mean(i, 'le'),
      healthyYears: mean(i, 'hle'),
      ageAtDeath: fromAge + mean(i, 'le'),
      low: fromAge + mean(i, 'lci'),
      high: fromAge + mean(i, 'uci'),
    })),
  }
}
