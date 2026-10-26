/**
 * The saved life, kept only in this browser's localStorage. Versioned so later releases can
 * migrate it: v1 held the birth date; v2 added sex, nation, basis and grid length; v3 added the story (eras, moments,
 * category colours, and later goals as an optional field older v3 code ignores). A save from a newer version than this
 * code knows is never overwritten. Works (in memory) when storage is unavailable.
 */
import { birthDateProblem, parseIsoDate, toIsoDate, type CalendarDate } from './lifeMaths'
import type { Basis, Sex } from './mortality'
import { CATEGORIES, type Category, type Era, type Goal, type Moment } from './story'

export const NATIONS = ['uk', 'england', 'wales', 'scotland', 'northern-ireland'] as const
export type Nation = (typeof NATIONS)[number]

export type Profile = {
  birthDate: CalendarDate
  /** Which ONS tables to use: male, female, or both averaged. */
  sex: Sex
  nation: Nation
  basis: Basis
  /** Years on the grid chosen by the person; null follows the statistics. */
  gridYears: number | null
  /** Just the numbers (default), shade the grid with the chance of being alive, or hide all statistics. */
  statistics: Statistics
}

export const STATISTICS = ['numbers', 'grid', 'hidden'] as const
export type Statistics = (typeof STATISTICS)[number]
export type Life = {
  profile: Profile | null
  eras: Era[]
  moments: Moment[]
  goals: Goal[]
  /** Colours the person has chosen for categories (hex), over the defaults. */
  colours: Partial<Record<Category, string>>
}

export const MIN_GRID_YEARS = 40
/** Wait But Why's 90 years: the grid length when statistics are hidden. */
export const CLASSIC_GRID_YEARS = 90
export const MAX_GRID_YEARS = 120

/** Details for someone who has only entered a birth date. */
export function newProfile(birthDate: CalendarDate): Profile {
  return { birthDate, sex: 'both', nation: 'uk', basis: 'cohort', gridYears: null, statistics: 'numbers' }
}

type SavedLifeV1 = { version: 1; profile: { birthDate: string } | null }
type SavedProfileV2 = {
  birthDate: string
  sex: Sex
  nation: Nation
  basis: Basis
  gridYears: number | null
  /** Added within v3; older code ignores it. */
  statistics?: Statistics
}
type SavedLifeV2 = { version: 2; profile: SavedProfileV2 | null }
type SavedEra = { id: string; label: string; category: Category; start: string; end: string | null }
type SavedMoment = { id: string; label: string; category: Category; date: string }
type SavedGoal = {
  id: string
  label: string
  category: Category
  target: { kind: 'date'; date: string } | { kind: 'age'; age: number }
}
type SavedLifeV3 = {
  version: 3
  profile: SavedProfileV2 | null
  eras: SavedEra[]
  moments: SavedMoment[]
  /** Added after v3 shipped; optional so v3 code without goals still reads the rest. */
  goals?: SavedGoal[]
  colours: Partial<Record<Category, string>>
}

export const STORAGE_KEY = 'your-life'
/** Written by the original bryanbraun/your-life page: `{ month: '0'–'11', day, year }` as strings. */
const LEGACY_DOB_KEY = 'DOB'

export const emptyLife: Life = { profile: null, eras: [], moments: [], goals: [], colours: {} }

export const MAX_LABEL_LENGTH = 80

const toIso = toIsoDate
const fromIso = parseIsoDate

