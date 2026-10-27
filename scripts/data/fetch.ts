/** Download every source into data-cache/, skipping files already there. ONS rate-limits, so go slowly. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { allFiles } from './sources.ts'

const CACHE = new URL('../../data-cache/', import.meta.url)
const PAUSE_MS = 15_000
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

mkdirSync(CACHE, { recursive: true })
for (const file of allFiles()) {
  const target = new URL(file.name, CACHE)
  if (existsSync(target)) continue
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(file.url, { headers: { 'user-agent': 'your-life data pipeline (github.com/adambgme/project-life)' } })
    const body = new Uint8Array(await response.arrayBuffer())
    const isXlsx = body[0] === 0x50 && body[1] === 0x4b // "PK": a zip
    const isCsv = file.kind === 'csv' && new TextDecoder().decode(body.slice(0, 12)) === '"DATE_NAME",'
    const isGzip = file.kind === 'gzip' && body[0] === 0x1f && body[1] === 0x8b
    if (response.ok && (isXlsx || isCsv || isGzip)) {
      writeFileSync(target, body)
      console.log(`fetched ${file.name} (${body.length} bytes)`)
      break
    }
    if (attempt >= 5) throw new Error(`${file.name}: HTTP ${response.status} after ${attempt} attempts (${file.url})`)
    console.log(`${file.name}: HTTP ${response.status}, retrying in ${attempt * 30}s`)
    await sleep(attempt * 30_000)
  }
  await sleep(PAUSE_MS)
}
console.log('all sources cached')
