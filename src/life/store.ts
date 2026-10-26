/**
 * The saved life, kept only in this browser's localStorage. Versioned so later releases can
 * migrate it; v1 holds just the profile. Works (in memory) when storage is unavailable.
 */
import { birthDateProblem, isRealDate, type CalendarDate } from './lifeMaths'

export type Profile = { birthDate: CalendarDate }
export type Life = { profile: Profile | null }

type SavedLifeV1 = { version: 1; profile: { birthDate: string } | null }

export const STORAGE_KEY = 'your-life'
/** Written by the original bryanbraun/your-life page: `{ month: '0'–'11', day, year }` as strings. */
const LEGACY_DOB_KEY = 'DOB'

export const emptyLife: Life = { profile: null }

function toIso({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function fromIso(iso: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  return isRealDate(date) ? date : null
}

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

function parse(raw: string | null): Life | null {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw) as SavedLifeV1
    if (saved.version !== 1) return null
    const birthDate = saved.profile ? fromIso(saved.profile.birthDate) : null
    return { profile: birthDate ? { birthDate } : null }
  } catch {
    return null
  }
}

export type LoadedLife = { life: Life; storageAvailable: boolean }

/** Load the saved life. The first time, a birth date saved by the old site is imported and the old key removed. */
export function loadLife(today: CalendarDate): LoadedLife {
  const storage = getStorage()
  if (!storage) return { life: emptyLife, storageAvailable: false }
  const saved = parse(storage.getItem(STORAGE_KEY))
  if (saved) return { life: saved, storageAvailable: true }
  const legacy = readLegacyDob(storage, today)
  storage.removeItem(LEGACY_DOB_KEY)
  if (!legacy) return { life: emptyLife, storageAvailable: true }
  const life = { profile: { birthDate: legacy } }
  saveLife(life)
  return { life, storageAvailable: true }
}

/** Save the life; returns false when storage is unavailable. Clearing the profile removes the save. */
export function saveLife(life: Life): boolean {
  const storage = getStorage()
  if (!storage) return false
  if (!life.profile) {
    storage.removeItem(STORAGE_KEY)
    return true
  }
  const saved: SavedLifeV1 = { version: 1, profile: { birthDate: toIso(life.profile.birthDate) } }
  storage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return true
}
