import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deprivationFile, editionDetails, latestEdition, projectionsLabel, qxFileName, wppFileName } from './editions'

// Trimmed real JSON from the ONS website's dataset pages (append /data to a page's address).
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/ons-${name}.json`, import.meta.url), 'utf8'))

describe('ONS editions', () => {
  it("reads a dataset's latest edition from its landing page", () => {
    expect(latestEdition(fixture('projections-landing'))).toBe('2024based')
    expect(latestEdition(fixture('deprivation-landing'))).toBe('between2013to2015and2022to2024')
  })

  it("reads an edition's files and release date (as a UK calendar date)", () => {
    expect(editionDetails(fixture('projections-edition'))).toEqual({ files: ['ukppp24qx.xlsx'], released: '2026-05-15' })
    expect(editionDetails(fixture('deprivation-edition'))).toEqual({ files: ['hleimd2224eng.xlsx'], released: '2026-04-15' })
  })

  it('names the files each edition publishes', () => {
    expect(projectionsLabel('2024based')).toBe('2024-based')
    expect(qxFileName('uk', 'principal', '2024based')).toBe('ukppp24qx.xlsx')
    expect(qxFileName('northern-ireland', 'low', '2026based')).toBe('niplp26qx.xlsx')
    expect(deprivationFile('between2013to2015and2022to2024', 'eng')).toBe('hleimd2224eng.xlsx')
    expect(deprivationFile('between2014to2016and2023to2025', 'wal')).toBe('hleimd2325wal.xlsx')
    expect(wppFileName(2026, 'Female')).toBe('WPP2026_Life_Table_Complete_Medium_Female_2026-2100.csv.gz')
  })

  it.each([
    ['a landing page with no editions', () => latestEdition({ type: 'dataset_landing_page', datasets: [] }), /no editions/],
    ['an edition page with no files', () => editionDetails({ type: 'dataset', description: { releaseDate: '2026-05-14T23:00:00.000Z' } }), /no downloads/],
    ['an edition name in a new form', () => deprivationFile('2025', 'eng'), /edition "2025"/],
    ['a projections edition in a new form', () => qxFileName('uk', 'principal', '2026-based'), /edition "2026-based"/],
  ])('fails loudly on %s', (_name, run, message) => {
    expect(run).toThrow(message)
  })
})
