import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// 26 Oct 2026; born 15 Jun 1990. Box numbers are weeks counted from birth, 52 per year of age.
const NOW = new Date('2026-10-26T12:00:00Z')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.goto('./')
  await page.getByLabel('Day', { exact: true }).fill('15')
  await page.getByLabel('Month', { exact: true }).selectOption({ label: 'June' })
  await page.getByLabel('Year', { exact: true }).fill('1990')
})

const box = (page: Page, index: number) => page.locator(`[data-index="${index}"]`)
const dialog = (page: Page) => page.getByRole('dialog')

async function addEra(page: Page, fromBox: number, name: string, category: string, start: string, end: string | null) {
  await box(page, fromBox).click()
  await dialog(page).getByRole('button', { name: 'Start an era here' }).click()
  await dialog(page).getByLabel('Name').fill(name)
  await dialog(page).getByLabel('Category').selectOption({ label: category })
  await dialog(page).getByLabel('From').fill(start)
  if (end) {
    await dialog(page).getByLabel('Still going').uncheck()
    await dialog(page).getByLabel('To').fill(end)
  }
  await dialog(page).getByRole('button', { name: 'Save era' }).click()
  await dialog(page).getByRole('button', { name: 'Close' }).click()
}

test('an era added from a box colours every week it covers, and is remembered', async ({ page }) => {
  // University: 20 Sep 2008 (box 949) to 30 Jun 2011 (box 1094): 146 weeks.
  await addEra(page, 1000, 'University', 'Education', '2008-09-20', '2011-06-30')

  await expect(dialog(page)).toBeHidden()
  await expect(page.locator('[data-eras]')).toHaveCount(146)
  await expect(box(page, 948)).not.toHaveAttribute('data-eras')
  await expect(box(page, 949)).toHaveAttribute('data-eras', '1')
  await expect(box(page, 1094)).toHaveAttribute('data-eras', '1')
  await expect(box(page, 1095)).not.toHaveAttribute('data-eras')
  // Painted in the Education colour (#9c7020), not left blank.
  await expect(box(page, 1000)).toHaveCSS('background-color', 'rgb(156, 112, 32)')
  await expect(box(page, 1000)).toHaveAccessibleName(/University/)
  await expect(page.getByTestId('legend')).toContainText('Education')

  await page.reload()
  await expect(page.locator('[data-eras]')).toHaveCount(146)
})

test('eras can be edited and deleted from the story list', async ({ page }) => {
  await addEra(page, 1000, 'University', 'Education', '2008-09-20', '2011-06-30')
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Edit era University' }).click()
  await dialog(page).getByLabel('Name').fill('Uni in Leeds')
  await dialog(page).getByRole('button', { name: 'Save era' }).click()
  await expect(dialog(page)).toContainText('Uni in Leeds')
  await expect(box(page, 1000)).toHaveAccessibleName(/Uni in Leeds/)

  await dialog(page).getByRole('button', { name: 'Edit era Uni in Leeds' }).click()
  await dialog(page).getByRole('button', { name: 'Delete era' }).click()
  await expect(page.locator('[data-eras]')).toHaveCount(0)
})

test('a moment marks its week, and can be edited and deleted', async ({ page }) => {
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Add a moment' }).click()
  await dialog(page).getByLabel('Name').fill('Moved house')
  await dialog(page).getByLabel('Category').selectOption({ label: 'Home' })
  await dialog(page).getByLabel('Date').fill('2020-03-01')
  await dialog(page).getByRole('button', { name: 'Save moment' }).click()

  // 1 Mar 2020 is age 29, week 38: box 1545.
  await expect(page.locator('[data-moments]')).toHaveCount(1)
  await expect(box(page, 1545)).toHaveAttribute('data-moments', '1')
  await expect(box(page, 1545)).toHaveAccessibleName(/moment: Moved house/)

  await dialog(page).getByRole('button', { name: 'Edit moment Moved house' }).click()
  await dialog(page).getByRole('button', { name: 'Delete moment' }).click()
  await expect(page.locator('[data-moments]')).toHaveCount(0)
})

