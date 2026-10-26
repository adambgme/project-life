import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// 26 Oct 2026, midday in London. Someone born 15 Jun 1990 is 36, and 133 days past their birthday
// (week 19 of the row), so 36 × 52 + 19 = 1,891 weeks are fully lived and box 1,891 is this week.
const NOW = new Date('2026-10-26T12:00:00Z')
const LIVED = 1891
// The example life (Sam, born 4 Mar 1990) on the same day: 36 × 52 + 33 weeks.
const EXAMPLE_LIVED = 1905

const example = (page: Page) => page.getByTestId('example')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
})

async function enterBirthDate(page: Page, day: string, month: string, year: string) {
  await page.getByLabel('Day', { exact: true }).fill(day)
  await page.getByLabel('Month', { exact: true }).selectOption({ label: month })
  await page.getByLabel('Year', { exact: true }).fill(year)
}

test('entering a date of birth fills the weeks lived, and it is remembered', async ({ page }) => {
  await page.goto('./')
  await expect(example(page)).toBeVisible()
  await expect(page.getByTestId('summary')).toHaveText('Sam has lived 1,905 weeks, of the 5,200 on a 100-year grid.')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(EXAMPLE_LIVED)
  expect(await page.evaluate(() => localStorage.getItem('your-life'))).toBeNull()

  await enterBirthDate(page, '15', 'June', '1990')

  await expect(example(page)).toBeHidden()
  await expect(page.getByTestId('summary')).toHaveText("You've lived 1,891 weeks, of the 5,200 on a 100-year grid.")
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
  await expect(page.locator('[data-state="today"]')).toHaveAttribute('data-index', String(LIVED))

  await page.reload()
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('1990')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
})

test('an impossible date is explained and not used', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '31', 'April', '1990')
  await expect(page.getByRole('alert')).toHaveText("That date doesn't exist. Check the day and month.")
  await expect(example(page)).toBeVisible()
})

test('forgetting the date clears the grid and the saved copy', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  await page.getByRole('button', { name: 'Forget me' }).click()
  await expect(example(page)).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('')
  await expect(example(page)).toBeVisible()
})

test('a date of birth saved by the old site is carried over', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('your-life')) {
      localStorage.setItem('DOB', JSON.stringify({ month: '5', year: '1990', day: '15' }))
    }
  })
  await page.goto('./')
  await expect(page.getByLabel('Day', { exact: true })).toHaveValue('15')
  await expect(page.getByLabel('Month', { exact: true })).toHaveValue('6')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
})

test('a half-typed date left by the old site is ignored', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('DOB', JSON.stringify({ month: '', year: '199', day: '15' }))
    }
  })
  await page.goto('./')
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('')
  await expect(example(page)).toBeVisible()
})

test('forgetting a date carried over from the old site sticks', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('DOB', JSON.stringify({ month: '5', year: '1990', day: '15' }))
    }
  })
  await page.goto('./')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
  await page.getByRole('button', { name: 'Forget me' }).click()
  await page.reload()
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('')
  await expect(example(page)).toBeVisible()
})

test('the grid follows the form when a saved date is edited into something unusable', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)

  await page.getByLabel('Year', { exact: true }).fill('2030')
  await expect(page.getByRole('alert')).toHaveText('That date is in the future.')
  await expect(example(page)).toBeVisible()

  await page.getByLabel('Year', { exact: true }).fill('')
  await page.reload()
  await expect(page.getByLabel('Day', { exact: true })).toHaveValue('')
})

test('the page still works when the browser blocks storage', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'SecurityError')
    }
  })
  await page.goto('./')
  await expect(page.getByRole('status')).toContainText("isn't letting the page save anything")
  await enterBirthDate(page, '15', 'June', '1990')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
})

test('the grid can be explored with the keyboard', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')

  const today = page.locator('[data-state="today"]')
  await today.focus()
  await expect(today).toHaveAccessibleName('Age 36, week 20: 26 Oct 2026 to 1 Nov 2026, this week')

  await page.keyboard.press('ArrowRight')
  await expect(page.locator(':focus')).toHaveAccessibleName('Age 36, week 21: 2 Nov 2026 to 8 Nov 2026')
  await page.keyboard.press('ArrowUp')
  await expect(page.locator(':focus')).toHaveAccessibleName('Age 35, week 21: 2 Nov 2025 to 8 Nov 2025, lived')
  await page.keyboard.press('Home')
  await expect(page.locator(':focus')).toHaveAccessibleName('Age 35, week 1: 15 Jun 2025 to 21 Jun 2025, lived')
  await page.keyboard.press('Control+Home')
  await expect(page.locator(':focus')).toHaveAccessibleName('Age 0, week 1: 15 Jun 1990 to 21 Jun 1990, lived')

  // Only one box is in the tab order.
  await expect(page.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1)
})

test('no request leaves the site, and the page passes an accessibility scan', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const external: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) external.push(request.url())
  })
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)

  // Every row of the grid is built the same way; scanning all 4,680 boxes takes axe over 30s.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .exclude('[role="grid"] > div:nth-child(n+3):not(:has([data-state="today"]))')
    .analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  expect(external).toEqual([])
})

