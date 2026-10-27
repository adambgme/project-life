/**
 * Draws the life grid onto a canvas for the share image: the same boxes, era colours, overlap stripes, moment dots,
 * goal outlines and (if shown) the chances fade as the page. With `labels` off there is no text at all, so the image
 * reveals nothing but its shape; labels add the title, ages and a key with era names.
 */
import type { GridChances } from '../life/gridChances'
import { BOXES_PER_YEAR, type View } from '../life/lifeMaths'
import type { BoxStory, Category, Era, Goal, Moment } from '../life/story'

export const PER_ROW: Record<View, number> = { weeks: 52, months: 36, years: 10 }

export type DrawInput = {
  view: View
  years: number
  todayIndex: number
  story: Map<number, BoxStory>
  eras: Map<string, Era>
  moments: Map<string, Moment>
  goals: Map<string, Goal>
  /** Resolved colours (no CSS variables: canvas can't read them). */
  colours: { paper: string; ink: string; inkSoft: string; rule: string; lived: string; today: string; accent: string; category: (c: Category) => string }
  chances?: GridChances
  labels: boolean
  title: string
  subtitle: string
}

export type LegendEntry = { label: string; colour: string }
/** Measures text width in px for the key's font (the canvas's measureText in the browser). */
export type Measure = (text: string) => number

const KEY_LINE = 22
const SWATCH_GAP = 18
const ENTRY_GAP = 18

/** Lay the key's entries out in lines that fit `maxWidth`, shortening any label too long for a line on its own. */
export function legendLines(entries: LegendEntry[], maxWidth: number, measure: Measure) {
  const lines: { label: string; colour: string; x: number }[][] = [[]]
  let x = 0
  for (const entry of entries) {
    let label = entry.label
    while (label.length > 1 && SWATCH_GAP + measure(label) > maxWidth) label = `${label.slice(0, -2)}…`
    const w = SWATCH_GAP + measure(label) + ENTRY_GAP
    if (x > 0 && x + w > maxWidth) {
      lines.push([])
      x = 0
    }
    lines[lines.length - 1]!.push({ label, colour: entry.colour, x })
    x += w
  }
  return lines
}

/** Every position the image needs. Rows of the grid get extra space before each new decade of age. */
export function layoutFor(input: Pick<DrawInput, 'view' | 'years' | 'labels'>, legend: LegendEntry[] = [], measure: Measure = (t) => t.length * 7) {
  const perRow = PER_ROW[input.view]
  const rows = Math.ceil((input.years * BOXES_PER_YEAR[input.view]) / perRow)
  const yearsPerRow = perRow / BOXES_PER_YEAR[input.view]
  const cell = input.view === 'weeks' ? 14 : input.view === 'months' ? 20 : 56
  const gap = input.view === 'years' ? 8 : 3
  const pad = 40
  const left = input.labels ? 44 : 0
  const top = input.labels ? 120 : 0
  const width = pad * 2 + left + perRow * cell
  const rowTop = (row: number) => pad + top + row * cell + Math.floor((row * yearsPerRow) / 10) * gap * 2
  const gridBottom = rowTop(rows - 1) + cell
  const keyLines = input.labels ? legendLines(legend, perRow * cell, measure) : []
  const keyTop = gridBottom + 32
  const height = (input.labels ? keyTop + keyLines.length * KEY_LINE : gridBottom) + pad
  return { perRow, rows, yearsPerRow, cell, gap, pad, left, top, width, height, rowTop, keyTop, keyLines }
}

/** The key's entries: lived, now, then each era. */
export function legendEntries(input: Pick<DrawInput, 'eras' | 'colours'>): LegendEntry[] {
  const c = input.colours
  return [
    { label: 'Lived', colour: c.lived },
    { label: 'Now', colour: c.today },
    ...[...input.eras.values()].map((e) => ({ label: e.label, colour: c.category(e.category) })),
  ]
}

const KEY_FONT = '13px "Source Serif 4 Variable", Georgia, serif'

