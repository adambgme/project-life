import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00Z'))
  await page.goto('./')
  await page.getByLabel('Day', { exact: true }).fill('15')
  await page.getByLabel('Month', { exact: true }).selectOption({ label: 'June' })
  await page.getByLabel('Year', { exact: true }).fill('1990')
})

const settings = (page: Page) => page.getByTestId('settings')
const gear = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Settings' })

test('Settings is out of the way until opened, then closes back to where it was opened', async ({ page }) => {
  await expect(settings(page)).toBeHidden()
  await expect(page.getByRole('radio', { name: 'Just the numbers' })).toBeHidden()

  await gear(page).click()
  await expect(settings(page)).toBeVisible()
  await expect(gear(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(settings(page).getByRole('heading', { name: 'Settings' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(settings(page)).toBeHidden()
  await expect(gear(page)).toBeFocused()

  // The line of choices under the life bar opens it too, and Done closes it.
  await page.getByTestId('settings-summary').click()
  await expect(settings(page)).toBeVisible()
  await settings(page).getByRole('button', { name: 'Done' }).click()
  await expect(settings(page)).toBeHidden()
  await expect(page.getByTestId('settings-summary')).toBeFocused()
})

test('changes show on the grid while Settings is open', async ({ page }) => {
  await gear(page).click()
  await settings(page).getByRole('radio', { name: 'Show my chances on the grid' }).check()
  await expect(settings(page)).toBeVisible()
  await expect(page.locator('[data-chance]').first()).toBeAttached()
  await expect(page.getByTestId('settings-summary')).toContainText('chances on the grid')
})

test('on a wide screen the panel sits beside the grid, not over it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await gear(page).click()
  await expect(settings(page)).toBeVisible()
  // Let the slide-in finish.
  await expect.poll(() => settings(page).evaluate((el) => el.getAnimations().length)).toBe(0)
  const panel = (await settings(page).boundingBox())!
  const grid = (await page.getByRole('grid').boundingBox())!
  expect(grid.x + grid.width).toBeLessThanOrEqual(panel.x)
})
