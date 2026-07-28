import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'NEXT_DIST_DIR=.next-playwright CREAR_CLASSIFIER_FORCE_LOCAL=1 NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS=0 pnpm exec next dev --hostname 127.0.0.1 --port 3001',
    url: 'http://127.0.0.1:3001/crear',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