/** The layout for drawing, with the key measured in its real font. */
export function measuredLayout(ctx: CanvasRenderingContext2D, input: DrawInput) {
  ctx.save()
  ctx.font = KEY_FONT
  const layout = layoutFor(input, legendEntries(input), (t) => ctx.measureText(t).width)
  ctx.restore()
  return layout
}

export function drawLife(ctx: CanvasRenderingContext2D, input: DrawInput) {
  const L = measuredLayout(ctx, input)
  const { colours: c } = input
  const total = input.years * BOXES_PER_YEAR[input.view]
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, L.width, L.height)

  if (input.labels) {
    ctx.fillStyle = c.inkSoft
    ctx.font = '600 14px "Fraunces Variable", Georgia, serif'
    ctx.fillText(input.subtitle.toUpperCase(), L.pad, L.pad + 14)
    ctx.fillStyle = c.ink
    ctx.font = '600 48px "Fraunces Variable", Georgia, serif'
    ctx.fillText(input.title, L.pad, L.pad + 64)
  }

  const yearsPerRow = L.yearsPerRow
  const box = L.cell - L.gap
  for (let index = 0; index < total; index++) {
    const row = Math.floor(index / L.perRow)
    const col = index % L.perRow
    const x = L.pad + L.left + col * L.cell
    const y = L.rowTop(row)
    if (input.labels && col === 0 && (row * yearsPerRow) % (input.view === 'weeks' ? 5 : yearsPerRow * 2) === 0) {
      ctx.fillStyle = c.inkSoft
      ctx.font = '11px "Source Serif 4 Variable", Georgia, serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(row * yearsPerRow), x - 8, y + box / 2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
    const state = index === input.todayIndex ? 'today' : index < input.todayIndex ? 'lived' : 'ahead'
    const story = input.story.get(index)
    const eraColours = (story?.eras ?? []).map((id) => c.category(input.eras.get(id)!.category))
    const chance = input.chances && state === 'ahead' ? input.chances.principal[index]! : 1

    let fill: string | null = null
    let stroke = c.rule
    if (state === 'today') fill = stroke = c.today
    else if (eraColours[0]) {
      fill = eraColours[0]
      stroke = eraColours[0]
    } else if (state === 'lived') fill = stroke = c.lived

    ctx.globalAlpha = state === 'ahead' ? (fill ? 0.35 : Math.max(0.15, chance)) : 1
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillRect(x, y, box, box)
    }
    ctx.globalAlpha = state === 'ahead' ? Math.max(0.15, chance) : 1
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, box - 1, box - 1)
    ctx.globalAlpha = 1
    // Overlapping eras: thin stripes along the bottom.
    eraColours.slice(1, 3).forEach((colour, i) => {
      ctx.fillStyle = colour
      ctx.fillRect(x, y + box - (i + 1) * (box / 4), box, box / 4)
    })
    // This week: a dark ring as well as its colour, so it stands out inside any era.
    if (state === 'today') {
      ctx.strokeStyle = c.ink
      ctx.lineWidth = 2
      ctx.strokeRect(x - 1.5, y - 1.5, box + 3, box + 3)
    }
    if (story?.goals.length) {
      ctx.strokeStyle = c.category(input.goals.get(story.goals[0]!)!.category)
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, box - 2, box - 2)
    }
    if (story?.moments.length) {
      ctx.beginPath()
      ctx.arc(x + box / 2, y + box / 2, box * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = c.paper
      ctx.fill()
      ctx.strokeStyle = c.ink
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  if (input.labels) {
    ctx.font = KEY_FONT
    L.keyLines.forEach((line, i) => {
      const y = L.keyTop + i * KEY_LINE
      for (const entry of line) {
        const x = L.pad + L.left + entry.x
        ctx.fillStyle = entry.colour
        ctx.fillRect(x, y - 10, 12, 12)
        ctx.fillStyle = c.ink
        ctx.fillText(entry.label, x + SWATCH_GAP, y)
      }
    })
  }
}

/** Turn any CSS colour (including var() and color-mix()) into one canvas understands. */
export function resolveColour(css: string): string {
  const probe = document.createElement('span')
  probe.style.color = css
  probe.style.display = 'none'
  document.body.append(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved
}
