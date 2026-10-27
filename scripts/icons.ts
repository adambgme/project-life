/** Render the app icons (PNG) from the favicon's design. Run with `node scripts/icons.ts`; outputs go to public/. */
import { chromium } from '@playwright/test'

const PAPER = '#f5efe3'
const LIVED = '#3f6b45'
const TODAY = '#b4532a'
const RULE = '#cfc4b0'

/** A 3×3 grid: lived, now, ahead. `inset` is the share of the canvas left as margin (maskable icons need ~10%+). */
function svg(size: number, inset: number, rounded: boolean) {
  const area = size * (1 - inset * 2)
  const cell = area / 3
  const box = cell * 0.78
  const r = box * 0.16
  const kinds = ['l', 'l', 'l', 'l', 't', 'a', 'a', 'a', 'a']
  const boxes = kinds.map((kind, i) => {
    const x = size * inset + (i % 3) * cell + (cell - box) / 2
    const y = size * inset + Math.floor(i / 3) * cell + (cell - box) / 2
    if (kind === 'a') {
      const w = size / 64
      return `<rect x="${x + w / 2}" y="${y + w / 2}" width="${box - w}" height="${box - w}" rx="${r}" fill="none" stroke="${RULE}" stroke-width="${w * 1.5}"/>`
    }
    return `<rect x="${x}" y="${y}" width="${box}" height="${box}" rx="${r}" fill="${kind === 'l' ? LIVED : TODAY}"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${rounded ? size * 0.18 : 0}" fill="${PAPER}"/>${boxes.join('')}</svg>`
}

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size, inset, rounded] of [
  ['icon-192.png', 192, 0.12, true],
  ['icon-512.png', 512, 0.12, true],
  ['icon-maskable-512.png', 512, 0.2, false],
  ['apple-touch-icon.png', 180, 0.12, false],
] as const) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg(size, inset, rounded)}`)
  await page.locator('svg').screenshot({ path: `public/${name}`, omitBackground: true })
  console.log('wrote', name)
}
await browser.close()
