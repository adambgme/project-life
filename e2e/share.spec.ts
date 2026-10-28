import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, openSettings, test } from './fixtures'

const NOW = new Date('2026-10-26T12:00:00Z')
const SAVED = {
  version: 3,
  profile: { birthDate: '1990-06-15', sex: 'both', nation: 'uk', basis: 'cohort', gridYears: null, statistics: 'grid' },
  eras: [{ id: 'a', label: 'University', category: 'education', start: '2008-09-20', end: '2011-06-30' }],
  moments: [{ id: 'm', label: 'Moved house', category: 'home', date: '2020-03-01' }],
  goals: [{ id: 'g', label: 'Retire', category: 'work', target: { kind: 'age', age: 60 } }],
  colours: {},
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript(() => {
    ;(window as unknown as { printed: number }).printed = 0
    window.print = () => void ((window as unknown as { printed: number }).printed += 1)
  })
  await page.goto('./')
  await page.evaluate((value) => localStorage.setItem('your-life', JSON.stringify(value)), SAVED)
  await page.reload()
})

const pdfPages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length

async function printAs(page: Page, paper: 'A4' | 'A3') {
  await page.getByRole('button', { name: 'Print or share' }).click()
  await page.getByRole('radio', { name: paper }).check()
  await page.getByRole('button', { name: 'Print or save as PDF' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1)
}

for (const paper of ['A4', 'A3'] as const) {
  test(`the poster fits one ${paper} page`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'PDF output is Chromium-only')
    await printAs(page, paper)
    expect(await page.locator('#print-page-size').evaluate((el) => el.textContent)).toBe(`@page { size: ${paper} portrait; margin: 10mm; }`)
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
    expect(pdfPages(pdf)).toBe(1)
  })
}

test('printing shows just the title, summary, grid and key', async ({ page }) => {
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
  await expect(page.getByRole('heading', { name: 'Your Life' })).toBeVisible()
  await expect(page.getByTestId('summary')).toBeVisible()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByTestId('legend')).toBeVisible()
  for (const hidden of [page.getByLabel('Day', { exact: true }), page.getByRole('button', { name: 'Your story' }), page.getByRole('radio', { name: 'Weeks' }), page.getByText('Everything you enter stays')]) {
    await expect(hidden).toBeHidden()
  }
  // Light-theme ink on paper, even when the screen is dark.
  await expect(page.getByRole('heading', { name: 'Your Life' })).toHaveCSS('color', 'rgb(42, 37, 32)')
})

async function saveImage(page: Page, labels: boolean) {
  if (!(await page.getByRole('dialog').isVisible())) await page.getByRole('button', { name: 'Print or share' }).click()
  await page.getByLabel('Include labels').setChecked(labels)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save image' }).click()])
  const png = readFileSync(await download.path())
  return { name: download.suggestedFilename(), png, width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

test('a share image: no words by default, labels when asked', async ({ page }) => {
  const plain = await saveImage(page, false)
  expect(plain.name).toBe('your-life-weeks.png')
  expect(plain.png.subarray(1, 4).toString()).toBe('PNG')
  // 52 boxes of 14px plus 40px padding each side, at 2× for sharp screens.
  expect(plain.width).toBe((40 * 2 + 52 * 14) * 2)

  const labelled = await saveImage(page, true)
  expect(labelled.width).toBeGreaterThan(plain.width)
  expect(labelled.height).toBeGreaterThan(plain.height)
  await expect(page.getByText('Anyone you share it with will see the names of your eras.')).toBeVisible()
})

test('with patterns on eras, the share image draws them too', async ({ page }) => {
  const plain = await saveImage(page, true)
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await openSettings(page)
  await page.getByRole('checkbox', { name: /Patterns on eras/ }).check()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('settings')).toBeHidden()
  const textured = await saveImage(page, true)
  expect([textured.width, textured.height]).toEqual([plain.width, plain.height])
  expect(textured.png.equals(plain.png)).toBe(false)
})
