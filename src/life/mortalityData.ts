import type { MortalityData, Variant } from './mortality'

/** The bundled JSON: like MortalityData, but each year's rates after the first are differences from the year
 * before (see scripts/data/build.ts). Other countries' tables (UN) have one projection only, the medium variant. */
export type EncodedMortalityData = Omit<MortalityData, 'rates'> & {
  encoding: 'year-differences'
  rates: Record<'male' | 'female', { principal: number[][] } & Partial<Record<Variant, number[][]>>>
}

function undifference(rows: number[][]): number[][] {
  const out: number[][] = []
  rows.forEach((row, i) => out.push(i === 0 ? [...row] : row.map((d, age) => d + out[i - 1]![age]!)))
  return out
}

export function decodeMortality(encoded: EncodedMortalityData): MortalityData {
  const { nation, source, firstYear, lastYear, maxAge, scale, rates } = encoded
  const decode = (sex: 'male' | 'female') => {
    const principal = undifference(rates[sex].principal)
    const { high, low } = rates[sex]
    return { principal, high: high ? undifference(high) : principal, low: low ? undifference(low) : principal }
  }
  return { nation, source, firstYear, lastYear, maxAge, scale, rates: { male: decode('male'), female: decode('female') } }
}
