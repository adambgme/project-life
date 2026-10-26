/** Parse Nomis NM_161 (deaths by underlying cause, sex and age) into the leading causes ONS ranks. */

export type Band = { from: number; to: number | null }
export type Sex = 'total' | 'male' | 'female'
export type CausesData = {
  year: number
  bands: Band[]
  causes: { code: string; name: string }[]
  /** Deaths by cause code, per age band. */
  deaths: Record<Sex, Record<string, number[]>>
  /** Deaths from all causes, per age band. */
  all: Record<Sex, number[]>
}

const HEADER = ['DATE_NAME', 'CAUSE_OF_DEATH', 'CAUSE_OF_DEATH_NAME', 'GENDER_NAME', 'AGE', 'AGE_NAME', 'OBS_VALUE']
const SEXES: Record<string, Sex> = { Total: 'total', Male: 'male', Female: 'female' }
/** Nomis age codes 1–20: under 1, 1–4, then 5-year bands to 85–89, then 90 and over. */
const BANDS: Band[] = [
  { from: 0, to: 0 },
  { from: 1, to: 4 },
  ...Array.from({ length: 17 }, (_, i) => ({ from: 5 + i * 5, to: 9 + i * 5 })),
  { from: 90, to: null },
]
/** The parent groups ONS splits into sub-groups for ranking (all accidents, all cancers). */
const PARENTS = new Set(['LC01', 'LC02'])

/** Plain names for the commonest causes; the rest keep ONS's wording. */
const PLAIN: Record<string, string> = {
  LC01b: 'Falls',
  LC01c: 'Accidental poisoning (including overdoses)',
  LC01e: 'Road and transport accidents',
  LC02a: 'Bladder cancer',
  LC02b: 'Brain cancer',
  LC02c: 'Bowel cancer',
  LC02e: 'Kidney cancer',
  LC02g: 'Liver cancer',
  LC02h: 'Oesophageal cancer',
  LC02i: 'Ovarian cancer',
  LC02j: 'Pancreatic cancer',
  LC02k: 'Prostate cancer',
  LC02l: 'Stomach cancer',
  LC02m: 'Lung cancer',
  LC02n: 'Womb cancer',
  LC02p: 'Breast cancer',
  LC02q: 'Blood cancers (leukaemia, lymphoma, myeloma)',
  LC02r: 'Skin cancer',
  LC12: 'Stroke and other cerebrovascular diseases',
  LC14: 'Chronic lung disease (such as COPD)',
  LC16: 'Liver disease',
  LC18: "Dementia and Alzheimer's disease",
  LC21: 'Kidney and urinary diseases',
  LC24: 'Heart failure',
  LC28: 'Flu and pneumonia',
  LC30: 'Heart disease (ischaemic)',
  LC33: 'Drug and alcohol use disorders',
  LC41: 'Suicide and injury of undetermined intent',
  LC47: 'COVID-19',
}

/** Split a CSV line, honouring double quotes. */
function splitCsv(line: string): string[] {
  const out: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cell += '"'
      i++
    } else if (ch === '"') {
      quoted = !quoted
    } else if (ch === ',' && !quoted) {
      out.push(cell)
      cell = ''
    } else {
      cell += ch
    }
  }
  out.push(cell)
  return out
}

export function parseCausesCsv(text: string): CausesData {
  const lines = text.trim().split(/\r?\n/)
  const header = splitCsv(lines[0] ?? '')
  if (header.join() !== HEADER.join()) throw new Error(`header changed: expected ${HEADER.join(', ')}, found ${header.join(', ')}`)

  const years = new Set<string>()
  const names = new Map<string, string>()
  const empty = () => ({ total: {}, male: {}, female: {} }) as Record<Sex, Record<string, number[]>>
  const deaths = empty()
  for (const line of lines.slice(1)) {
    const [year, , causeName, gender, age, , value] = splitCsv(line)
    years.add(year!)
    const sex = SEXES[gender!]
    if (!sex) throw new Error(`unexpected sex "${gender}"`)
    const band = Number(age) - 1
    if (!Number.isInteger(band) || band < 0 || band >= BANDS.length) throw new Error(`unexpected age band "${age}"`)
    const count = Number(value)
    if (value === '' || !Number.isInteger(count) || count < 0) throw new Error(`"${value}" is not a count (${causeName}, ${gender}, band ${age})`)
    const code = causeName!.includes('All causes') ? 'ALL' : /^(LC\d{2}[a-z]?) /.exec(causeName!)?.[1]
    if (!code) throw new Error(`unexpected cause "${causeName}"`)
    names.set(code, causeName!.replace(/^LC\d{2}[a-z]? /, ''))
    ;(deaths[sex][code] ??= Array(BANDS.length).fill(-1))[band] = count
  }
  if (years.size !== 1) throw new Error(`expected one year, found ${[...years].join(', ')}`)
  for (const sex of ['total', 'male', 'female'] as const) {
    for (const [code, counts] of Object.entries(deaths[sex])) {
      const missing = counts.indexOf(-1)
      if (missing >= 0) throw new Error(`no ${sex} deaths for ${code} in age band ${missing + 1}`)
    }
    if (!deaths[sex].ALL) throw new Error(`no all causes rows for ${sex}`)
  }
  const all = { total: deaths.total.ALL!, male: deaths.male.ALL!, female: deaths.female.ALL! }
  const codes = [...names.keys()].filter((code) => code !== 'ALL' && !PARENTS.has(code)).sort()
  for (const sex of ['total', 'male', 'female'] as const) {
    for (const code of codes) if (!deaths[sex][code]) throw new Error(`no ${sex} rows for cause ${code}`)
  }
  for (const sex of ['total', 'male', 'female'] as const) {
    delete deaths[sex].ALL
    for (const parent of PARENTS) delete deaths[sex][parent]
  }
  return {
    year: Number([...years][0]),
    bands: BANDS,
    causes: codes.map((code) => ({ code, name: PLAIN[code] ?? names.get(code)! })),
    deaths,
    all,
  }
}
