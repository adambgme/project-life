import type { Cell } from './xlsx.ts'

export const MAX_AGE = 100

/** A qx table: `qx[i][age]` is the mortality rate per 100,000 for column `first + i` (a calendar year, or a year of
 * birth for cohort sheets) at exact age 0–100. */
export type QxTable = { first: number; last: number; qx: number[][] }

const HEADER_LABEL = 'Exact age (years)'

/** Parse an ONS qx worksheet (period: columns "Year 1981", "1982"…; cohort: "Year of birth 1981", "1982"…).
 * Throws on anything unexpected, so a changed layout can never ship wrong numbers. */
export function parseQxSheet(rows: Cell[][], columnLabel: 'Year' | 'Year of birth'): QxTable {
  const header = rows.findIndex((row) => row[0] === HEADER_LABEL)
  const headerRow = rows[header]
  const firstMatch = headerRow && new RegExp(`^${columnLabel} (\\d{4})$`).exec(String(headerRow[1]))
  if (!headerRow || !firstMatch) {
    throw new Error(`header row not found: expected "${HEADER_LABEL}" then "${columnLabel} <year>"`)
  }
  const first = Number(firstMatch[1])
  const columns = headerRow.slice(1).filter((cell) => cell !== null && cell !== '')
  columns.forEach((cell, i) => {
    const year = i === 0 ? first : Number(cell)
    if (year !== first + i) throw new Error(`columns are not consecutive years: column ${i + 1} is "${cell}", expected ${first + i}`)
  })

  const qx: number[][] = columns.map(() => [])
  for (let age = 0; age <= MAX_AGE; age++) {
    const row = rows[header + 1 + age]
    if (!row || row[0] !== age) throw new Error(`expected the row for age ${age}, found "${row?.[0]}"`)
    columns.forEach((_, i) => {
      const value = row[i + 1]
      if (typeof value !== 'number' || !(value >= 0 && value < 100_000)) {
        throw new Error(`implausible rate at age ${age}, ${columnLabel.toLowerCase()} ${first + i}: ${value}`)
      }
      qx[i]![age] = value
    })
  }
  return { first, last: first + columns.length - 1, qx }
}
