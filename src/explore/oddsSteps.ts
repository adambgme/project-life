import { ageAtChance, chanceOfReaching, type Outlook } from '../life/mortality'

/** One step of "Your odds, step by step": a sentence, and the point on the survival curve it's about, with a label
 * for picking it out ("95 in 100 at 60") and a short one for marking it among the others ("95%"). */
export type OddsStep = { age: number; chance: number; text: string; label: string; short: string }

const MILESTONES = [60, 70, 80, 90, 100]

/** "about 95 in 100", or "almost all" when it rounds to 100. */
function in100(chance: number): string {
  const n = Math.round(chance * 100)
  return n >= 100 ? 'almost all' : `about ${n} in 100`
}

/**
 * The survival curve told in up to four sentences, every number from the same outlook the chart draws: the next two
 * round ages at least five years ahead, then the ages half and 1 in 10 of `who` reach. Ages are whole years they
 * reach: the age where the chance falls below a half is rounded down, so "half reach 89" is true at 89.
 */
export function oddsSteps(principal: Outlook, who: string): OddsStep[] {
  const from = principal.fromAge
  const half = Math.floor(ageAtChance(principal, 0.5))
  const tenth = Math.floor(ageAtChance(principal, 0.1))
  const points = [
    ...MILESTONES.filter((a) => a >= from + 5).slice(0, 2).map((age) => ({ age, kind: 'milestone' as const })),
    { age: half, kind: 'half' as const },
    { age: tenth, kind: 'tenth' as const },
  ]
    .filter((p, i, all) => p.age > from && all.findIndex((q) => q.age === p.age) === i)
    .sort((a, b) => a.age - b.age)

  return points.map(({ age, kind }, i) => {
    const chance = chanceOfReaching(principal, age)
    const lead = i === 0 ? `Of 100 ${who} alive at ${from} today, ` : ''
    if (kind === 'half') {
      const why =
        half > principal.lifeExpectancy
          ? ` That's a little above the average age, ${Math.round(principal.lifeExpectancy)}, because some die young.`
          : ''
      return { age, chance, text: `${lead}${i === 0 ? 'half' : 'Half of them'} reach ${age}.${why}`, label: `1 in 2 at ${age}`, short: '1 in 2' }
    }
    if (kind === 'tenth') {
      return { age, chance, text: `${lead}${i === 0 ? 'about' : 'About'} 1 in 10 reach ${age}.`, label: `1 in 10 at ${age}`, short: '1 in 10' }
    }
    const words = in100(chance)
    return {
      age,
      chance,
      text: `${lead}${i === 0 ? words : words[0]!.toUpperCase() + words.slice(1)} reach ${age}.`,
      label: `${Math.round(chance * 100)} in 100 at ${age}`,
      short: `${Math.round(chance * 100)}%`,
    }
  })
}
