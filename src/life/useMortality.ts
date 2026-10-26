import { useEffect, useState } from 'react'
import uk from '../data/mortality/uk.json'
import type { MortalityData } from './mortality'
import { decodeMortality, type EncodedMortalityData } from './mortalityData'
import type { Nation } from './store'

const UK = decodeMortality(uk as EncodedMortalityData)

/** The other nations' tables load on demand, from this site only. */
const loaders = import.meta.glob<EncodedMortalityData>(['../data/mortality/*.json', '!../data/mortality/uk.json'], {
  import: 'default',
})

/** Which tables are in use. Until a nation's own tables arrive (or if they fail to load) the UK's are used, and
 * `status` says so, so the page never passes off UK figures as another nation's. */
export type MortalityState = { data: MortalityData; status: 'ready' | 'loading' | 'failed' }

export function useMortality(nation: Nation): MortalityState {
  const [result, setResult] = useState<{ nation: Nation; data: MortalityData | null }>({ nation: 'uk', data: UK })
  useEffect(() => {
    if (nation === 'uk') return
    let current = true
    const load = loaders[`../data/mortality/${nation}.json`]
    Promise.resolve(load ? load() : Promise.reject(new Error(`no tables for ${nation}`)))
      .then((encoded) => current && setResult({ nation, data: decodeMortality(encoded) }))
      .catch(() => current && setResult({ nation, data: null }))
    return () => {
      current = false
    }
  }, [nation])
  if (nation === 'uk') return { data: UK, status: 'ready' }
  if (result.nation !== nation) return { data: UK, status: 'loading' }
  return result.data ? { data: result.data, status: 'ready' } : { data: UK, status: 'failed' }
}