test('years, months and weeks views, each with today marked, remembered in the address', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')

  await page.getByRole('radio', { name: 'Months' }).check({ force: true })
  await expect(page).toHaveURL(/\?view=months$/)
  await expect(page.getByRole('grid')).toHaveAccessibleName('Your life in months: three years per row')
  await expect(page.getByTestId('summary')).toHaveText("You've lived 436 months, of the 1,200 on a 100-year grid.")
  await expect(page.locator('[data-state="lived"]')).toHaveCount(436)
  await expect(page.locator('[data-state="today"]')).toHaveAccessibleName(
    'Age 36, month 5: 15 Oct 2026 to 14 Nov 2026, this month',
  )

  await page.reload()
  await expect(page.getByRole('radio', { name: 'Months' })).toBeChecked()

  await page.getByRole('radio', { name: 'Years' }).check({ force: true })
  await expect(page).toHaveURL(/\?view=years$/)
  await expect(page.locator('[data-state="lived"]')).toHaveCount(36)
  await expect(page.locator('[data-state="today"]')).toHaveAccessibleName('Age 36: 15 Jun 2026 to 14 Jun 2027, this year')

  await page.getByRole('radio', { name: 'Weeks' }).check({ force: true })
  await expect(page).toHaveURL(/\/project-life\/$/)
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
})

test('the old page addresses still work', async ({ page }) => {
  await page.goto('years.html')
  await expect(page).toHaveURL(/\/project-life\/\?view=years$/)
  await expect(page.getByRole('radio', { name: 'Years' })).toBeChecked()
  await page.goto('months.html')
  await expect(page.getByRole('radio', { name: 'Months' })).toBeChecked()
  await page.goto('weeks.html')
  await expect(page).toHaveURL(/\/project-life\/$/)
  await expect(page.getByRole('radio', { name: 'Weeks' })).toBeChecked()
})

test('the grid length comes from ONS life tables, and can be set by hand', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  const years = page.getByLabel('Grid length (years)')
  const summary = page.getByTestId('summary')
  const expectancy = page.getByTestId('life-expectancy')

  // UK, both sexes averaged, cohort: the statistics suggest 100 years.
  await expect(years).toHaveValue('100')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(100 * 52)
  await expect(expectancy).toContainText('People like you live to about')
  await expect(expectancy).toContainText('in 100 people like you reach')

  // Different tables give different figures, and other nations load on demand.
  const before = await expectancy.textContent()
  await page.getByLabel('Life tables for').selectOption('male')
  await page.getByLabel('Where you live').selectOption('scotland')
  await expect(expectancy).not.toHaveText(before!)
  const cohort = await expectancy.textContent()
  await page.getByRole('radio', { name: "This year's (period)" }).check()
  await expect(expectancy).not.toHaveText(cohort!)

  // Typing a new length works keystroke by keystroke, and too short a length (at or below your age) is refused.
  const suggested = await years.inputValue()
  await years.fill('9')
  await expect(years).toHaveValue('9')
  await expect(page.getByText('The grid can run from 40 to 120 years.')).toBeVisible()
  await years.press('Enter')
  await expect(years).toHaveValue(suggested)
  await years.fill('36')
  await years.blur()
  await expect(years).toHaveValue(suggested)

  // A hand-set length sticks, and can be undone.
  await years.fill('90')
  await years.press('Enter')
  await expect(summary).toHaveText("You've lived 1,891 weeks, of the 4,680 on a 90-year grid.")
  await expect(page.locator('[role="gridcell"]')).toHaveCount(90 * 52)
  await page.reload()
  await expect(years).toHaveValue('90')
  await expect(page.getByLabel('Where you live')).toHaveValue('scotland')
  await page.getByRole('button', { name: /Use the figures/ }).click()
  await expect(page.getByRole('button', { name: /Use the figures/ })).toBeHidden()
})

test('a date saved by the first version of the new app keeps working', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('your-life', JSON.stringify({ version: 1, profile: { birthDate: '1990-06-15' } }))
    }
  })
  await page.goto('./')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)
  await expect(page.getByLabel('Life tables for')).toHaveValue('both')
  await expect(page.getByLabel('Where you live')).toHaveValue('uk')
})

test('if a nation\'s figures fail to load, the page says the UK\'s are shown', async ({ page, pageErrors }) => {
  await page.route(/scotland-.*\.js$/, (route) => route.abort())
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  await page.getByLabel('Where you live').selectOption('scotland')
  await expect(page.getByRole('status')).toContainText("The figures for Scotland couldn't be loaded, so these are the UK's.")
  // The blocked download is expected to log a failed request; nothing else may.
  const unexpected = pageErrors.filter((e) => !e.includes('Failed to load resource'))
  pageErrors.splice(0, pageErrors.length, ...unexpected)
})

test('the example life shows a made-up story that can\'t be edited', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('[data-eras]').first()).toBeVisible()
  await expect(page.locator('[data-goals]')).toHaveCount(2)
  await expect(page.getByTestId('legend')).toContainText('Education')
  await page.locator('[data-index="1000"]').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Your story' })).toHaveCount(0)
})
