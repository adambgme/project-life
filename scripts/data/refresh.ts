/**
 * Check every source for a newer edition than the one in use (`node scripts/data/refresh.ts`). Newer editions are
 * written to editions.json and listed on stdout; with none, nothing changes. Run monthly by
 * .github/workflows/refresh-data.yml, which then fetches, builds and tests, and opens a PR. A page or file that no
 * longer looks as expected throws, so the job fails loudly instead of opening a PR.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { deprivationFile, editionDetails, latestEdition, qxFileName, readEditions, writeEditions, wppFileName } from './editions.ts'
import { DEPRIVATION_DATASETS, HLE_PAGES, NATIONS, VARIANTS, WPP_CSV, qxDataset } from './sources.ts'

const HEADERS = { 'user-agent': 'your-life data pipeline (github.com/adambgme/project-life)' }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function onsJson(page: string) {
  await sleep(3_000) // ONS rate-limits
  const response = await fetch(`${page}/data`, { headers: HEADERS })
  if (!response.ok) throw new Error(`${page}/data: HTTP ${response.status}`)
  return response.json()
}

/** An edition's page must list every file the pipeline expects, or its layout has changed. */
async function expectFiles(page: string, names: string[]) {
  const { files, released } = editionDetails(await onsJson(page))
  const missing = names.filter((name) => !files.includes(name))
  if (missing.length) throw new Error(`${page}: expected ${missing.join(', ')}, found ${files.join(', ')}`)
  return released
}

const editions = readEditions()
const changes: string[] = []

// ONS life tables (all 15 nation and variant datasets move to a new edition together).
const projections = latestEdition(await onsJson(qxDataset('uk', 'principal')))
if (projections !== editions.projections.edition) {
  let released = ''
  for (const nation of NATIONS) {
    for (const variant of VARIANTS) {
      released = await expectFiles(`${qxDataset(nation, variant)}/${projections}`, [qxFileName(nation, variant, projections)])
    }
  }
  changes.push(`ONS life tables: ${editions.projections.edition} → ${projections} (released ${released})`)
  editions.projections = { edition: projections, released, url: `${qxDataset('uk', 'principal')}/${projections}` }
}

// ONS life expectancy by area deprivation (England and Wales are published together).
const deprivation = latestEdition(await onsJson(`${HLE_PAGES}/${DEPRIVATION_DATASETS.england}`))
if (deprivation !== editions.deprivation.edition) {
  const released = await expectFiles(`${HLE_PAGES}/${DEPRIVATION_DATASETS.england}/${deprivation}`, [deprivationFile(deprivation, 'eng')])
  await expectFiles(`${HLE_PAGES}/${DEPRIVATION_DATASETS.wales}/${deprivation}`, [deprivationFile(deprivation, 'wal')])
  changes.push(`ONS deprivation: ${editions.deprivation.edition} → ${deprivation} (released ${released})`)
  editions.deprivation = { edition: deprivation, released }
}

// UN WPP: revisions come every two years or so, named by year.
for (let revision = editions.wpp.revision + 1; revision <= editions.wpp.revision + 3; revision++) {
  // A real file starts with gzip's magic bytes; an error page served as 200 doesn't.
  const start = await fetch(`${WPP_CSV}/${wppFileName(revision, 'Male')}`, { headers: { ...HEADERS, range: 'bytes=0-1' } })
  // Read only the first chunk, in case the server ignores the range and sends the whole file.
  const reader = start.ok ? start.body?.getReader() : undefined
  const bytes = (reader && (await reader.read()).value) || new Uint8Array()
  await reader?.cancel()
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    changes.push(`UN World Population Prospects: ${editions.wpp.revision} → ${revision}`)
    // The UN doesn't publish a machine-readable release date: record the day it was found.
    editions.wpp = { revision, released: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) }
  }
}

// Causes of death (Nomis always serves the latest year; the build picks it up).
const nomis = await fetch(
  'https://www.nomisweb.co.uk/api/v01/dataset/NM_161_1.data.csv?geography=2092957703&cause_of_death=0&gender=0&age=1&measure=1&measures=20100&time=latest&select=date_name',
  { headers: HEADERS },
)
if (!nomis.ok) throw new Error(`Nomis NM_161: HTTP ${nomis.status}`)
const latestYear = Number(/"(\d{4})"/.exec(await nomis.text())?.[1])
if (!latestYear) throw new Error('Nomis NM_161: no latest year')
const causesYear = JSON.parse(readFileSync(new URL('../../src/data/causes/england-wales.json', import.meta.url), 'utf8')).year
if (latestYear > causesYear) changes.push(`ONS causes of death: ${causesYear} → ${latestYear} registrations`)

writeEditions(editions)
console.log(changes.length ? changes.join('\n') : 'No newer editions.')
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changes.length > 0}\nchanges<<END\n${changes.join('\n')}\nEND\n`)
}
