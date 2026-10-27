import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, openSettings, test } from './fixtures'

/** WCAG 2.2 AA across every main state of the page, in both themes. */
test.describe.configure({ timeout: 60_000 })

const NOW = new Date('2026-10-26T12:00:00Z')
const SAVED = {
  version: 3,
  profile: { birthDate: '1990-06-15', sex: 'both', nation: 'england', basis: 'cohort', gridYears: null, statistics: 'grid' },
  eras: [{ id: 'a', label: 'University', category: 'education', start: '2008-09-20', end: '2011-06-30' }],
  moments: [{ id: 'm', label: 'Moved house', category: 'home', date: '2020-03-01' }],
  goals: [{ id: 'g', label: 'Retire', category: 'work', target: { kind: 'age', age: 60 } }],
  colours: {},
}

async function scan(page: Page) {
  // Every row of the grid is built the same way; scanning all 5,000 boxes takes axe far too long. Keep two rows and
  // this week's.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[role="grid"] > div:nth-child(n+3):not(:has([data-state="today"]))')
    .analyze()
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)
}

async function seed(page: Page, life: object = SAVED) {
  await page.goto('./')
  await page.evaluate((v) => localStorage.setItem('your-life', JSON.stringify(v)), life)
  await page.reload()
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme })
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(NOW)
    })

    test('the example life', async ({ page }) => {
      await page.goto('./')
      await expect(page.getByTestId('example-figures')).toBeVisible()
      expect(await scan(page)).toEqual([])
    })

    test('your own life, settings open, chances on the grid, a country compared', async ({ page }) => {
      await seed(page)
      await openSettings(page)
      await page.getByRole('combobox', { name: 'Country of residence' }).selectOption({ label: 'Japan' })
      await expect(page.getByTestId('country-compare')).toBeVisible()
      expect(await scan(page)).toEqual([])
    })

    test('statistics hidden', async ({ page }) => {
      await seed(page, { ...SAVED, profile: { ...SAVED.profile, statistics: 'hidden' } })
      await openSettings(page)
      expect(await scan(page)).toEqual([])
    })

    test('the story panel and its forms', async ({ page }) => {
      await seed(page)
      await page.getByRole('button', { name: 'Your story' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await scan(page)).toEqual([])
      await page.getByRole('dialog').getByRole('button', { name: 'Edit era University' }).click()
      expect(await scan(page)).toEqual([])
    })

    test('the print and share dialog', async ({ page }) => {
      await seed(page)
      await page.getByRole('button', { name: 'Print or share' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await scan(page)).toEqual([])
    })
  })
}

test('patterns on eras: a texture per category, chosen in Settings and remembered', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await seed(page)
  const uni = page.locator('[data-eras]').first()
  expect(await uni.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe('none')
  await openSettings(page)
  await page.getByRole('checkbox', { name: /Patterns on eras/ }).check()
  await expect(page.getByTestId('settings-summary')).toContainText('patterns on eras')
  expect(await uni.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('repeating-linear-gradient')
  await page.reload()
  expect(await uni.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('repeating-linear-gradient')
  // The key shows the same texture.
  const swatch = page.getByTestId('legend').getByText('Education').locator('span')
  expect(await swatch.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('repeating-linear-gradient')
})

test('the whole page works from the keyboard, with a visible focus ring at every stop', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await seed(page)
  const stops: string[] = []
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      if (el.dataset.firstStop) return 'lap'
      if (!document.querySelector('[data-first-stop]')) el.dataset.firstStop = 'yes'
      const style = getComputedStyle(el)
      const visible = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none'
      const name = el.getAttribute('aria-label') ?? el.textContent ?? ''
      return { text: `${el.tagName.toLowerCase()} ${name.trim().slice(0, 40)}`, visible }
    })
    if (!stop) continue
    if (stop === 'lap') break // round the whole page and back to the start
    expect(stop.visible, `no visible focus on ${stop.text}`).toBe(true)
    stops.push(stop.text)
  }
  // In reading order: date of birth, Settings, the story and sharing buttons, the grid (one stop), then the figures.
  const at = (pattern: RegExp) => stops.findIndex((s) => pattern.test(s))
  expect(at(/^input/)).toBeLessThan(at(/^summary/))
  expect(at(/^summary/)).toBeLessThan(at(/Your story/))
  expect(at(/Your story/)).toBeLessThan(at(/^div Week/))
  expect(at(/^div Week/)).toBeLessThan(at(/^svg Survival curve/))
  expect(stops.filter((s) => s.startsWith('div Week'))).toHaveLength(1)

  // The grid's box opens with Enter.
  await page.locator('[role="gridcell"][tabindex="0"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('reduced motion turns animations off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page)
  const chevron = page.getByTestId('settings').locator('summary span[aria-hidden]')
  expect(await chevron.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s/)
})
