import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const NOW = new Date('2026-10-26T12:00:00Z')
const PROFILE = { birthDate: '1990-06-15', sex: 'male', nation: 'scotland', basis: 'cohort', gridYears: null, statistics: 'numbers' }

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
})

async function seed(page: import('@playwright/test').Page, profile: object) {
  await page.goto('./')
  await page.evaluate((p) => localStorage.setItem('your-life', JSON.stringify({ version: 3, profile: p, eras: [], moments: [], goals: [], colours: {} })), profile)
  await page.reload()
}

test('the Explore page opens from the grid and shows the whole picture', async ({ page }) => {
  await seed(page, PROFILE)
  await page.getByRole('link', { name: 'Explore your figures in depth' }).click()
  await expect(page).toHaveURL(/\?page=explore$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How long people live')
  await expect(page.getByTestId('wellbeing')).toContainText('averages for large groups of people')
  await expect(page.getByText('born 1990, males, living in Scotland, aged 36 today')).toBeVisible()

  // Survival curve: readable with the keyboard, one age at a time.
  const survival = page.getByRole('img', { name: /Survival curve for people like you/ })
  await survival.focus()
  const readout = page.getByTestId('chart-readout').first()
  await expect(readout).toContainText('100% alive at 36')
  await page.keyboard.press('ArrowRight')
  await expect(readout).toContainText('alive at 37')
  await expect(readout).toContainText('across ONS projections')

  // Chances for every milestone age still ahead, in words and figures.
  const rows = page.getByTestId('reach-table').locator('tbody tr')
  await expect(rows).toHaveCount(7)
  await expect(rows.first()).toHaveText(/^70about \d in \d+ \(\d+%\)$/)

  // All four nations and the UK, with Scotland marked as where you live.
  const nations = page.getByTestId('nations').getByRole('listitem')
  await expect(nations).toHaveCount(5)
  await expect(page.getByTestId('nations')).toContainText('Scotland (where you live)')

  // Every chart has a table view.
  await page.getByText('Show the numbers').first().click()
  await expect(page.getByRole('row', { name: /^40 9\d% alive at 40$/ })).toBeVisible()
})

test('switching cohort and period changes the figures and is remembered', async ({ page }) => {
  await seed(page, PROFILE)
  await page.goto('./?page=explore')
  const summary = page.getByText(/On average they live to about/)
  const cohort = await summary.textContent()
  await page.getByRole('radio', { name: "This year's (period)" }).check()
  await expect(summary).not.toHaveText(cohort!)
  await page.goto('./')
  await expect(page.getByRole('radio', { name: "This year's (period)" })).toBeChecked()
})

test('with statistics hidden, the Explore page stays hidden', async ({ page }) => {
  await seed(page, { ...PROFILE, statistics: 'hidden' })
  await expect(page.getByRole('link', { name: 'Explore your figures in depth' })).toHaveCount(0)
  await page.goto('./?page=explore')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Statistics are hidden')
  await expect(page.getByRole('img')).toHaveCount(0)
})

test('without a date of birth it shows the example, clearly labelled', async ({ page }) => {
  await page.goto('./?page=explore')
  await expect(page.getByTestId('example')).toContainText('Sam, the made-up example')
  await expect(page.getByRole('radio')).toHaveCount(0)
})

test('the Explore page passes an accessibility scan', async ({ page }) => {
  await seed(page, PROFILE)
  await page.goto('./?page=explore')
  await expect(page.getByTestId('nations')).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
})

test('someone over 100 still gets the page', async ({ page }) => {
  await seed(page, { ...PROFILE, birthDate: '1922-03-01' })
  await page.goto('./?page=explore')
  await expect(page.getByText('aged 104 today')).toBeVisible()
  await expect(page.getByRole('img', { name: /Survival curve/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Yearly risk/ })).toBeVisible()
  await expect(page.getByText("You've already reached every age on this list.")).toBeVisible()
})

test.describe('without the offline cache', () => {
  // The service worker would serve the cached file; these tests need the download itself to fail.
  test.use({ serviceWorkers: 'block' })

test('while a nation is loading or fails, Explore says the figures are the UK\'s', async ({ page, pageErrors }) => {
  await page.route(/scotland-.*\.js$/, (route) => route.abort())
  await seed(page, PROFILE)
  await page.goto('./?page=explore')
  await expect(page.getByRole('status').filter({ hasText: 'these are the UK' })).toContainText(
    "The figures for Scotland couldn't be loaded, so these are the UK's.",
  )
  await expect(page.getByText('living in United Kingdom')).toBeVisible()
  pageErrors.splice(0, pageErrors.length, ...pageErrors.filter((e) => !e.includes('Failed to load resource')))
})
})

test('causes of death: the commonest at your age, and at any age ahead', async ({ page }) => {
  await seed(page, { ...PROFILE, nation: 'england' })
  await page.goto('./?page=explore')
  const ages = page.getByLabel('Ages')
  await expect(ages.locator('option:checked')).toHaveText('35 to 39 (your age now)')
  // Bands before your age aren't offered.
  await expect(ages.locator('option').first()).toHaveText('35 to 39 (your age now)')
  const causes = page.getByTestId('causes').getByRole('listitem')
  await expect(causes).toHaveCount(6)
  await expect(page.getByText(/Of the [\d,]+ deaths of men aged 35 to 39 registered in England and Wales in 2025/)).toBeVisible()
  await expect(causes.first()).toHaveText(/\d+(\.\d)?%$/)
  await expect(page.getByTestId('causes-support')).toContainText('Samaritans')

  const youngTop = await causes.first().textContent()
  await ages.selectOption({ label: '80 to 84' })
  await expect(causes.first()).not.toHaveText(youngTop!)
  await expect(page.getByText(/deaths of men aged 80 to 84/)).toBeVisible()

  await page.getByText('Show all causes at this age').click()
  expect(await page.locator('details[open] tbody tr').count()).toBeGreaterThan(20)
})

test('in Scotland, causes say they are England and Wales figures', async ({ page }) => {
  await seed(page, PROFILE)
  await page.goto('./?page=explore')
  await expect(page.getByText('Scotland and Northern Ireland record causes of death separately, so these figures are for England and Wales')).toBeVisible()
})

test('after a birthday into a new band, the causes follow your new age', async ({ page }) => {
  // 39 on 26 Oct 2026, 40 from 28 Oct.
  await seed(page, { ...PROFILE, nation: 'england', birthDate: '1986-10-28' })
  await page.goto('./?page=explore')
  await expect(page.getByLabel('Ages').locator('option:checked')).toHaveText('35 to 39 (your age now)')
  await page.evaluate((p) => localStorage.setItem('your-life', JSON.stringify({ version: 3, profile: p, eras: [], moments: [], goals: [], colours: {} })), { ...PROFILE, nation: 'england', birthDate: '1986-10-20' })
  await page.reload()
  await expect(page.getByLabel('Ages').locator('option:checked')).toHaveText('40 to 44 (your age now)')
  await expect(page.getByText(/deaths of men aged 40 to 44/)).toBeVisible()
})
