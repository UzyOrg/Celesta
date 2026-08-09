import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  /**
   * Every worker shares one `next dev` server, and dev compiles per request. At
   * three workers they queue behind each other: the suite takes 7.0m instead of
   * 3.2m, and workers sit idle long enough that Playwright force-kills them at
   * teardown — five-minute stalls and three spurious errors on a fully passing
   * run. Serial is both faster and quiet here. Measured, not assumed.
   */
  workers: 1,
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
