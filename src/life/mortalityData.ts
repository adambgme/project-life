import type { MortalityData, Variant } from './mortality'

/** The bundled JSON: like MortalityData, but each year's rates after the first are differences from the year
 * before (see scripts/data/build.ts). */
export type EncodedMortalityData = Omit<MortalityData, 'rates'> & {
  encoding: 'year-differences'
  rates: Record<'male' | 'female', Record<Variant, number[][]>>
}

function undifference(rows: number[][]): number[][] {
  const out: number[][] = []
  rows.forEach((row, i) => out.push(i === 0 ? [...row] : row.map((d, age) => d + out[i - 1]![age]!)))
  return out
}

export function decodeMortality(encoded: EncodedMortalityData): MortalityData {
  const { nation, source, firstYear, lastYear, maxAge, scale, rates } = encoded
  const decode = (sex: 'male' | 'female') => ({
    principal: undifference(rates[sex].principal),
    high: undifference(rates[sex].high),
    low: undifference(rates[sex].low),
  })
  return { nation, source, firstYear, lastYear, maxAge, scale, rates: { male: decode('male'), female: decode('female') } }
}
