/**
 * Statistics sources. Each file is downloaded once into data-cache/ (git-ignored) by `npm run data:fetch`, and
 * `npm run data:build` turns the cache into the JSON the app bundles. CI never downloads: the generated JSON is
 * committed, and the parsers are tested on small saved extracts.
 */

import { deprivationFile, projectionsLabel, qxFileName, readEditions, wppFileName } from './editions.ts'

/** The editions in use (scripts/data/editions.json, updated by the monthly refresh: see refresh.ts). */
const EDITIONS = readEditions()

export const NATIONS = ['uk', 'england', 'wales', 'scotland', 'northern-ireland'] as const
export type Nation = (typeof NATIONS)[number]

export const VARIANTS = ['principal', 'high', 'low'] as const
export type Variant = (typeof VARIANTS)[number]

const ONS = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/datasets'
const ONS_PAGES = 'https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/datasets'

const nationSlug: Record<Nation, string> = {
  uk: 'unitedkingdom',
  england: 'england',
  wales: 'wales',
  scotland: 'scotland',
  'northern-ireland': 'northernireland',
}

const variantSlug: Record<Variant, string> = {
  principal: 'principalprojection',
  high: 'highlifeexpectancyvariant',
  low: 'lowlifeexpectancyvariant',
}

/** The ONS dataset page for one nation's and variant's mortality rates (its editions live beneath it). */
export const qxDataset = (nation: Nation, variant: Variant) => `${ONS_PAGES}/mortalityratesqx${variantSlug[variant]}${nationSlug[nation]}`

/** The edition in use of ONS past and projected period and cohort life tables. */
const projections = EDITIONS.projections
export const PROJECTIONS = {
  edition: projectionsLabel(projections.edition),
  released: projections.released,
  title: `Past and projected period and cohort life tables, ${projectionsLabel(projections.edition)}, UK`,
  url: projections.url,
  attribution: 'Source: Office for National Statistics licensed under the Open Government Licence v3.0',
  licence: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
}

export function qxFile(nation: Nation, variant: Variant) {
  const name = qxFileName(nation, variant, projections.edition)
  return { name, url: `${ONS}/mortalityratesqx${variantSlug[variant]}${nationSlug[nation]}/${projections.edition}/${name}` }
}

/** Published ONS figures used only to check the model in tests (not bundled). */
const reference = (dataset: string, kind: 'ex' | 'lx') => {
  const name = qxFileName('uk', 'principal', projections.edition).replace('qx', kind)
  return { name, url: `${ONS}/${dataset}/${projections.edition}/${name}` }
}
export const REFERENCE_FILES = [
  reference('expectationoflifeprincipalprojectionunitedkingdom', 'ex'),
  reference('numberssurvivingatexactagelxprincipalprojectionunitedkingdom', 'lx'),
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

/** UN World Population Prospects: complete (single-age) life tables, medium variant, for 237 countries and areas,
 * projected to 2100. Over 200 MB each, so fetched once; the build splits them into one small file per country. */
export const WPP_CSV = 'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES'
const wpp = EDITIONS.wpp
export const WPP = {
  edition: String(wpp.revision),
  released: wpp.released,
  title: `World Population Prospects ${wpp.revision}, Online Edition`,
  url: 'https://population.un.org/wpp/',
  attribution: `Source: United Nations, Department of Economic and Social Affairs, Population Division (${wpp.revision}). World Population Prospects ${wpp.revision}`,
  licence: 'https://creativecommons.org/licenses/by/3.0/igo/',
  files: (['Male', 'Female'] as const).map((sex) => {
    const name = wppFileName(wpp.revision, sex)
    return { sex: sex === 'Male' ? ('male' as const) : ('female' as const), name, url: `${WPP_CSV}/${name}` }
  }),
}

/** ONS life expectancy and healthy life expectancy by national area deprivation (England: tenths of the IMD; Wales:
 * fifths of the WIMD), latest three-year period. */
const HLE = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/healthinequalities/datasets'
export const HLE_PAGES = 'https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthinequalities/datasets'
export const DEPRIVATION_DATASETS = {
  england: 'healthylifeexpectancybynationalareadeprivationenglandtimeseries',
  wales: 'healthylifeexpectancybynationalareadeprivationwalestimeseries',
} as const
const deprivation = EDITIONS.deprivation
export const DEPRIVATION = {
  released: deprivation.released,
  title: 'Healthy life expectancy by national area deprivation, England and Wales',
  // The bulletin for each edition shares the edition's name.
  url: `https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthinequalities/bulletins/healthylifeexpectancybynationalareadeprivationenglandandwales/${deprivation.edition}`,
  attribution: 'Source: Office for National Statistics licensed under the Open Government Licence v3.0',
  files: (['england', 'wales'] as const).map((nation) => {
    const name = deprivationFile(deprivation.edition, nation === 'england' ? 'eng' : 'wal')
    return { nation, name, url: `${HLE}/${DEPRIVATION_DATASETS[nation]}/${deprivation.edition}/${name}` }
  }),
}
