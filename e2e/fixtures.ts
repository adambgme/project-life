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

/** Open the folded Settings panel (sex, nation, grid length, death rates, statistics). */
export async function openSettings(page: import('@playwright/test').Page) {
  const settings = page.getByTestId('settings')
  if (!(await settings.evaluate((el) => (el as HTMLDetailsElement).open))) await settings.locator('summary').click()
}

export { expect }
