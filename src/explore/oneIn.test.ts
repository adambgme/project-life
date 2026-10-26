import { expect, it } from 'vitest'
import { oneIn } from './ExplorePage'

it.each([
  [0.001095, '1 in 910'],
  [0.0311, '1 in 32'],
  [0.25, '1 in 4'],
  [1, 'almost certain'],
  [0, 'almost none'],
  [0.00002, '1 in 50,000'],
])('a yearly risk of %f reads "%s"', (q, words) => {
  expect(oneIn(q)).toBe(words)
})
