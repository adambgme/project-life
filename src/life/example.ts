import { emptyLife, newProfile, type Life } from './store'
import type { Era, Moment } from './story'

const d = (year: number, month: number, day: number) => ({ year, month, day })
const era = (id: string, label: string, category: Era['category'], start: Era['start'], end: Era['end']): Era => ({
  id,
  label,
  category,
  start,
  end,
})
const moment = (id: string, label: string, category: Moment['category'], date: Moment['date']): Moment => ({
  id,
  label,
  category,
  date,
})

/** A made-up life shown on a first visit, so the grid isn't empty. Entirely fictional; never saved. */
export const EXAMPLE: { name: string; life: Life } = {
  name: 'Sam',
  life: {
    ...emptyLife,
    profile: newProfile(d(1990, 3, 4)),
    eras: [
      era('x-school', 'School', 'education', d(1994, 9, 5), d(2008, 7, 18)),
      era('x-uni', 'University', 'education', d(2008, 9, 22), d(2011, 6, 30)),
      era('x-leeds', 'Living in Leeds', 'home', d(2008, 9, 20), d(2015, 3, 31)),
      era('x-interrail', 'Interrailing', 'travel', d(2010, 7, 1), d(2010, 8, 20)),
      era('x-job1', 'First job', 'work', d(2011, 9, 5), d(2016, 8, 26)),
      era('x-bristol', 'Living in Bristol', 'home', d(2015, 4, 1), null),
      era('x-studio', 'Design studio', 'work', d(2016, 9, 5), null),
    ],
    moments: [
      moment('x-swim', 'Learned to swim', 'health', d(1997, 6, 14)),
      moment('x-met', 'Met Alex', 'relationships', d(2014, 5, 17)),
      moment('x-wed', 'Married Alex', 'relationships', d(2019, 8, 24)),
    ],
  },
}
