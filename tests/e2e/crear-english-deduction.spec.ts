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

interface CapturedLearningEvent {
  paso_id: string;
  verbo: string;
  result?: {
    attempt?: number;
    intento?: number;
    partes?: Array<{ categoria: string; texto: string }>;
    texto?: string;
  };
}

async function mockTelemetry(page: Page): Promise<CapturedLearningEvent[]> {
  const capturedEvents: CapturedLearningEvent[] = [];
  await page.route('**/api/events/ingest', async (route) => {
    const payload = route.request().postDataJSON() as { events?: CapturedLearningEvent[] };
    capturedEvents.push(...(payload.events ?? []));
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ ok: true }),
    });
  });
  return capturedEvents;
}

async function chooseAndContinue(page: Page, option: string) {
  await page.getByRole('radio', { name: option, exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByText('EVIDENCIA CALIBRADA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

interface StructuredAnswers {
  almostCertain: string;
  possible: string;
  impossible: string;
}

async function submitStructuredAnswer(
  page: Page,
  answers: StructuredAnswers,
  finalAction: 'Enviar idea' | 'Guardar evidencia'
) {
  await page
    .getByRole('textbox', { name: '¿Qué casi seguramente ocurrió?', exact: true })
    .fill(answers.almostCertain);
  await page.getByRole('button', { name: 'Siguiente conclusión', exact: true }).click();
  await page
    .getByRole('textbox', {
      name: '¿Qué pudo ocurrir, pero no puedes asegurarlo?',
      exact: true,
    })
    .fill(answers.possible);
  await page.getByRole('button', { name: 'Siguiente conclusión', exact: true }).click();
  await page
    .getByRole('textbox', { name: '¿Qué no pudo haber ocurrido?', exact: true })
    .fill(answers.impossible);
  await page.getByRole('button', { name: finalAction, exact: true }).click();
}

test('cinematic English probe records transfer and D7 without false mastery', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const telemetryEvents = await mockTelemetry(page);
  const response = await page.goto('/crear');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { name: 'El video desapareció justo antes del cierre.' })).toBeVisible();
  await expect(page.getByText('Descubre', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar al reto', exact: true })).toBeInViewport();
  await expect(page.getByRole('region', { name: 'Explorador de evidencias' })).toBeVisible();
  await expect(page.getByText('Diego opened the folder. His activity after that is unknown.')).toBeVisible();
  await page.getByRole('button', { name: 'Descubrir siguiente señal', exact: true }).click();
  await expect(page.getByText("Nerea's account was read-only — it had no edit or delete permissions.")).toBeVisible();
  await page.getByRole('button', { name: 'Descubrir siguiente señal', exact: true }).click();
  await expect(page.getByText('SYNC CONFLICT — local copy replaced.')).toBeVisible();
  await capture(page, 'celestea-v2-mobile-hero.png');
  await page.getByRole('button', { name: 'Entrar al reto', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Reconstruye lo que ocurrió.' })).toBeVisible();
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The cloud must have replaced the file.',
      possible: 'Diego might have moved it.',
      impossible: "Nerea can't have deleted it.",
    },
    'Enviar idea'
  );

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
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The system must have renamed it.',
      possible: 'Camila might have edited it.',
      impossible: "Omar can't have changed it.",
    },
    'Enviar idea'
  );
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Different world. Same kind of evidence.' })).toBeVisible();
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The track must have been scheduled.',
      possible: 'Leo might have edited the caption.',
      impossible: "Mara can't have uploaded it.",
    },
    'Guardar evidencia'
  );
  await expect(page.getByText('You carried the pattern into a new case', { exact: true })).toBeVisible();
  const transferState = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(transferState.attempts.transfer).toBe(1);
  expect(transferState.firstOutcomes.transfer.correct).toBe(true);
  expect(transferState.firstOutcomes.transfer.parts).toEqual([
    { categoria: 'casi_seguro', texto: 'The track must have been scheduled.' },
    { categoria: 'posible', texto: 'Leo might have edited the caption.' },
    { categoria: 'imposible', texto: "Mara can't have uploaded it." },
  ]);
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
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The platform must have applied the update.',
      possible: 'Ren might have edited the code.',
      impossible: "Emi can't have pushed it.",
    },
    'Guardar evidencia'
  );
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
  await expect
    .poll(
      () => telemetryEvents.filter((event) => event.verbo === 'envio_respuesta' && event.paso_id === 'transfer'),
      { timeout: 5_000 }
    )
    .toHaveLength(1);
  const transferEvent = telemetryEvents.find(
    (event) => event.verbo === 'envio_respuesta' && event.paso_id === 'transfer'
  );
  expect(transferEvent?.result?.partes).toHaveLength(3);
  expect(transferEvent?.result).toMatchObject({ attempt: 1, intento: 1 });
  expect(transferEvent?.result?.texto).toBe(
    "The track must have been scheduled.\nLeo might have edited the caption.\nMara can't have uploaded it."
  );
  expect(consoleErrors).toEqual([]);
});