function getStorage(): Storage | null {
  try {
    const storage = window.localStorage
    const probe = `${STORAGE_KEY}:probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

/** The old page saved on every keystroke, so its value may be half-typed: only a complete, usable date counts. */
function readLegacyDob(storage: Storage, today: CalendarDate): CalendarDate | null {
  try {
    const raw = JSON.parse(storage.getItem(LEGACY_DOB_KEY) ?? 'null') as Record<string, unknown> | null
    if (!raw) return null
    const { year, month, day } = raw
    if (typeof year !== 'string' || !/^\d{4}$/.test(year)) return null
    if (typeof month !== 'string' || !/^\d{1,2}$/.test(month)) return null
    if (typeof day !== 'string' || !/^\d{1,2}$/.test(day)) return null
    const date = { year: Number(year), month: Number(month) + 1, day: Number(day) }
    return birthDateProblem(date, today) ? null : date
  } catch {
    return null
  }
}

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback

const isLabel = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= MAX_LABEL_LENGTH
const HEX = /^#[0-9a-f]{6}$/i

/** Keep only well-formed entries: a bad one is dropped rather than breaking the page. */
function parseStory(saved: Partial<SavedLifeV3>): Pick<Life, 'eras' | 'moments' | 'goals' | 'colours'> {
  const eras: Era[] = []
  for (const e of Array.isArray(saved.eras) ? saved.eras : []) {
    const start = typeof e?.start === 'string' ? fromIso(e.start) : null
    const end = e?.end === null ? null : typeof e?.end === 'string' ? fromIso(e.end) : undefined
    if (typeof e?.id !== 'string' || !isLabel(e.label) || !start || end === undefined) continue
    eras.push({ id: e.id, label: e.label, category: oneOf(e.category, CATEGORIES, 'other'), start, end })
  }
  const moments: Moment[] = []
  for (const m of Array.isArray(saved.moments) ? saved.moments : []) {
    const date = typeof m?.date === 'string' ? fromIso(m.date) : null
    if (typeof m?.id !== 'string' || !isLabel(m.label) || !date) continue
    moments.push({ id: m.id, label: m.label, category: oneOf(m.category, CATEGORIES, 'other'), date })
  }
  const goals: Goal[] = []
  for (const g of Array.isArray(saved.goals) ? saved.goals : []) {
    if (typeof g?.id !== 'string' || !isLabel(g.label)) continue
    const category = oneOf(g.category, CATEGORIES, 'other')
    if (g.target?.kind === 'date') {
      const date = typeof g.target.date === 'string' ? fromIso(g.target.date) : null
      if (date) goals.push({ id: g.id, label: g.label, category, target: { kind: 'date', date } })
    } else if (g.target?.kind === 'age' && Number.isInteger(g.target.age) && g.target.age > 0 && g.target.age <= MAX_GRID_YEARS) {
      goals.push({ id: g.id, label: g.label, category, target: { kind: 'age', age: g.target.age } })
    }
  }
  const colours: Life['colours'] = {}
  for (const category of CATEGORIES) {
    const colour = saved.colours?.[category]
    if (typeof colour === 'string' && HEX.test(colour)) colours[category] = colour
  }
  return { eras, moments, goals, colours }
}

export const NEWER = Symbol('saved by a newer version')

/** Read saved data (localStorage, an export file or a link): a life, NEWER, or null if it isn't one. */
export function parseSaved(raw: string | null): Life | null | typeof NEWER {
  return parse(raw)
}

function parse(raw: string | null): Life | null | typeof NEWER {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw) as SavedLifeV1 | SavedLifeV2 | SavedLifeV3
    if (typeof saved.version === 'number' && saved.version > 3) return NEWER
    if (![1, 2, 3].includes(saved.version)) return null
    const story = saved.version === 3 ? parseStory(saved) : { eras: [], moments: [], goals: [], colours: {} }
    const birthDate = saved.profile ? fromIso(saved.profile.birthDate) : null
    if (!birthDate) return { profile: null, ...story }
    const profile = newProfile(birthDate)
    if (saved.version !== 1 && saved.profile) {
      profile.sex = oneOf(saved.profile.sex, ['male', 'female', 'both'] as const, 'both')
      profile.nation = oneOf(saved.profile.nation, NATIONS, 'uk')
      profile.basis = oneOf(saved.profile.basis, ['cohort', 'period'] as const, 'cohort')
      profile.statistics = oneOf(saved.profile.statistics, STATISTICS, 'numbers')
      const years = saved.profile.gridYears
      profile.gridYears =
        Number.isInteger(years) && years! >= MIN_GRID_YEARS && years! <= MAX_GRID_YEARS ? years : null
    }
    return { profile, ...story }
  } catch {
    return null
  }
}

/** `newerSave`: this browser holds data from a newer version of the page, so this one must not save over it. */
export type LoadedLife = { life: Life; storageAvailable: boolean; newerSave?: boolean }

/** Load the saved life. The first time, a birth date saved by the old site is imported and the old key removed. */
export function loadLife(today: CalendarDate): LoadedLife {
  const storage = getStorage()
  if (!storage) return { life: emptyLife, storageAvailable: false }
  const saved = parse(storage.getItem(STORAGE_KEY))
  if (saved === NEWER) return { life: emptyLife, storageAvailable: false, newerSave: true }
  if (saved) return { life: saved, storageAvailable: true }
  const legacy = readLegacyDob(storage, today)
  storage.removeItem(LEGACY_DOB_KEY)
  if (!legacy) return { life: emptyLife, storageAvailable: true }
  const life = { ...emptyLife, profile: newProfile(legacy) }
  saveLife(life)
  return { life, storageAvailable: true }
}

/** Save the life; returns false when storage is unavailable. An empty life removes the save. */
export function saveLife(life: Life): boolean {
  const storage = getStorage()
  if (!storage) return false
  const empty = !life.profile && !life.eras.length && !life.moments.length && !life.goals.length
  if (empty && Object.keys(life.colours).length === 0) {
    storage.removeItem(STORAGE_KEY)
    return true
  }
  storage.setItem(STORAGE_KEY, serializeLife(life))
  return true
}

/** The life in the saved format (current version), as JSON. */
export function serializeLife(life: Life): string {
  const profile = life.profile && { ...life.profile, birthDate: toIso(life.profile.birthDate) }
  const saved: SavedLifeV3 = {
    version: 3,
    profile,
    eras: life.eras.map((e) => ({ ...e, start: toIso(e.start), end: e.end && toIso(e.end) })),
    moments: life.moments.map((m) => ({ ...m, date: toIso(m.date) })),
    goals: life.goals.map((g) => ({
      ...g,
      target: g.target.kind === 'date' ? { kind: 'date', date: toIso(g.target.date) } : g.target,
    })),
    colours: life.colours,
  }
  return JSON.stringify(saved)
}
