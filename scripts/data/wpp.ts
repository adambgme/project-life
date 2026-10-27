/** Read UN World Population Prospects complete (single-age) life tables, one CSV line at a time (each file is over
 * 2 GB unzipped), keeping countries and areas only: regions, income groups and the like are skipped. */

export type WppCountry = {
  /** ISO 3166-1 alpha-3. */
  code: string
  name: string
  firstYear: number
  /** `qx[year - firstYear][age]` for single ages 0–99. WPP's last group (100+) is open, with qx of 1, so it's left out:
   * the app continues the rates past the last age. */
  qx: number[][]
}

const COLUMNS = ['ISO3_code', 'LocTypeName', 'Location', 'Variant', 'Time', 'Sex', 'AgeGrpStart', 'AgeGrpSpan', 'qx'] as const
export const WPP_MAX_AGE = 99

/** Split one CSV line (quoted fields may hold commas). */
function fields(line: string): string[] {
  const out: string[] = []
  let current = ''
  let quoted = false
  for (const c of line) {
    if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) {
      out.push(current)
      current = ''
    } else current += c
  }
  out.push(current)
  return out
}

export function readWpp(sex: 'male' | 'female') {
  let index: Record<(typeof COLUMNS)[number], number> | null = null
  const byCountry = new Map<string, { name: string; years: Map<number, number[]> }>()
  const expectedSex = sex === 'male' ? 'Male' : 'Female'

  function line(text: string) {
    const row = fields(text)
    if (!index) {
      const header = row.map((h) => h.replace(/^﻿/, ''))
      const found = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)])) as typeof index & object
      const missing = COLUMNS.filter((c) => found[c] < 0)
      if (missing.length) throw new Error(`WPP header changed: no ${missing.join(', ')} column`)
      index = found
      return
    }
    const get = (c: (typeof COLUMNS)[number]) => row[index![c]] ?? ''
    if (get('LocTypeName') !== 'Country/Area') return
    const code = get('ISO3_code')
    if (get('Variant') !== 'Medium') throw new Error(`${code}: variant ${get('Variant')}, expected Medium`)
    if (get('Sex') !== expectedSex) throw new Error(`${code}: ${get('Sex')} rows, expected ${sex}`)
    const age = Number(get('AgeGrpStart'))
    if (age > WPP_MAX_AGE) return
    if (get('AgeGrpSpan') !== '1') throw new Error(`${code}: age group ${age} is not a single year`)
    const year = Number(get('Time'))
    const qx = Number(get('qx'))
    if (!(get('qx') !== '' && qx >= 0 && qx <= 1)) throw new Error(`${code} ${year} age ${age}: qx "${get('qx')}" is not a probability`)
    const country = byCountry.get(code) ?? { name: get('Location'), years: new Map() }
    byCountry.set(code, country)
    const ages = country.years.get(year) ?? []
    country.years.set(year, ages)
    ages[age] = qx
  }

  /** Every country, checked complete: the same run of years for all, and every age in every year. */
  function finish(): Map<string, WppCountry> {
    const all = [...byCountry.values()].flatMap((c) => [...c.years.keys()])
    const first = Math.min(...all)
    const last = Math.max(...all)
    const out = new Map<string, WppCountry>()
    for (const [code, { name, years }] of byCountry) {
      const qx: number[][] = []
      for (let year = first; year <= last; year++) {
        const ages = years.get(year)
        if (!ages) throw new Error(`${code}: years ${Math.min(...years.keys())}–${Math.max(...years.keys())}, expected ${first}–${last}`)
        for (let age = 0; age <= WPP_MAX_AGE; age++) if (ages[age] === undefined) throw new Error(`${code} ${year}: no age ${age}`)
        qx.push(ages)
      }
      out.set(code, { code, name, firstYear: first, qx })
    }
    return out
  }

  return { line, finish }
}
