import { useCallback, useState } from 'react'
import type { CalendarDate } from './lifeMaths'
import { loadLife, saveLife, type Life } from './store'

/** The saved life plus a setter that persists every change to this browser (never over a newer version's save). */
export function useLife(today: CalendarDate) {
  const [loaded] = useState(() => loadLife(today))
  const [{ life, storageAvailable }, setState] = useState(loaded)
  const setLife = useCallback(
    (next: Life) => setState({ life: next, storageAvailable: loaded.newerSave ? false : saveLife(next) }),
    [loaded.newerSave],
  )
  return { life, setLife, storageAvailable, newerSave: !!loaded.newerSave }
}
