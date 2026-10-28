import { expect, openSettings, test } from './fixtures'

const NOW = new Date('2026-10-26T12:00:00Z')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.goto('./')
  await page.getByLabel('Day', { exact: true }).fill('15')
  await page.getByLabel('Month', { exact: true }).selectOption({ label: 'June' })
  await page.getByLabel('Year', { exact: true }).fill('1990')
  await openSettings(page)
})

test('the chances overlay is off by default, and one choice turns it on and off', async ({ page }) => {
  await expect(page.getByRole('radio', { name: 'Just the numbers' })).toBeChecked()
  await expect(page.locator('[data-chance]')).toHaveCount(0)

  await page.getByRole('radio', { name: 'Show my chances on the grid' }).check()
  // Every box after this week (box 1,891 of 5,200) carries a chance, falling with age.
  await expect(page.locator('[data-chance]')).toHaveCount(5200 - 1892)
  const chance = async (index: number) => Number(await page.locator(`[data-index="${index}"]`).getAttribute('data-chance'))
  expect(await chance(1892)).toBeGreaterThan(0.99)
  expect(await chance(60 * 52)).toBeGreaterThan(await chance(80 * 52))
  expect(await chance(80 * 52)).toBeGreaterThan(await chance(95 * 52))
  await expect(page.locator(`[data-index="${80 * 52}"]`)).toHaveAccessibleName(/about \d in \d+ chance of being alive then/)
  await expect(page.getByTestId('chance-mark')).toHaveText(['1 in 2', '1 in 10'])
  await expect(page.getByTestId('legend')).toContainText('Fades with the chance of being alive')

  await page.reload()
  await openSettings(page)
  await expect(page.locator('[data-chance]')).toHaveCount(5200 - 1892)
  await page.getByRole('radio', { name: 'Just the numbers' }).check()
  await expect(page.locator('[data-chance]')).toHaveCount(0)
})

test('a bar shows how much of an average lifetime is lived, and the years to go', async ({ page }) => {
  const bar = page.getByRole('progressbar', { name: 'Share of an average lifetime lived' })
  const percent = Number(await bar.getAttribute('aria-valuenow'))
  // 36.4 years of an average of about 86-88 for men and women averaged born in 1990.
  expect(percent).toBeGreaterThanOrEqual(40)
  expect(percent).toBeLessThanOrEqual(44)
  await expect(page.getByTestId('life-bar')).toContainText(
    new RegExp(`That's about ${percent}% of an average lifetime for people like you: around 5\\d years to go, to about 20[78]\\d\\.`),
  )
})

test('without the chances, the grid still marks where half of people like you are still alive', async ({ page }) => {
  await expect(page.getByRole('radio', { name: 'Just the numbers' })).toBeChecked()
  const half = page.locator('[data-half]')
  await expect(half).toHaveCount(1)
  await expect(half).toHaveAccessibleName(/about half of people like you live beyond here$/)
  await expect(half).toHaveCSS('outline-style', 'solid')
  await expect(page.getByTestId('chance-mark')).toHaveText('1 in 2')
  await expect(page.getByTestId('legend')).toContainText('Where 1 in 2 people like you are still alive')
  // It sits near the age half of people like you reach: between 80 and 95.
  const index = Number(await half.getAttribute('data-index'))
  expect(index / 52).toBeGreaterThan(80)
  expect(index / 52).toBeLessThan(95)

  // The full chances keep the same mark (and add the 1-in-10).
  await page.getByRole('radio', { name: 'Show my chances on the grid' }).check()
  await expect(half).toHaveAttribute('data-index', String(index))
  await expect(page.getByTestId('chance-mark')).toHaveText(['1 in 2', '1 in 10'])

  await page.getByRole('radio', { name: 'Hide all statistics' }).check()
  await expect(half).toHaveCount(0)
  await expect(page.getByTestId('chance-mark')).toHaveCount(0)
})

test('hiding statistics removes every figure and stays hidden', async ({ page }) => {
  await expect(page.getByTestId('life-bar')).toBeVisible()
  await page.getByRole('radio', { name: 'Show my chances on the grid' }).check()
  await page.getByRole('radio', { name: 'Hide all statistics' }).check()
  const text = page.getByTestId('life-expectancy')
  // The grid isn't sized from the tables either (that would give the figures away): the classic 90 years.
  await expect(text).toHaveText(
    "The grid runs to 90 years. Statistics are hidden, so it isn't sized from them; turn them back on above whenever you like.",
  )
  await expect(page.getByTestId('life-bar')).toHaveCount(0)
  await expect(page.locator('[role="gridcell"]')).toHaveCount(90 * 52)
  await expect(page.locator('[data-chance]')).toHaveCount(0)
  for (const control of [page.getByRole('radio', { name: 'Projected (cohort)' }), page.getByLabel('Life tables for'), page.getByLabel('Where you live')]) {
    await expect(control).toBeHidden()
  }
  await expect(page.getByText('Office for National Statistics')).toBeHidden()

  await page.reload()
  await openSettings(page)
  await expect(text).not.toContainText('live to about')
  await expect(page.locator('[data-chance]')).toHaveCount(0)
})

test('an era or goal on a marked box keeps the 1-in-2 mark', async ({ page }) => {
  await page.getByRole('radio', { name: 'Show my chances on the grid' }).check()
  const marked = await page.locator('[data-chance]').evaluateAll((boxes) =>
    boxes.filter((b) => getComputedStyle(b).outlineStyle === 'solid').map((b) => Number(b.getAttribute('data-index'))),
  )
  expect(marked).toHaveLength(2)
  await page.locator(`[data-index="${marked[0]}"]`).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Set a goal here' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill('Big birthday')
  await page.getByRole('dialog').getByRole('button', { name: 'Save goal' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  const box = page.locator(`[data-index="${marked[0]}"]`)
  await expect(box).toHaveAttribute('data-goals', '1')
  await expect(box).toHaveCSS('outline-style', 'solid')
})

test('with the chances column, the week numbers still line up with the boxes', async ({ page }) => {
  await page.getByRole('radio', { name: 'Show my chances on the grid' }).check()
  const marks = page.getByTestId('column-marks')
  const firstRow = page.locator('[role="row"]').first()
  const [m, r] = await Promise.all([marks.boundingBox(), firstRow.boundingBox()])
  expect(Math.abs(m!.x - r!.x)).toBeLessThan(1)
  expect(Math.abs(m!.width - r!.width)).toBeLessThan(1)
})
