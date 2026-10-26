import { describe, expect, it } from 'vitest'
import { layoutStory, type Era, type Moment } from './story'

const d = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}
const birth = d('1990-06-15')
const today = d('2026-10-26')
const era = (id: string, start: string, end: string | null): Era => ({ id, label: id, category: 'other', start: d(start), end: end ? d(end) : null })
const moment = (id: string, date: string): Moment => ({ id, label: id, category: 'other', date: d(date) })

describe('layoutStory: which eras and moments each box shows', () => {
  it('covers every box an era touches, from its start box to its end box', () => {
    // Years view: ages 18 (15 Jun 2008 to 14 Jun 2009) to 21 (15 Jun 2011 to 14 Jun 2012).
    const boxes = layoutStory('years', birth, today, [era('uni', '2008-09-20', '2011-06-30')], [])
    expect([...boxes.keys()].sort((a, b) => a - b)).toEqual([18, 19, 20, 21])
    expect(boxes.get(18)!.eras).toEqual(['uni'])
  })

  it('runs an ongoing era up to this week', () => {
    const boxes = layoutStory('weeks', birth, today, [era('home', '2026-10-01', null)], [])
    // 1 Oct 2026 is in week 15 of age 36; today (26 Oct) is week 19.
    expect([...boxes.keys()]).toEqual([36 * 52 + 15, 36 * 52 + 16, 36 * 52 + 17, 36 * 52 + 18, 36 * 52 + 19])
  })

  it('puts the era that started most recently on top where eras overlap', () => {
    const boxes = layoutStory('years', birth, today, [era('leeds', '2008-09-20', '2015-03-31'), era('job', '2011-09-01', '2016-08-31')], [])
    expect(boxes.get(19)!.eras).toEqual(['leeds'])
    expect(boxes.get(21)!.eras).toEqual(['job', 'leeds'])
    expect(boxes.get(25)!.eras).toEqual(['job'])
  })

  it('places moments in the box that holds their date', () => {
    const boxes = layoutStory('months', birth, today, [], [moment('swim', '1997-06-10'), moment('wed', '2019-08-24')])
    // 10 Jun 1997 is age 6, month 12 (15 May to 14 Jun) → box 83; 24 Aug 2019 is age 29, month 3 → box 350.
    expect(boxes.get(83)!.moments).toEqual(['swim'])
    expect(boxes.get(350)!.moments).toEqual(['wed'])
  })

  it('ignores anything before birth', () => {
    const boxes = layoutStory('years', birth, today, [era('before', '1980-01-01', '1985-01-01')], [moment('early', '1989-01-01')])
    expect(boxes.size).toBe(0)
  })
})
