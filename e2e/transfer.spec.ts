import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

const NOW = new Date('2026-10-26T12:00:00Z')
const dialog = (page: Page) => page.getByRole('dialog')

const SAVED = {
  version: 3,
  profile: { birthDate: '1990-06-15', sex: 'both', nation: 'uk', basis: 'cohort', gridYears: null },
  eras: [{ id: 'a', label: 'University', category: 'education', start: '2008-09-20', end: '2011-06-30' }],
  moments: [{ id: 'm', label: 'Moved house', category: 'home', date: '2020-03-01' }],
  goals: [{ id: 'g', label: 'Retire', category: 'work', target: { kind: 'age', age: 60 } }],
  colours: {},
}

async function seed(page: Page, saved: unknown) {
  await page.goto('./')
  await page.evaluate((value) => localStorage.setItem('your-life', JSON.stringify(value)), saved)
  await page.reload()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
})

test('export a backup, forget everything, and bring it back from the file', async ({ page }) => {
  await seed(page, SAVED)
  await page.getByRole('button', { name: 'Your story' }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), dialog(page).getByRole('button', { name: 'Export a file' }).click()])
  expect(download.suggestedFilename()).toBe('your-life-2026-10-26.json')
  const text = readFileSync(await download.path(), 'utf8')
  expect(JSON.parse(text)).toMatchObject({ format: 'your-life', exportedOn: '2026-10-26', eras: SAVED.eras, goals: SAVED.goals })
  await dialog(page).getByRole('button', { name: 'Close' }).click()

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Forget me' }).click()
  await expect(page.getByTestId('example')).toBeVisible()

  await page.getByLabel('Import a file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await expect(page.getByTestId('import-incoming')).toHaveText('Born 15 Jun 1990 · 1 era · 1 moment · 1 goal')
  await expect(page.getByTestId('import-current')).toHaveText('Nothing saved')
  await dialog(page).getByRole('button', { name: 'Import', exact: true }).click()

  await expect(page.locator('[data-eras]')).toHaveCount(146)
  await expect(page.getByTestId('next-goal')).toContainText('Retire')
  await page.reload()
  await expect(page.locator('[data-goals]')).toHaveCount(1)
})

test('importing over a saved life asks first, and cancelling keeps it', async ({ page }) => {
  await seed(page, SAVED)
  const other = { ...SAVED, format: 'your-life', eras: [], moments: [], goals: [] }
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByLabel('Import a file').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(other)) })
  const confirm = page.getByRole('dialog', { name: 'Import a backup' })
  await expect(confirm.getByTestId('import-current')).toHaveText('Born 15 Jun 1990 · 1 era · 1 moment · 1 goal')
  await expect(confirm.getByRole('button', { name: 'Replace with import' })).toBeVisible()
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('[data-eras]')).toHaveCount(146)
})

test('a file that is not a backup is explained', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Import a file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText("That file isn't a Your Life backup.")
})

test('send to my phone: the QR link opens the whole story on another device', async ({ page, browser, baseURL }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await seed(page, SAVED)
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Send to my phone' }).click()
  await expect(page.getByTestId('qr')).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Copy the link instead' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(new RegExp(`^${baseURL}#import=[A-Za-z0-9_-]+$`))

  // A fresh browser stands in for the phone.
  const phone = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/London' })
  const other = await phone.newPage()
  await other.clock.setFixedTime(NOW)
  await other.goto(link)
  const confirm = other.getByRole('dialog', { name: 'Import from a link' })
  await expect(confirm.getByTestId('import-incoming')).toHaveText('Born 15 Jun 1990 · 1 era · 1 moment · 1 goal')
  await confirm.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(other.locator('[data-eras]')).toHaveCount(146)
  expect(other.url()).not.toContain('#import')

  // The same link opened into a tab that already has the page is read too.
  await other.evaluate((url) => (window.location.href = url), link.replace(/^.*#/, '#'))
  await expect(other.getByRole('dialog', { name: 'Import from a link' })).toBeVisible()
  await other.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  expect(other.url()).not.toContain('#import')
  await phone.close()
})

test('if copying is blocked, the link is shown to copy by hand', async ({ page }) => {
  await seed(page, SAVED)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } })
  })
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Send to my phone' }).click()
  await dialog(page).getByRole('button', { name: 'Copy the link instead' }).click()
  await expect(dialog(page).getByRole('textbox')).toHaveValue(/#import=/)
})

test('a story too big for a QR code says to export a file instead', async ({ page }) => {
  const eras = Array.from({ length: 400 }, (_, i) => ({
    id: `e${i}`,
    label: `A rather long era name number ${i} to fill the code`,
    category: 'other',
    start: `${2000 + (i % 20)}-0${1 + (i % 9)}-1${i % 10}`,
    end: null,
  }))
  await seed(page, { ...SAVED, eras })
  await page.getByRole('button', { name: 'Your story' }).click()
  await dialog(page).getByRole('button', { name: 'Send to my phone' }).click()
  await expect(dialog(page).getByRole('status')).toContainText('too big for a QR code')
})
