import { expect, it } from 'vitest'
import { sharedDomain } from './PlaceStrip'

it('shares one scale of whole five-year steps around every group', () => {
  const group = (key: string, values: number[]) => ({ key, title: key, label: key, rows: values.map((value, i) => ({ key: String(i), label: '', value })) })
  expect(sharedDomain([group('nations', [84.3, 86.4]), group('areas', [77.0, 85.6])])).toEqual([75, 90])
  expect(sharedDomain([group('nations', [84.3, 86.4]), group('countries', [87.0, 90.4])])).toEqual([80, 95])
})
