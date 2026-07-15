import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_DIR = path.join(process.cwd(), 'test-artifacts');

async function capture(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, name),
    fullPage: false,
  });
}

async function mockTelemetry(page: Page) {
  await page.route('**/api/events/ingest', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function chooseAndContinue(page: Page, option: string) {
  await page.getByRole('radio', { name: option, exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByText('EVIDENCIA CALIBRADA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

test('cinematic English probe records transfer and D7 without false mastery', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await mockTelemetry(page);
  const response = await page.goto('/crear');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { name: 'Can you sound certain without pretending you know?' })).toBeVisible();
  await expect(page.getByText('Descubre', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar al reto', exact: true })).toBeInViewport();
  await capture(page, 'celestea-v2-mobile-hero.png');
  await page.getByRole('button', { name: 'Entrar al reto', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Reconstruct the past.' })).toBeVisible();
  await page.getByRole('textbox').fill(
    "The cloud must have replaced the file. Diego might have moved it. Nerea can't have deleted it."
  );
  await page.getByRole('button', { name: 'Enviar idea', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What does the speaker actually know?' })).toBeVisible();
  const factRadio = page.getByRole('radio', { name: 'It reports a witnessed fact.', exact: true });
  const inferenceRadio = page.getByRole('radio', { name: 'It shows a strong conclusion from evidence.', exact: true });
  await factRadio.check();
  await factRadio.press('ArrowRight');
  await expect(inferenceRadio).toBeChecked();
  await page.getByRole('radio', { name: 'It gives the cloud an obligation.', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByText('AJUSTE ÚTIL', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Probar otra vez', exact: true }).click();
  await page.getByRole('radio', { name: 'It shows a strong conclusion from evidence.', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'One past. Three levels of confidence.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await chooseAndContinue(page, 'must have');
  await chooseAndContinue(page, 'might have');
  await chooseAndContinue(page, "can't have");

  await expect(page.getByRole('heading', { name: 'Resist overconfidence.' })).toBeVisible();
  await page.getByRole('textbox').fill('Diego might have renamed the file.');
  await page.getByRole('button', { name: 'Enviar idea', exact: true }).click();
  await expect(page.getByText('EVIDENCIA CALIBRADA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'New file. New evidence.' })).toBeVisible();
  await page.getByRole('textbox').fill(
    "The system must have renamed it. Camila might have edited it. Omar can't have changed it."
  );
  await page.getByRole('button', { name: 'Enviar idea', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Different world. Same kind of evidence.' })).toBeVisible();
  await page.getByRole('textbox').fill(
    "The label must have scheduled the release. Leo might have edited the caption. Mara can't have uploaded it."
  );
  await page.getByRole('button', { name: 'Guardar evidencia', exact: true }).click();
  await expect(page.getByText('You carried the pattern into a new case', { exact: true })).toBeVisible();
  const transferState = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(transferState.attempts.transfer).toBe(1);
  expect(transferState.firstOutcomes.transfer.correct).toBe(true);
  await page.reload();
  await expect(page.getByText('You carried the pattern into a new case', { exact: true })).toBeVisible();
  const reloadedTransferState = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(reloadedTransferState.attempts.transfer).toBe(1);
  await page.getByRole('button', { name: 'Ver mi evidencia', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'One attempt is a signal. Seven days tests what stayed.' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar y cerrar', exact: true }).click();

  await expect(page.getByRole('heading', { name: '¿Sigue contigo?' })).toBeVisible();
  await page.getByRole('textbox').fill(
    "The platform must have applied the update. Ren might have edited the code. Emi can't have pushed it."
  );
  await page.getByRole('button', { name: 'Guardar evidencia', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar revisión', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Ahora sí sabemos qué permaneció.' })).toBeVisible();
  await expect(page.getByText('El patrón se sostuvo en un caso nuevo.', { exact: true })).toBeVisible();
  const completedState = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(completedState.attempts.retest).toBe(1);
  expect(completedState.firstOutcomes.retest.correct).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('keeps classifying authored branches when the classifier API is offline', async ({ page }) => {
  await mockTelemetry(page);
  await page.route('**/api/classify', async (route) => route.abort('failed'));
  await page.goto('/crear');

  await page.getByRole('button', { name: 'Entrar al reto', exact: true }).click();
  await page.getByRole('textbox').fill(
    "The cloud must have replaced the file. Diego might have moved it. Nerea can't have deleted it."
  );
  await page.getByRole('button', { name: 'Enviar idea', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What does the speaker actually know?' })).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(state.firstOutcomes.precheck.branch).toBe('correcto');
  expect(state.firstOutcomes.precheck.correct).toBe(true);
});

test('does not turn an incorrect transfer into a success claim', async ({ page }) => {
  await mockTelemetry(page);
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem(
      'celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1',
      JSON.stringify({
        studyId: 'incorrect-transfer-study',
        lessonId: 'CREAR-ENGLISH-DEDUCTION-V1',
        contentVersion: '2026-07-13',
        startedAt: now,
        updatedAt: now,
        phase: 'initial',
        stepIndex: 9,
        attempts: {},
        firstOutcomes: {},
        latestOutcomes: {},
        awaitingFeedback: {},
      })
    );
  });
  await page.goto('/crear');

  await expect(page.getByRole('heading', { name: 'Different world. Same kind of evidence.' })).toBeVisible();
  await page.getByRole('textbox').fill(
    'The label might have scheduled it. Leo must have edited it. Mara might have uploaded it.'
  );
  await page.getByRole('button', { name: 'Guardar evidencia', exact: true }).click();
  await expect(page.getByText('The clues do not earn equal confidence', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar intento', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'One attempt is a signal. Seven days tests what stayed.' })).toBeVisible();
  await expect(page.getByText('Your first attempt is saved.', { exact: false })).toBeVisible();
  await expect(page.getByText('You transferred the pattern once.', { exact: false })).toHaveCount(0);
  const state = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(state.firstOutcomes.transfer.correct).toBe(false);
});

test('local classifier requires clue mapping and prioritizes misconceptions', async ({ request }) => {
  const unrelated = await request.post('/api/classify', {
    data: {
      tallerId: 'CREAR-ENGLISH-DEDUCTION-V1',
      pasoRefId: 'precheck',
      texto: "The dog must have escaped. My friend might have called. The teacher can't have known.",
    },
  });
  expect(unrelated.ok()).toBe(true);
  expect((await unrelated.json()).rama).not.toBe('correcto');

  const miscalibrated = await request.post('/api/classify', {
    data: {
      tallerId: 'CREAR-ENGLISH-DEDUCTION-V1',
      pasoRefId: 'precheck',
      texto: 'The cloud might have replaced it. Diego must have moved it. Nerea might have deleted it.',
    },
  });
  expect(miscalibrated.ok()).toBe(true);
  expect((await miscalibrated.json()).rama).toBe('misconcepcion_certeza');
});

test('desktop arrival keeps the cinematic CTA compact and visible', async ({ page }) => {
  await mockTelemetry(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', { name: 'Can you sound certain without pretending you know?' })).toBeVisible();
  const cta = page.getByRole('button', { name: 'Entrar al reto', exact: true });
  const ctaBox = await cta.boundingBox();
  expect(ctaBox).not.toBeNull();
  expect(ctaBox?.height).toBeLessThanOrEqual(60);
  await expect(cta).toBeInViewport();
  await capture(page, 'celestea-v2-desktop-hero.png');
});
