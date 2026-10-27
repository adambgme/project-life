import { expect, test } from './fixtures'

test('the app can be installed: a manifest with icons', async ({ page, request, baseURL }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await request.get(new URL(href!, baseURL).toString())).json()
  expect(manifest).toMatchObject({ name: 'Your Life', start_url: '/project-life/', scope: '/project-life/', display: 'standalone' })
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, new URL(href!, baseURL)).toString())
    expect(response.headers()['content-type']).toBe('image/png')
  }
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('after one visit everything works offline, other nations included', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    // Wait until the precache has finished installing and the worker controls the page.
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    return registration.active?.state
  })

  await context.setOffline(true)
  await page.reload()
  await page.getByLabel('Day', { exact: true }).fill('15')
  await page.getByLabel('Month', { exact: true }).selectOption({ label: 'June' })
  await page.getByLabel('Year', { exact: true }).fill('1990')
  await page.getByLabel('Where you live').selectOption('wales')
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByTestId('life-expectancy')).toContainText('People like you live to about')

  await page.goto('./?page=explore')
  await expect(page.getByTestId('nations').getByRole('listitem')).toHaveCount(5)
  await page.goto('./years.html')
  await expect(page).toHaveURL(/\?view=years$/)
  await context.setOffline(false)
})
