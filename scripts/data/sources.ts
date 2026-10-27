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

/** A file to cache: an xlsx workbook unless `kind` says otherwise. */
export type SourceFile = { name: string; url: string; kind?: 'csv' | 'gzip' }

export function allFiles(): SourceFile[] {
  return [
    ...NATIONS.flatMap((nation) => VARIANTS.map((variant) => qxFile(nation, variant))),
    ...REFERENCE_FILES,
    { name: CAUSES.name, url: CAUSES.url, kind: 'csv' as const },
    ...WPP.files.map((file) => ({ ...file, kind: 'gzip' as const })),
    ...DEPRIVATION.files,
  ]
}

/** ONS deaths registered in England and Wales by underlying cause (ONS leading-causes list), sex and 5-year age band,
 * latest year, via Nomis dataset NM_161. Cause 0 is all causes; 999100–999345 are the leading-cause groups and their
 * sub-groups (the build keeps the groups ONS ranks: sub-groups for accidents and cancers, groups for the rest). */
export const CAUSES = {
  name: 'nomis-nm161-leading-causes.csv',
  url:
    'https://www.nomisweb.co.uk/api/v01/dataset/NM_161_1.data.csv?geography=2092957703&cause_of_death=0,999100...999345' +
    '&gender=0,1,2&age=1...20&measure=1&measures=20100&time=latest' +
    '&select=date_name,cause_of_death,cause_of_death_name,gender_name,age,age_name,obs_value',
  title: 'Deaths registered in England and Wales, by underlying cause, sex and age (Nomis NM_161)',
  /** The ONS bulletin for the year the data is from. */
  page: (year: number) =>
    `https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/bulletins/deathsregistrationsummarytables/${year}`,
  attribution: 'Source: Office for National Statistics licensed under the Open Government Licence v3.0',
}

/** UN World Population Prospects 2024: complete (single-age) life tables, medium variant, for 237 countries and areas,
 * projected 2024–2100. Over 200 MB each, so fetched once; the build splits them into one small file per country. */
const WPP_CSV = 'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES'
export const WPP = {
  edition: '2024',
  released: '2024-07-11',
  title: 'World Population Prospects 2024, Online Edition',
  url: 'https://population.un.org/wpp/',
  attribution: 'Source: United Nations, Department of Economic and Social Affairs, Population Division (2024). World Population Prospects 2024',
  licence: 'https://creativecommons.org/licenses/by/3.0/igo/',
  files: (['Male', 'Female'] as const).map((sex) => {
    const name = `WPP2024_Life_Table_Complete_Medium_${sex}_2024-2100.csv.gz`
    return { sex: sex === 'Male' ? ('male' as const) : ('female' as const), name, url: `${WPP_CSV}/${name}` }
  }),
}

/** ONS life expectancy and healthy life expectancy by national area deprivation (England: tenths of the IMD; Wales:
 * fifths of the WIMD), latest three-year period. */
const HLE = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/healthinequalities/datasets'
export const DEPRIVATION = {
  released: '2026-04-15',
  title: 'Healthy life expectancy by national area deprivation, England and Wales: between 2013 to 2015 and 2022 to 2024',
  url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthinequalities/bulletins/healthylifeexpectancybynationalareadeprivationenglandandwales/between2013to2015and2022to2024',
  attribution: 'Source: Office for National Statistics licensed under the Open Government Licence v3.0',
  files: [
    { nation: 'england' as const, name: 'hleimd2224eng.xlsx', url: `${HLE}/healthylifeexpectancybynationalareadeprivationenglandtimeseries/between2013to2015and2022to2024/hleimd2224eng.xlsx` },
    { nation: 'wales' as const, name: 'hleimd2224wal.xlsx', url: `${HLE}/healthylifeexpectancybynationalareadeprivationwalestimeseries/between2013to2015and2022to2024/hleimd2224wal.xlsx` },
  ],
}
