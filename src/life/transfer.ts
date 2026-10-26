/**
 * Moving a life between browsers without any server: an export file, or a link whose `#import=` fragment carries the
 * whole life, compressed (fragments are never sent to a web server).
 */
import { toIsoDate, type CalendarDate } from './lifeMaths'
import { NEWER, parseSaved, serializeLife, type Life } from './store'

export const FORMAT = 'your-life'

/** `newer`: the data is from a newer version of the page; keep it so a reload can read it. */
export type ImportResult = { ok: true; life: Life } | { ok: false; problem: string; newer?: boolean }

const NOT_A_BACKUP = "That file isn't a Your Life backup."
const FROM_NEWER = 'That backup is from a newer version of Your Life. Reload the page and try again.'
const DAMAGED_LINK = 'That link is damaged, so nothing was imported.'
const LINK_FROM_NEWER =
  'That link is from a newer version of Your Life. Reload this page to update it; the link will be read again.'

/** A backup file: the saved format plus a marker and the export date. */
export function exportFile(life: Life, today: CalendarDate): { name: string; text: string } {
  const saved = JSON.parse(serializeLife(life)) as Record<string, unknown>
  const text = JSON.stringify({ format: FORMAT, exportedOn: toIsoDate(today), ...saved }, null, 2)
  return { name: `your-life-${toIsoDate(today)}.json`, text }
}

export function readExport(text: string): ImportResult {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    return { ok: false, problem: NOT_A_BACKUP }
  }
  if (data?.format !== FORMAT) return { ok: false, problem: NOT_A_BACKUP }
  const life = parseSaved(text)
  if (life === NEWER) return { ok: false, problem: FROM_NEWER }
  if (!life) return { ok: false, problem: NOT_A_BACKUP }
  return { ok: true, life }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** `import=…`: the life as compressed, URL-safe text, for the address fragment. */
export async function linkFragment(life: Life): Promise<string> {
  const json = new TextEncoder().encode(serializeLife(life))
  return `import=${toBase64Url(await transform(json, new CompressionStream('deflate-raw')))}`
}

/** Read an address's `#import=…` fragment; null when the address isn't an import link. */
export async function readLinkFragment(hash: string): Promise<ImportResult | null> {
  const match = /^#import=([A-Za-z0-9_-]+)$/.exec(hash)
  if (!match) return null
  try {
    const json = new TextDecoder().decode(await transform(fromBase64Url(match[1]!), new DecompressionStream('deflate-raw')))
    const life = parseSaved(json)
    if (life === NEWER) return { ok: false, problem: LINK_FROM_NEWER, newer: true }
    return life ? { ok: true, life } : { ok: false, problem: DAMAGED_LINK }
  } catch {
    return { ok: false, problem: DAMAGED_LINK }
  }
}

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "Born 4 Mar 1990 · 7 eras · 3 moments · 2 goals", for checking before replacing anything. */
export function describeLife(life: Life): string {
  const parts: string[] = []
  if (life.profile) {
    const { year, month, day } = life.profile.birthDate
    parts.push(`Born ${shortDate.format(new Date(Date.UTC(year, month - 1, day)))}`)
  }
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (life.eras.length) parts.push(count(life.eras.length, 'era'))
  if (life.moments.length) parts.push(count(life.moments.length, 'moment'))
  if (life.goals.length) parts.push(count(life.goals.length, 'goal'))
  return parts.length ? parts.join(' · ') : 'Nothing saved'
}
