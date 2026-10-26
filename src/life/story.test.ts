import { describe, expect, it } from 'vitest'
import { countdown, goalDate, layoutStory, weeksToGo, type Era, type Goal, type Moment } from './story'

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

describe('goals', () => {
  const byAge = (id: string, age: number): Goal => ({ id, label: id, category: 'other', target: { kind: 'age', age } })
  const byDate = (id: string, date: string): Goal => ({ id, label: id, category: 'other', target: { kind: 'date', date: d(date) } })

  it('a goal by age falls on that birthday', () => {
    expect(goalDate(birth, byAge('retire', 60))).toEqual(d('2050-06-15'))
  })

  it('goals sit in the box that holds their target date', () => {
    const boxes = layoutStory('weeks', birth, today, [], [], [byAge('retire', 60), byDate('trip', '2030-01-01')])
    expect(boxes.get(3120)!.goals).toEqual(['retire'])
    expect(boxes.get(2056)!.goals).toEqual(['trip'])
  })

  it.each([
    ['24 years away', '2050-06-15', 1233],
    ['just over 3 years away', '2030-01-01', 166],
    ['6 days away: under a week', '2026-11-01', 0],
    ['7 days away', '2026-11-02', 1],
    ['passed', '2026-10-01', -4],
  ])('weeks to go: %s', (_name, target, weeks) => {
    expect(weeksToGo(today, d(target))).toBe(weeks)
  })
})

describe('countdown', () => {
  it.each([
    [1233, '1,233 weeks to go'],
    [1, '1 week to go'],
    [0, 'this week'],
    [-4, 'date passed'],
  ])('%i weeks', (weeks, text) => {
    expect(countdown(weeks)).toBe(text)
  })
})
