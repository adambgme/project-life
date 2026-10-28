import { expect, test as base } from '@playwright/test'

/** Every journey fails if the page throws or logs an error, even when the assertions pass. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(String(error)))
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
      await use(errors)
      expect(errors).toEqual([])
    },
    { auto: true },
  ],
})

/** Open the Settings panel (sex, nation, grid length, death rates, statistics, forgetting) from the header. */
export async function openSettings(page: import('@playwright/test').Page) {
  const settings = page.getByTestId('settings')
  if (!(await settings.evaluate((el) => (el as HTMLDialogElement).open))) {
    await page.getByRole('banner').getByRole('button', { name: 'Settings' }).click()
  }
  await expect(settings).toBeVisible()
}

export { expect }
