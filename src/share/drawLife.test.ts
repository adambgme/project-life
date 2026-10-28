import { describe, expect, it } from 'vitest'
import { layoutFor, legendEntries, legendLines } from './drawLife'

const measure = (text: string) => text.length * 7

describe('share image layout', () => {
  it.each(['weeks', 'months', 'years'] as const)('%s: every row sits inside the image, with or without labels', (view) => {
    for (const years of [90, 100, 117]) {
      for (const labels of [false, true]) {
        const L = layoutFor({ view, years, labels }, [{ label: 'Lived', colour: '#000' }], measure)
        expect(L.rowTop(L.rows - 1) + L.cell + L.pad).toBeLessThanOrEqual(L.height)
        if (labels) expect(L.keyTop).toBeGreaterThan(L.rowTop(L.rows - 1) + L.cell)
      }
    }
  })

  it('years view: 9 rows of a decade each, the last at the bottom (a decade gap before every row)', () => {
    const L = layoutFor({ view: 'years', years: 90, labels: false })
    expect(L.rows).toBe(9)
    expect(L.rowTop(8)).toBe(L.pad + 8 * L.cell + 8 * L.gap * 2)
    expect(L.height).toBe(L.rowTop(8) + L.cell + L.pad)
  })

  it('the key grows with its entries, so none fall off the image', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ label: `A long era name ${i}`, colour: '#000' }))
    const few = layoutFor({ view: 'weeks', years: 90, labels: true }, many.slice(0, 2), measure)
    const lots = layoutFor({ view: 'weeks', years: 90, labels: true }, many, measure)
    expect(lots.keyLines.flat()).toHaveLength(40)
    expect(lots.height - few.height).toBe((lots.keyLines.length - few.keyLines.length) * 22)
  })

  it('a label too long for a line is shortened to fit', () => {
    const [line] = legendLines([{ label: 'x'.repeat(200), colour: '#000' }], 300, measure)
    expect(line![0]!.label.endsWith('…')).toBe(true)
    expect(18 + measure(line![0]!.label)).toBeLessThanOrEqual(300)
  })
})

describe('the share image key', () => {
  const colours = { paper: '#fff', ink: '#000', inkSoft: '#555', rule: '#ccc', lived: '#000', today: '#a34a24', accent: '#3f6b45', category: () => '#123456' }
  const era = { id: 'e', label: 'University', category: 'education' as const, start: { year: 2008, month: 9, day: 20 }, end: null }
  const moment = { id: 'm', label: 'Moved', category: 'home' as const, date: { year: 2020, month: 3, day: 1 } }
  const goal = { id: 'g', label: 'Retire', category: 'work' as const, target: { kind: 'age' as const, age: 60 } }

  it('matches the page: lived, now with its ring, each era, then moments and goals when there are any', () => {
    const entries = legendEntries({ eras: new Map([['e', era]]), moments: new Map([['m', moment]]), goals: new Map([['g', goal]]), colours })
    expect(entries.map((e) => [e.label, e.mark])).toEqual([
      ['Lived', 'fill'],
      ['Now', 'now'],
      ['University', 'fill'],
      ['Moment', 'moment'],
      ['Goal', 'goal'],
    ])
    expect(entries[2]!.category).toBe('education')
  })

  it('leaves out moments and goals when there are none', () => {
    const entries = legendEntries({ eras: new Map(), moments: new Map(), goals: new Map(), colours })
    expect(entries.map((e) => e.label)).toEqual(['Lived', 'Now'])
  })
})
