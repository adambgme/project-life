/** Which edition of each source is in use (editions.json), and how to recognise a newer one. ONS dataset pages give
 * their contents as JSON when /data is added to the address: a landing page lists its editions newest first, and an
 * edition page lists its files and release date. */
import { readFileSync, writeFileSync } from 'node:fs'

export type Editions = {
  projections: { edition: string; released: string; url: string }
  deprivation: { edition: string; released: string }
  wpp: { revision: number; released: string }
}

const FILE = new URL('./editions.json', import.meta.url)
export const readEditions = (): Editions => JSON.parse(readFileSync(FILE, 'utf8'))
export const writeEditions = (editions: Editions) => writeFileSync(FILE, JSON.stringify(editions, null, 2) + '\n')

type OnsPage = { type?: string; datasets?: { uri: string }[]; downloads?: { file?: string }[]; description?: { releaseDate?: string } }

export function latestEdition(landing: OnsPage): string {
  const uri = landing.datasets?.[0]?.uri
  if (!uri) throw new Error(`ONS landing page lists no editions (type ${landing.type})`)
  return uri.split('/').at(-1)!
}

export function editionDetails(page: OnsPage): { files: string[]; released: string } {
  const files = (page.downloads ?? []).map((d) => d.file).filter((f): f is string => !!f)
  if (!files.length) throw new Error('ONS edition page lists no downloads')
  const released = page.description?.releaseDate
  if (!released) throw new Error('ONS edition page has no release date')
  // ONS gives midnight UK time as UTC (23:00 the day before in summer): the release date is the UK calendar date.
  return { files, released: new Date(released).toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) }
}

const NATION_CODES = { uk: 'uk', england: 'en', wales: 'wa', scotland: 'sc', 'northern-ireland': 'ni' } as const
const VARIANT_CODES = { principal: 'ppp', high: 'php', low: 'plp' } as const

function projectionsYear(edition: string): number {
  const match = /^(\d{4})based$/.exec(edition)
  if (!match) throw new Error(`ONS projections edition "${edition}" isn't in the form 2024based`)
  return Number(match[1])
}

/** "2024based" → "2024-based", as ONS writes it in titles. */
export const projectionsLabel = (edition: string) => `${projectionsYear(edition)}-based`

export function qxFileName(nation: keyof typeof NATION_CODES, variant: keyof typeof VARIANT_CODES, edition: string): string {
  return `${NATION_CODES[nation]}${VARIANT_CODES[variant]}${String(projectionsYear(edition)).slice(2)}qx.xlsx`
}

/** "between2013to2015and2022to2024" → hleimd2224eng.xlsx: named after the latest three-year period. */
export function deprivationFile(edition: string, nation: 'eng' | 'wal'): string {
  const match = /and(\d{4})to(\d{4})$/.exec(edition)
  if (!match) throw new Error(`ONS deprivation edition "${edition}" isn't in the form between…and2022to2024`)
  return `hleimd${match[1]!.slice(2)}${match[2]!.slice(2)}${nation}.xlsx`
}

export const wppFileName = (revision: number, sex: 'Male' | 'Female') =>
  `WPP${revision}_Life_Table_Complete_Medium_${sex}_${revision}-2100.csv.gz`
