import { defineConfig } from '@playwright/test';

/**
 * Pruebas de lógica pura: no levantan Next ni abren un navegador, así que corren
 * en segundos. Las que necesitan el servidor viven en tests/e2e.
 */
export default defineConfig({
  testDir: './tests/unit',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  workers: 1,
});
