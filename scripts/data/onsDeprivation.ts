/** Parse ONS "Healthy life expectancy by national area deprivation" (England in tenths of the Index of Multiple
 * Deprivation, Wales in fifths of the WIMD): life expectancy (sheet 1) and healthy life expectancy (sheet 4) for the
 * latest three-year period. */
import type { Cell } from './xlsx.ts'

export type DeprivationFigure = {
  /** Further years of life expected at the band's first age, with its 95% confidence interval. */
  le: number
  lci: number
  uci: number
  /** Of those, the years expected in "good" health. */
  hle: number
}

export type DeprivationData = {
  period: string
  /** 10 (England's tenths) or 5 (Wales's fifths); group 1 is the most deprived. */
  groups: number
  /** The first age of each band: 0, 1, 5, 10 … 90 (90 and over). */
  ages: number[]
  /** `[sex][band][group - 1]`. */
  male: DeprivationFigure[][]
  female: DeprivationFigure[][]
}

const BANDS = ['<1', '01 to 04', ...Array.from({ length: 17 }, (_, i) => `${String(5 + i * 5).padStart(2, '0')} to ${String(9 + i * 5).padStart(2, '0')}`), '90+']
const AGES = [0, 1, ...Array.from({ length: 18 }, (_, i) => 5 + i * 5)]
const SEXES = { Male: 'male', Female: 'female' } as const

type Table = { period: string; groups: number; value: (group: number, sex: string, band: string, column: number) => number }

/** One sheet's latest period, indexed. `valueHeaders` are the headers expected after Period, group, sex and age. */
function readSheet(rows: Cell[][], valueHeaders: string[]): Table {
  const headerAt = rows.findIndex((r) => r[0] === 'Period')
  const header = rows[headerAt]
  const expected = ['Period', /(IMD|WIMD) (decile|quintile)/, 'Sex', 'Sex code', 'Age group', 'Age code', ...valueHeaders]
  if (!header || expected.some((h, i) => (typeof h === 'string' ? header[i] !== h : !h.test(String(header[i]))))) {
    throw new Error(`deprivation header changed: ${JSON.stringify(header)}`)
  }
  const groups = String(header[1]).endsWith('decile') ? 10 : 5
  const unit = groups === 10 ? 'tenth' : 'fifth'
  const data = rows.slice(headerAt + 1).filter((r) => typeof r[0] === 'string' && /^\d{4} to \d{4}$/.test(r[0]))
  const period = data.map((r) => String(r[0])).sort().at(-1)
  if (!period) throw new Error('deprivation: no periods')
  const cells = new Map<string, Cell[]>()
  for (const r of data) if (r[0] === period) cells.set(`${r[1]}|${r[2]}|${r[4]}`, r)
  return {
    period,
    groups,
    value(group, sex, band, column) {
      const row = cells.get(`${group}|${sex}|${band}`)
      if (!row) throw new Error(`deprivation ${period}: no row for ${unit} ${group} ${sex.toLowerCase()} ${band}`)
      const v = row[column]
      if (typeof v !== 'number') throw new Error(`deprivation ${period} ${unit} ${group} ${sex} ${band}: "${v}" is not a number`)
      if (v < 0 || v > 110) throw new Error(`deprivation ${period} ${unit} ${group} ${sex} ${band}: ${v} years is implausible`)
      return v
    },
  }
}

export function parseDeprivation(leRows: Cell[][], hleRows: Cell[][]): DeprivationData {
  const le = readSheet(leRows, ['LE', 'LCI', 'UCI'])
  const hle = readSheet(hleRows, ['HLE', 'LCI', 'UCI'])
  if (le.period !== hle.period || le.groups !== hle.groups) throw new Error('deprivation: the two sheets disagree on period or grouping')
  const bySex = (sex: keyof typeof SEXES) =>
    BANDS.map((band) =>
      Array.from({ length: le.groups }, (_, i) => ({
        le: le.value(i + 1, sex, band, 6),
        lci: le.value(i + 1, sex, band, 7),
        uci: le.value(i + 1, sex, band, 8),
        hle: hle.value(i + 1, sex, band, 6),
      })),
    )
  return { period: le.period, groups: le.groups, ages: AGES, male: bySex('Male'), female: bySex('Female') }
}
