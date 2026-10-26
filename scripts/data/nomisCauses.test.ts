import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseCausesCsv } from './nomisCauses'

// Real rows from Nomis NM_161 (2025 registrations, England and Wales): all causes, falls, lung cancer, dementia,
// suicide, and the two parent groups (all accidents, all cancers) that ONS doesn't rank.
const extract = readFileSync(new URL('./fixtures/nomis-nm161-extract.csv', import.meta.url), 'utf8')
const edit = (fn: (lines: string[]) => string[]) => fn(extract.trimEnd().split('\n')).join('\n')

describe('parseCausesCsv: ONS deaths by leading cause, sex and age', () => {
  it('reads the year, the 20 age bands, and the causes ONS ranks', () => {
    const data = parseCausesCsv(extract)
    expect(data.year).toBe(2025)
    expect(data.bands).toHaveLength(20)
    expect(data.bands[0]).toEqual({ from: 0, to: 0 })
    expect(data.bands[19]).toEqual({ from: 90, to: null })
    expect(data.causes.map((c) => c.code)).toEqual(['LC01b', 'LC02m', 'LC18', 'LC41'])
    expect(data.causes.find((c) => c.code === 'LC02m')!.name).toBe('Lung cancer')
    // Every cause's deaths are part of all deaths, in every band.
    for (const sex of ['total', 'male', 'female'] as const) {
      for (const cause of data.causes) {
        data.deaths[sex][cause.code]!.forEach((n, band) => expect(n).toBeLessThanOrEqual(data.all[sex][band]!))
      }
    }
  })

  it.each([
    ['a changed header', (l: string[]) => [l[0]!.replace('OBS_VALUE', 'VALUE'), ...l.slice(1)], /header/],
    ['a missing age band', (l: string[]) => l.filter((row) => !row.includes('"Aged 50-54"')), /age band/],
    ['a value that is not a count', (l: string[]) => [l[0]!, l[1]!.replace(/,\d+$/, ',"x"'), ...l.slice(2)], /count/],
    ['two years mixed', (l: string[]) => [l[0]!, l[1]!.replace('"2025"', '"2024"'), ...l.slice(2)], /one year/],
    ['no all-causes rows', (l: string[]) => l.filter((row) => !row.includes('All causes')), /all causes/],
    ['a cause missing for one sex', (l: string[]) => l.filter((row) => !(row.includes('LC02m') && row.includes('"Female"'))), /no female rows for cause LC02m/],
  ])('fails loudly on %s', (_name, change, message) => {
    expect(() => parseCausesCsv(edit(change))).toThrow(message)
  })
})
