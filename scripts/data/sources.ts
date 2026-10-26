/**
 * Statistics sources. Each file is downloaded once into data-cache/ (git-ignored) by `npm run data:fetch`, and
 * `npm run data:build` turns the cache into the JSON the app bundles. CI never downloads: the generated JSON is
 * committed, and the parsers are tested on small saved extracts.
 */

export const NATIONS = ['uk', 'england', 'wales', 'scotland', 'northern-ireland'] as const
export type Nation = (typeof NATIONS)[number]

export const VARIANTS = ['principal', 'high', 'low'] as const
export type Variant = (typeof VARIANTS)[number]

const ONS = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/datasets'

const nationCode: Record<Nation, { code: string; slug: string }> = {
  uk: { code: 'uk', slug: 'unitedkingdom' },
  england: { code: 'en', slug: 'england' },
  wales: { code: 'wa', slug: 'wales' },
  scotland: { code: 'sc', slug: 'scotland' },
  'northern-ireland': { code: 'ni', slug: 'northernireland' },
}

const variantCode: Record<Variant, { code: string; slug: string }> = {
  principal: { code: 'ppp', slug: 'principalprojection' },
  high: { code: 'php', slug: 'highlifeexpectancyvariant' },
  low: { code: 'plp', slug: 'lowlifeexpectancyvariant' },
}

/** The edition in use: ONS 2024-based past and projected period and cohort life tables, released 15 May 2026. */
export const PROJECTIONS = {
  edition: '2024-based',
  released: '2026-05-15',
  title: 'Past and projected period and cohort life tables, 2024-based, UK: 1981 to 2074',
  url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/bulletins/pastandprojecteddatafromtheperiodandcohortlifetables/2024baseduk1981to2074',
  attribution: 'Source: Office for National Statistics licensed under the Open Government Licence v3.0',
  licence: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
}

export function qxFile(nation: Nation, variant: Variant) {
  const n = nationCode[nation]
  const v = variantCode[variant]
  const name = `${n.code}${v.code}24qx.xlsx`
  return { name, url: `${ONS}/mortalityratesqx${v.slug}${n.slug}/2024based/${name}` }
}

/** Published ONS figures used only to check the model in tests (not bundled). */
export const REFERENCE_FILES = [
  { name: 'ukppp24ex.xlsx', url: `${ONS}/expectationoflifeprincipalprojectionunitedkingdom/2024based/ukppp24ex.xlsx` },
  { name: 'ukppp24lx.xlsx', url: `${ONS}/numberssurvivingatexactagelxprincipalprojectionunitedkingdom/2024based/ukppp24lx.xlsx` },
]

export function allFiles() {
  return [...NATIONS.flatMap((nation) => VARIANTS.map((variant) => qxFile(nation, variant))), ...REFERENCE_FILES]
}
