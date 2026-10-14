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
    // Las variables van en `env` y no antepuestas al comando: `VAR=1 comando` no
    // existe en cmd.exe, así que así la suite arranca igual en Windows y en Linux.
    command: 'npx next dev --hostname 127.0.0.1 --port 3001',
    env: {
      // Aísla también el layout heredado y los lectores: nunca heredar credenciales reales de .env.local.
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'playwright-only-anon-placeholder',
      SUPABASE_SERVICE_ROLE_KEY: 'playwright-only-service-placeholder',
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3001',
      NEXT_DIST_DIR: '.next-playwright',
      CREAR_CLASSIFIER_FORCE_LOCAL: '1',
      NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS: '0',
      CREAR_RETEST_TEST_MODE: '1',
      CREAR_RETEST_DELAY_HOURS: '0',
      CREAR_RETEST_SIGNING_SECRET: 'playwright-only-retest-secret-000000000',
      // Defensas orales: almacén en memoria y proveedores falsos, sin llaves ni red.
      DEFENSA_ALMACEN: 'memoria',
      DEFENSA_SIGNING_SECRET: 'playwright-only-defensa-secret-00000000000',
      DEFENSA_LLM_PROVIDER: 'mock',
      DEFENSA_STT_PROVIDER: 'mock',
      DEFENSA_TTS_PROVIDER: 'mock',
      CRON_SECRET: 'playwright-only-cron-secret',
    },
    url: 'http://127.0.0.1:3001/crear',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
