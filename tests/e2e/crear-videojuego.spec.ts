import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_DIR = path.join(process.cwd(), 'test-artifacts');

async function screenshot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: path.join(ARTIFACT_DIR, `${name}.png`),
  });
}

test('CREAR Videojuegos happy path completes with no console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.route('**/api/events/ingest', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ ok: true }),
    });
  });

  const response = await page.goto('/crear/legacy');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { name: 'Elige un misterio' })).toBeVisible();
  await screenshot(page, '01-picker');

  await page.getByRole('button', { name: /Videojuegos/ }).click();
  await expect(page.getByRole('heading', { name: 'Por qué no puedes soltar tu videojuego' })).toBeVisible();
  await screenshot(page, '02-videojuego-intro');

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Tu hipótesis', { exact: true })).toBeVisible();
  await screenshot(page, '03-hipotesis');
  await page.locator('textarea').fill('me dan recompensas por subir de nivel');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('Poner a prueba', { exact: true }).last()).toBeVisible();
  await screenshot(page, '04-hipotesis-feedback');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Recompensa variable', { exact: true })).toBeVisible();
  await screenshot(page, '05-concepto');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Microcheck', { exact: true })).toBeVisible();
  await screenshot(page, '06-microcheck');
  await page.getByRole('radio', { name: 'un premio que no esperas' }).click();
  await page.getByRole('button', { name: 'Responder' }).click();

  await expect(page.getByText('Reto', { exact: true })).toBeVisible();
  await screenshot(page, '07-reto');
  await page.locator('textarea').fill('una caja que suelta un enemigo al azar');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('Buen diseño o exceso', { exact: true })).toBeVisible();
  await screenshot(page, '08-reto-solida');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Cierre del reto', { exact: true })).toBeVisible();
  await screenshot(page, '09-reto-final');
  await page.locator('textarea').fill('No, me aburriría si siempre saliera lo mismo.');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('Tarjeta de veredicto', { exact: true })).toBeVisible();
  await screenshot(page, '10-tarjeta');
  await page.getByRole('radio', { name: 'Las dos' }).click();
  await page.locator('textarea').fill('Es buen diseño, pero también me atrapa de más por la sorpresa.');
  await page.getByRole('button', { name: 'Guardar tarjeta' }).click();

  await expect(page.getByText('Transferencia', { exact: true })).toBeVisible();
  await screenshot(page, '11-transferencia');
  const transferAnswer = page.getByRole('textbox', { name: /Antes de cerrar/ });
  await expect(transferAnswer).toBeVisible();
  // The legacy composer clears its local state in an effect when the prompt changes.
  // Let that preserved implementation settle before entering the regression fixture.
  await page.waitForTimeout(250);
  await transferAnswer.fill(
    'Las redes sociales cuando muestran notificaciones y likes sorpresa después de publicar algo.'
  );
  await expect(transferAnswer).toHaveValue(
    'Las redes sociales cuando muestran notificaciones y likes sorpresa después de publicar algo.'
  );
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('Cierre', { exact: true })).toBeVisible();
  await screenshot(page, '12-cierre');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Ya tienes la idea' })).toBeVisible();
  await screenshot(page, '13-completion');

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
