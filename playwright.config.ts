import { defineConfig, devices } from '@playwright/test'

const port = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Locally, one browser at a time: several Chromium workers use about 4 GB, more than the dev machine can spare.
  workers: process.env.CI ? undefined : 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}/project-life/`,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    // The motion checks in the other engines: Safari has scroll-driven animations, Firefox (so far) shows the page still.
    // WebKit needs system libraries the CI image has, so it runs there only.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: 'motion.spec.ts' },
    ...(process.env.CI ? [{ name: 'webkit', use: { ...devices['iPhone 15'] }, testMatch: 'motion.spec.ts' }] : []),
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${port}/project-life/`,
    reuseExistingServer: !process.env.CI,
  },
})
