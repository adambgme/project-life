import { useState } from 'react'
import { DEPRIVATION_PERIOD, DEPRIVATION_SOURCE, deprivationOutlook } from '../life/deprivation'
import type { Sex } from '../life/mortality'
import type { Nation } from '../life/store'
import { DotRows } from './DotRows'

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']

/** Life expectancy across areas from most to least deprived (England in tenths, Wales in fifths), with an optional
 * pick of your own area's group. Never a postcode: the pick stays on this page and isn't saved. */
export function DeprivationSection({ nation, sex, age, who }: { nation: Nation; sex: Sex; age: number; who: string }) {
  const outlook = deprivationOutlook(nation, sex, age)
  const [mine, setMine] = useState<number | null>(null)
  const chosen = mine !== null && mine <= outlook.groups.length ? mine : null
  const [most, least] = [outlook.groups[0]!, outlook.groups.at(-1)!]
  const name = (group: number) =>
    `${ORDINAL[group - 1]} ${outlook.unit}${group === 1 ? ' (most deprived)' : group === outlook.groups.length ? ' (least deprived)' : ''}`
  const sexWords = sex === 'both' ? 'men and women averaged' : sex === 'male' ? 'men' : 'women'

  return (
    <div className="flex flex-col gap-4">
      <p>
        ONS splits {outlook.area}'s neighbourhoods into {outlook.unit}s, from the most to the least deprived (by income, jobs,
        health, education, housing, crime and surroundings). For {sexWords} aged {outlook.fromAge}
        {outlook.fromAge >= 90 ? ' and over' : outlook.fromAge < age ? ' (the start of your age band)' : ''}, the average age at death runs from{' '}
        <strong className="font-semibold">{most.ageAtDeath.toFixed(1)}</strong> in the most deprived {outlook.unit} to{' '}
        <strong className="font-semibold">{least.ageAtDeath.toFixed(1)}</strong> in the least deprived. Of the years ahead, about{' '}
        {most.healthyYears.toFixed(0)} are expected in good health in the most deprived {outlook.unit}, and{' '}
        {least.healthyYears.toFixed(0)} in the least.
      </p>
      {nation !== 'england' && nation !== 'wales' && (
        <p className="text-sm text-ink-soft">
          ONS covers England and Wales only, so these are England's figures.
        </p>
      )}
      <label className="flex flex-col gap-1 self-start text-sm text-ink-soft">
        Your area's {outlook.unit} (optional)
        <select
          className="rounded-sm border border-rule bg-paper px-2 py-1.5 text-base text-ink"
          value={chosen ?? ''}
          onChange={(e) => setMine(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">I don't know, or rather not say</option>
          {outlook.groups.map((g) => (
            <option key={g.group} value={g.group}>
              {name(g.group)}
            </option>
          ))}
        </select>
      </label>
      <DotRows
        label={`Average age at death for ${who} by area deprivation, ${outlook.area}`}
        testId="deprivation"
        rows={outlook.groups.map((g) => ({
          key: String(g.group),
          label: name(g.group).replace(' (most deprived)', ', most deprived').replace(' (least deprived)', ', least deprived'),
          value: g.ageAtDeath,
          chosen: g.group === chosen,
          chosenWords: 'your area',
        }))}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft">Show the table</summary>
        <table className="mt-2 w-full max-w-lg text-left">
          <thead>
            <tr className="border-b border-rule text-ink-soft">
              <th className="py-1 font-normal">Area</th>
              <th className="py-1 text-right font-normal">Average age at death</th>
              <th className="py-1 text-right font-normal">95% range</th>
              <th className="py-1 text-right font-normal">Years ahead in good health</th>
            </tr>
          </thead>
          <tbody>
            {outlook.groups.map((g) => (
              <tr key={g.group} className="border-b border-rule/60">
                <td className="py-0.5">{name(g.group)}</td>
                <td className="py-0.5 text-right tabular-nums">{g.ageAtDeath.toFixed(1)}</td>
                <td className="py-0.5 text-right tabular-nums">
                  {g.low.toFixed(1)}–{g.high.toFixed(1)}
                </td>
                <td className="py-0.5 text-right tabular-nums">{g.healthyYears.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="text-xs text-ink-soft">
        These are period figures for {DEPRIVATION_PERIOD}: they assume death rates stay as they were then. A neighbourhood's
        {' '}{outlook.unit} describes the area, not the people in it. {DEPRIVATION_SOURCE.attribution}.{' '}
        <a className="underline" href={DEPRIVATION_SOURCE.url}>
          Healthy life expectancy by national area deprivation
        </a>
        , released {new Date(DEPRIVATION_SOURCE.released).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </p>
    </div>
  )
}