test('keeps classifying authored branches when the classifier API is offline', async ({ page }) => {
  await mockTelemetry(page);
  await page.route('**/api/classify', async (route) => route.abort('failed'));
  await page.goto('/crear');

  await page.getByRole('button', { name: 'Entrar al reto', exact: true }).click();
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The cloud must have replaced the file.',
      possible: 'Diego might have moved it.',
      impossible: "Nerea can't have deleted it.",
    },
    'Enviar idea'
  );

  await expect(page.getByRole('heading', { name: 'What does the speaker actually know?' })).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(state.firstOutcomes.precheck.branch).toBe('correcto');
  expect(state.firstOutcomes.precheck.correct).toBe(true);
  expect(state.firstOutcomes.precheck.parts).toHaveLength(3);
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
        contentVersion: '2026-07-19',
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
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The label might have scheduled it.',
      possible: 'Leo must have edited it.',
      impossible: 'Mara might have uploaded it.',
    },
    'Guardar evidencia'
  );
  await expect(page.getByText('The clues do not earn equal confidence', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar intento', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'One attempt is a signal. Seven days tests what stayed.' })).toBeVisible();
  await expect(
    page.getByText('Tu intento quedó guardado. No afirmaremos dominio hasta verte resolver un caso nuevo sin repasar.', {
      exact: true,
    })
  ).toBeVisible();
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

  const canonicalTransfer = await request.post('/api/classify', {
    data: {
      tallerId: 'CREAR-ENGLISH-DEDUCTION-V1',
      pasoRefId: 'transfer',
      texto: "The track must have been scheduled. Leo might have edited the caption. Mara can't have uploaded it.",
    },
  });
  expect(canonicalTransfer.ok()).toBe(true);
  expect((await canonicalTransfer.json()).rama).toBe('correcto');

  const laxTransfer = await request.post('/api/classify', {
    data: {
      tallerId: 'CREAR-ENGLISH-DEDUCTION-V1',
      pasoRefId: 'transfer',
      texto: "The label must have scheduled it. Leo might have edited the caption. Mara can't have uploaded it.",
    },
  });
  expect(laxTransfer.ok()).toBe(true);
  expect((await laxTransfer.json()).rama).toBe('correcto');
});

test('desktop arrival keeps the cinematic CTA compact and visible', async ({ page }) => {
  await mockTelemetry(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', { name: 'El video desapareció justo antes del cierre.' })).toBeVisible();
  const cta = page.getByRole('button', { name: 'Entrar al reto', exact: true });
  const ctaBox = await cta.boundingBox();
  expect(ctaBox).not.toBeNull();
  expect(ctaBox?.height).toBeLessThanOrEqual(60);
  await expect(cta).toBeInViewport();
  const backgroundVideo = page.locator('video').filter({ has: page.locator('source[src="/video/bg_waves.mp4"]') });
  await expect(backgroundVideo).toHaveCount(1);
  const videoState = await backgroundVideo.evaluate((video) => {
    const element = video as HTMLVideoElement;
    return {
      autoplay: element.autoplay,
      loop: element.loop,
      muted: element.muted,
      playsInline: element.playsInline,
      filter: getComputedStyle(element).filter,
    };
  });
  expect(videoState).toMatchObject({ autoplay: true, loop: true, muted: true, playsInline: true });
  expect(videoState.filter).toContain('blur(');

  const videoLayer = backgroundVideo.locator('..');
  await backgroundVideo.evaluate((video) => {
    const element = video as HTMLVideoElement;
    element.pause();
    element.currentTime = Math.max(0, element.duration - 0.5);
  });
  await expect(videoLayer).toHaveAttribute('data-loop-phase', 'fade-out');
  await expect.poll(async () => Number(await videoLayer.evaluate((layer) => getComputedStyle(layer).opacity))).toBeLessThan(0.65);

  await backgroundVideo.evaluate((video) => {
    const element = video as HTMLVideoElement;
    element.currentTime = 0.05;
  });
  await expect(videoLayer).toHaveAttribute('data-loop-phase', 'fade-in');
  await expect.poll(async () => Number(await videoLayer.evaluate((layer) => getComputedStyle(layer).opacity))).toBeLessThan(0.15);

  await backgroundVideo.evaluate((video) => {
    (video as HTMLVideoElement).currentTime = 0.6;
  });
  await expect.poll(async () => Number(await videoLayer.evaluate((layer) => getComputedStyle(layer).opacity))).toBeGreaterThan(0.5);
  await capture(page, 'celestea-v2-desktop-hero.png');
});
