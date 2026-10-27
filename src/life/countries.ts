import countries from '../data/countries.json'
import type { MortalityData } from './mortality'
import { decodeMortality, type EncodedMortalityData } from './mortalityData'

/** The 237 countries and areas in UN World Population Prospects 2024, by name. `code` is ISO 3166-1 alpha-3, lower case. */
export const COUNTRIES: readonly { code: string; name: string }[] = countries

export function countryName(code: string): string | undefined {
  return COUNTRIES.find((c) => c.code === code)?.name
}

/** One country's tables, fetched from this site (never anywhere else) when someone picks it. */
export async function loadCountry(code: string): Promise<MortalityData> {
  if (!countryName(code)) throw new Error(`no tables for ${code}`)
  const response = await fetch(`${import.meta.env.BASE_URL}data/countries/${code}.json`)
  if (!response.ok) throw new Error(`${code}: HTTP ${response.status}`)
  return decodeMortality((await response.json()) as EncodedMortalityData)
}
