import { describe, expect, it } from 'vitest'
import { newProfile, parseSaved, serializeLife } from './store'
import { CATEGORIES, categoryPattern } from './story'

const birth = { year: 1990, month: 6, day: 15 }

describe('patterns on eras', () => {
  it('are off unless chosen, and a choice survives saving', () => {
    expect(newProfile(birth).patterns).toBe(false)
    const life = { profile: { ...newProfile(birth), patterns: true }, eras: [], moments: [], goals: [], colours: {} }
    const saved = parseSaved(serializeLife(life))
    expect(saved && typeof saved === 'object' && 'profile' in saved && saved.profile?.patterns).toBe(true)
  })

  it('read as off from a save made before they existed', () => {
    const old = JSON.stringify({ version: 3, profile: { birthDate: '1990-06-15', sex: 'both', nation: 'uk', basis: 'cohort', gridYears: null, statistics: 'numbers' }, eras: [], moments: [], goals: [], colours: {} })
    const saved = parseSaved(old)
    expect(saved && typeof saved === 'object' && 'profile' in saved && saved.profile?.patterns).toBe(false)
  })

  it('differ for every category but Other, which stays plain', () => {
    const patterns = CATEGORIES.map((c) => categoryPattern(c))
    expect(categoryPattern('other')).toBeUndefined()
    const used = patterns.filter(Boolean)
    expect(used).toHaveLength(CATEGORIES.length - 1)
    expect(new Set(used).size).toBe(used.length)
  })
})
