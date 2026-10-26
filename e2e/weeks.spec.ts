import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// 26 Oct 2026, midday in London. Someone born 15 Jun 1990 is 36, and 133 days past their birthday
// (week 19 of the row), so 36 × 52 + 19 = 1,891 weeks are fully lived and box 1,891 is this week.
const NOW = new Date('2026-10-26T12:00:00Z')
const LIVED = 1891

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
  await expect(page.locator('[data-state="lived"]')).toHaveCount(0)

  await enterBirthDate(page, '15', 'June', '1990')

  await expect(page.getByTestId('summary')).toHaveText("You've lived 1,891 weeks.")
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
  await expect(page.locator('[data-state="lived"]')).toHaveCount(0)
})

test('forgetting the date clears the grid and the saved copy', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  await page.getByRole('button', { name: 'Forget my date' }).click()
  await expect(page.locator('[data-state="lived"]')).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('')
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
  await expect(page.locator('[data-state="lived"]')).toHaveCount(0)
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
  await page.getByRole('button', { name: 'Forget my date' }).click()
  await page.reload()
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(0)
})

test('the grid follows the form when a saved date is edited into something unusable', async ({ page }) => {
  await page.goto('./')
  await enterBirthDate(page, '15', 'June', '1990')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(LIVED)

  await page.getByLabel('Year', { exact: true }).fill('2030')
  await expect(page.getByRole('alert')).toHaveText('That date is in the future.')
  await expect(page.locator('[data-state="lived"]')).toHaveCount(0)

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
    .exclude('[role="row"]:nth-child(n+3):not(:has([data-state="today"]))')
    .analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  expect(external).toEqual([])
})
