import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Motion only ever plays from a finished, readable page (docs/adr/0005-motion.md). These run in Chromium and Safari
// (scroll-driven animations) and Firefox (still), so each path is checked. Playwright counts opacity 0 as visible, so
// they check the computed styles.

const hasScrollTimelines = (page: Page) => page.evaluate(() => CSS.supports('animation-timeline: view()'))

/** Every revealed chapter, scrolled into the middle of the screen, ends fully shown and in place. */
async function expectChaptersShownInView(page: Page) {
  const chapters = page.locator('[data-reveal]')
  expect(await chapters.count()).toBeGreaterThan(0)
  for (const chapter of await chapters.all()) {
    await chapter.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(chapter).toHaveCSS('opacity', '1')
    await expect(chapter).toHaveCSS('translate', /^(none|0px)$/)
  }
}

test('the figures rise into view and are all fully shown once there', async ({ page }) => {
  await page.goto('./')
  const last = page.locator('[data-reveal]').last()
  if (await hasScrollTimelines(page)) {
    // Still below the screen: not yet risen.
    expect(Number(await last.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1)
  } else {
    // No scroll-driven animations (Firefox for now): no motion at all, everything already in place.
    await expect(last).toHaveCSS('opacity', '1')
  }
  await expectChaptersShownInView(page)
})

test('the life bar fills to its share', async ({ page }) => {
  await page.goto('./')
  const fill = page.getByTestId('life-bar').locator('[data-fill]')
  await expect(fill).toHaveCSS('scale', /^(none|1)$/)
})

test('with reduced motion nothing moves, and everything is shown without scrolling to it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  for (const chapter of await page.locator('[data-reveal]').all()) await expect(chapter).toHaveCSS('opacity', '1')
  await expect(page.getByTestId('life-bar').locator('[data-fill]')).toHaveCSS('scale', /^(none|1)$/)
  await page.getByRole('radio', { name: 'Years' }).check({ force: true })
  await expect(page.getByTestId('summary')).toContainText('years')
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
})

test('a new view fades in, and quick changes all land', async ({ page }) => {
  await page.goto('./')
  for (const view of ['Months', 'Years', 'Weeks', 'Years'] as const) {
    await page.getByRole('radio', { name: view }).check({ force: true })
  }
  await expect(page.getByTestId('summary')).toContainText('years')
  await expect(page.locator('[data-grid-frame]')).toHaveCSS('opacity', '1')
})

test('printing plays no motion', async ({ page }) => {
  await page.emulateMedia({ media: 'print' })
  await page.goto('./')
  await expect(page.getByTestId('life-bar').locator('[data-fill]')).toHaveCSS('scale', /^(none|1)$/)
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
})