test('impossible entries are explained, not saved', async ({ page }) => {
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Add a moment' }).click()
  await dialog(page).getByLabel('Name').fill('Next year')
  await dialog(page).getByLabel('Date').fill('2027-01-01')
  await dialog(page).getByRole('button', { name: 'Save moment' }).click()
  await expect(dialog(page).getByRole('alert')).toHaveText('Moments are things that have happened. Pick a date up to today.')

  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  await dialog(page).getByRole('button', { name: 'Add an era' }).click()
  await dialog(page).getByLabel('Name').fill('Backwards')
  await dialog(page).getByLabel('From').fill('2010-01-01')
  await dialog(page).getByLabel('Still going').uncheck()
  await dialog(page).getByLabel('To').fill('2009-01-01')
  await dialog(page).getByRole('button', { name: 'Save era' }).click()
  await expect(dialog(page).getByRole('alert')).toHaveText('The end is before the start.')
  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('[data-eras], [data-moments]')).toHaveCount(0)
})

test('overlapping eras: the newest fills the box, the other shows as a stripe', async ({ page }) => {
  await addEra(page, 1000, 'University', 'Education', '2008-09-20', '2011-06-30')
  // Job from 4 Jan 2010 (box 1017) overlaps University until box 1094.
  await addEra(page, 1050, 'Weekend job', 'Work', '2010-01-04', '2012-12-31')
  await expect(box(page, 1050)).toHaveAttribute('data-eras', '2')
  await expect(box(page, 1050)).toHaveCSS('background-color', 'rgb(62, 95, 138)')
  await expect(box(page, 1050)).toHaveCSS('background-image', /linear-gradient/)
  await expect(box(page, 1050)).toHaveAccessibleName(/Weekend job, University/)
  await expect(box(page, 1000)).toHaveAttribute('data-eras', '1')
})

test('the keyboard opens a box with Enter and closes it with Escape', async ({ page }) => {
  await page.locator('[data-state="today"]').focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByRole('heading')).toHaveText('26 Oct 2025 – 1 Nov 2025')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
})

test('category colours can be changed and reset', async ({ page }) => {
  await addEra(page, 1000, 'University', 'Education', '2008-09-20', '2011-06-30')
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByText('Category colours').click()
  await dialog(page).getByLabel('Education colour').fill('#123456')
  await expect(box(page, 1000)).toHaveCSS('background-color', 'rgb(18, 52, 86)')
  await dialog(page).getByRole('button', { name: 'Reset colours' }).click()
  await expect(box(page, 1000)).toHaveCSS('background-color', 'rgb(156, 112, 32)')
})

test('"Forget me" deletes the story too, after asking', async ({ page }) => {
  await addEra(page, 1000, 'University', 'Education', '2008-09-20', '2011-06-30')

  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Forget me' }).click()
  await expect(page.locator('[data-eras]')).toHaveCount(146)

  page.once('dialog', (d) => {
    expect(d.message()).toContain('1 era, 0 moments')
    void d.accept()
  })
  await page.getByRole('button', { name: 'Forget me' }).click()
  await expect(page.getByTestId('example')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('your-life'))).toBeNull()
})

test('retyping the date keeps the story, and says so', async ({ page }) => {
  await addEra(page, 1000, 'University', 'Education', '2008-09-20', '2011-06-30')
  await page.getByLabel('Year', { exact: true }).fill('19')
  await expect(page.getByTestId('waiting')).toContainText('Your story (1 entry) is saved in this browser')
  await expect(page.getByTestId('example')).toHaveCount(0)
  await page.getByLabel('Year', { exact: true }).fill('1990')
  await expect(page.locator('[data-eras]')).toHaveCount(146)
})

test('an era still going must have started by today', async ({ page }) => {
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Add an era' }).click()
  await dialog(page).getByLabel('Name').fill('New job')
  await dialog(page).getByLabel('From').fill('2026-12-01')
  await dialog(page).getByRole('button', { name: 'Save era' }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('must have started by today')
})
