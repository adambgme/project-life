import { describe, expect, it } from 'vitest'
import { EXAMPLE } from './example'
import { emptyLife } from './store'
import { describeLife, exportFile, linkFragment, readExport, readLinkFragment } from './transfer'

const life = EXAMPLE.life

describe('export and import files', () => {
  it('round-trips a whole life', () => {
    const file = exportFile(life, { year: 2026, month: 10, day: 26 })
    expect(file.name).toBe('your-life-2026-10-26.json')
    expect(readExport(file.text)).toEqual({ ok: true, life })
  })

  it.each([
    ['not JSON', 'hello', "That file isn't a Your Life backup."],
    ['some other JSON', '{"name":"x"}', "That file isn't a Your Life backup."],
    ['a backup from a newer version', '{"format":"your-life","version":99}', 'That backup is from a newer version of Your Life. Reload the page and try again.'],
  ])('explains %s', (_name, text, problem) => {
    expect(readExport(text)).toEqual({ ok: false, problem })
  })
})

describe('the send-to-phone link', () => {
  it('round-trips a whole life through a compact fragment', async () => {
    const fragment = await linkFragment(life)
    expect(fragment).toMatch(/^import=[A-Za-z0-9_-]+$/)
    // Compressed: well under the JSON size, so it fits a QR code.
    expect(fragment.length).toBeLessThan(exportFile(life, { year: 2026, month: 10, day: 26 }).text.length * 0.6)
    expect(await readLinkFragment(`#${fragment}`)).toEqual({ ok: true, life })
  })

  it('ignores ordinary addresses and explains damaged links', async () => {
    expect(await readLinkFragment('')).toBeNull()
    expect(await readLinkFragment('#top')).toBeNull()
    expect(await readLinkFragment('#import=not-really-data')).toEqual({ ok: false, problem: "That link is damaged, so nothing was imported." })
  })
})

describe('describeLife', () => {
  it('summarises what a life holds', () => {
    expect(describeLife(life)).toBe('Born 4 Mar 1990 · 7 eras · 3 moments · 2 goals')
    expect(describeLife(emptyLife)).toBe('Nothing saved')
  })
})

it('a link from a newer version says to reload, and is kept', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 99 }))
  const compressed = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())
  const fragment = btoa(String.fromCharCode(...compressed)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  expect(await readLinkFragment(`#import=${fragment}`)).toEqual({
    ok: false,
    newer: true,
    problem: 'That link is from a newer version of Your Life. Reload this page to update it; the link will be read again.',
  })
})
