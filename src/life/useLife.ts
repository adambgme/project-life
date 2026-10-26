import { useCallback, useState } from 'react'
import type { CalendarDate } from './lifeMaths'
import { loadLife, saveLife, type Life } from './store'

/** The saved life plus a setter that persists every change to this browser. */
export function useLife(today: CalendarDate) {
  const [{ life, storageAvailable }, setState] = useState(() => loadLife(today))
  const setLife = useCallback((next: Life) => {
    const saved = saveLife(next)
    setState({ life: next, storageAvailable: saved })
  }, [])
  return { life, setLife, storageAvailable }
}
