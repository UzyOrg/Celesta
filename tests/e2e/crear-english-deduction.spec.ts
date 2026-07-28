import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const LESSON_ID = 'CREAR-ENGLISH-DEDUCTION-V1';
const CONTENT_VERSION = '2026-07-27';
const ARTIFACT_DIR = path.join(process.cwd(), 'test-artifacts');

interface CapturedLearningEvent {
  paso_id: string;
  verbo: string;
  result?: {
    assisted?: boolean;
    attempt?: number;
    correcto?: boolean;
    fase?: string;
    intento?: number;
    mapping?: Record<string, string>;
    rama?: string;
    score?: number;
    targetCategory?: string;
    texto?: string;
  };
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, name),
    fullPage: false,
  });
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

async function seedStep(page: Page, stepIndex: number) {
  await page.addInitScript(({ lessonId, contentVersion, index }) => {
    const now = Date.now();
    localStorage.setItem(
      `celesta:crear:study:${lessonId}`,
      JSON.stringify({
        studyId: `study-step-${index}`,
        lessonId,
        contentVersion,
        startedAt: now,
        updatedAt: now,
        phase: 'initial',
        stepIndex: index,
        attempts: {},
        firstOutcomes: {},
        latestOutcomes: {},
        awaitingFeedback: {},
        assistance: {},
      })
    );
  }, { lessonId: LESSON_ID, contentVersion: CONTENT_VERSION, index: stepIndex });
}

async function reachGuidedMap(page: Page) {
  await page.goto('/crear');
  await page.getByRole('button', { name: 'Estoy listo', exact: true }).click();
  await page.getByRole('radio', {
    name: 'Expresa una conclusión basada en pistas.',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Completa cada deducción.',
    exact: true,
  })).toBeVisible();
}

async function assignCorrectMap(page: Page) {
  const terms = ['MUST HAVE', 'MIGHT HAVE', "CAN'T HAVE"] as const;
  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index];
    await page.getByRole('button', {
      name: `Elegir ${term} para completar la frase`,
      exact: true,
    }).click();
    if (index < terms.length - 1) {
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    }
  }
}

async function revealTransferEvidence(page: Page) {
  const explorer = page.getByRole('region', { name: 'Explorador de evidencias' });
  await expect(explorer.getByText('Pista 1 de 3', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Ver siguiente pista', exact: true }).click();
  await explorer.getByRole('button', { name: 'Ver siguiente pista', exact: true }).click();
  await explorer.getByRole('button', { name: 'Responder el caso', exact: true }).click();
}

test('Hallmark arrival reads as one quiet cinematic task at 375px', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 0);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', {
    name: '¿Qué fue lo que pasó?',
    exact: true,
  })).toBeVisible();
  await expect(page.locator('[aria-label="Caso uno"]')).toHaveCount(0);
  await expect(page.getByText('Escuchar introducción', { exact: true })).toBeVisible();

  const voiceSurface = page.getByLabel('Voz de Celestea');
  expect(await voiceSurface.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
    };
  })).toEqual({
    background: 'rgba(0, 0, 0, 0)',
    borderTopWidth: '0px',
  });

  const video = page.locator('video');
  await expect(video).toBeVisible();
  expect(await video.evaluate((element) => getComputedStyle(element).opacity)).toBe('0.88');

  await video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    if (Number.isFinite(media.duration) && media.duration > 1) {
      media.currentTime = media.duration - 0.2;
    }
  });
  await page.waitForTimeout(100);
  expect(await video.evaluate((element) =>
    Number(getComputedStyle(element.parentElement as HTMLElement).opacity)
  )).toBeLessThan(0.35);

  await video.evaluate((element) => {
    (element as HTMLVideoElement).currentTime = 0.2;
  });
  await page.waitForTimeout(100);
  expect(await video.evaluate((element) =>
    Number(getComputedStyle(element.parentElement as HTMLElement).opacity)
  )).toBeLessThan(0.35);

  const primaryAction = page.getByRole('button', {
    name: 'Estoy listo',
    exact: true,
  });
  const title = page.getByRole('heading', {
    name: '¿Qué fue lo que pasó?',
    exact: true,
  });
  const titleBox = await title.boundingBox();
  expect(titleBox?.height).toBeLessThanOrEqual(36);
  expect(await title.evaluate((element) => getComputedStyle(element).whiteSpace))
    .toBe('nowrap');

  const actionBox = await primaryAction.boundingBox();
  expect(actionBox?.height).toBeGreaterThanOrEqual(52);
  expect(actionBox?.y).toBeGreaterThan(650);

  expect(await primaryAction.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe('rgb(76, 199, 243)');

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    media.currentTime = media.duration / 2;
  });
  await page.waitForTimeout(150);
  await capture(page, 'celestea-hallmark-arrival-375.png');

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    const viewportOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(viewportOverflow).toBeLessThanOrEqual(1);
    expect(await primaryAction.evaluate((element) =>
      getComputedStyle(element).whiteSpace
    )).toBe('nowrap');
    expect((await title.boundingBox())?.height).toBeLessThanOrEqual(40);
  }

  const desktopActionBox = await primaryAction.boundingBox();
  expect((desktopActionBox?.y ?? 0) + (desktopActionBox?.height ?? 0))
    .toBeLessThanOrEqual(800);
});

test('completes a low-friction session and preserves transfer plus D7 evidence', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const consoleErrors: string[] = [];
  const missingResources: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() === 404) missingResources.push(response.url());
  });
  const telemetry = await mockTelemetry(page);

  await reachGuidedMap(page);
  await assignCorrectMap(page);
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Elegiste las tres expresiones',
    exact: true,
  })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', {
    name: 'Ahora resuelve un misterio musical.',
    exact: true,
  })).toBeVisible();
  await revealTransferEvidence(page);
  await assignCorrectMap(page);
  await page.getByRole('button', {
    name: 'Comprobar',
    exact: true,
  }).click();
  await page.getByRole('textbox', {
    name: 'Nora tenía acceso a la portada, pero no aparece quién la cambió. Escribe una posibilidad sobre Nora en inglés.',
    exact: true,
  }).fill('Nora might have changed the cover.');
  await page.getByRole('button', { name: 'Enviar mi frase', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Aplicaste la idea en una pista nueva',
    exact: true,
  })).toBeVisible();

  const transferState = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(transferState.firstOutcomes.transfer).toMatchObject({
    correct: true,
    assisted: false,
    targetCategory: 'posible',
    text: 'Nora might have changed the cover.',
    mapping: {
      scheduled: 'casi_seguro',
      caption: 'posible',
      upload: 'imposible',
    },
  });

  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Terminaste por hoy.',
    exact: true,
  })).toBeVisible();
  await page.getByRole('button', { name: 'Terminar por hoy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Una semana después.', exact: true })).toBeVisible();
  await page.getByRole('textbox', {
    name: 'La cuenta de Emi estaba desactivada desde el día anterior. Escribe en inglés qué no pudo haber hecho Emi.',
    exact: true,
  }).fill("Emi can't have uploaded the file.");
  await page.getByRole('button', { name: 'Enviar respuesta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La idea sigue contigo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Terminaste la revisión.', exact: true })).toBeVisible();
  await expect(page.getByText(
    'Pudiste escribir una deducción en un caso nuevo.',
    { exact: true }
  )).toBeVisible();
  await expect.poll(() => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta' && event.paso_id === 'transfer'
  )).toHaveLength(1);
  const transferEvent = telemetry.find(
    (event) => event.verbo === 'envio_respuesta' && event.paso_id === 'transfer'
  );
  expect(transferEvent?.result).toMatchObject({
    assisted: false,
    correcto: true,
    fase: 'transfer',
    targetCategory: 'posible',
    texto: 'Nora might have changed the cover.',
  });
  expect(consoleErrors, `Missing resources: ${missingResources.join(', ')}`).toEqual([]);
});

test('keeps the learning guide available and marks its use as assisted', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 3);
  await page.goto('/crear');

  await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Tres formas de decir qué tan seguro estás',
    exact: true,
  })).toBeVisible();
  await expect(page.getByText('MUST HAVE', { exact: true }).first()).toBeVisible();
  await capture(page, 'celestea-v14-guide-mobile.png');
  await page.getByRole('button', { name: 'Volver al caso', exact: true }).click();
  await assignCorrectMap(page);
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();

  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.assistance['guided-map']).toBe(true);
  expect(state.firstOutcomes['guided-map'].assisted).toBe(true);
  await expect.poll(() => telemetry.some(
    (event) => event.verbo === 'solicito_pista'
      && event.paso_id === 'guided-map'
      && event.result?.rama === 'guide_opened'
  )).toBe(true);
});

test('turns a corrected map into assisted evidence instead of a false independent success', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 3);
  await page.goto('/crear');

  await page.getByRole('button', {
    name: 'Elegir MIGHT HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', {
    name: 'Elegir MUST HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', {
    name: "Elegir CAN'T HAVE para completar la frase",
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByText(
    'Esa expresión dice algo distinto. Revisa cuánto puedes asegurar y prueba otra.',
    { exact: true }
  )).toBeVisible();
  await page.getByRole('button', {
    name: 'Elegir MUST HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Revisar siguiente', exact: true }).click();
  await page.getByRole('button', {
    name: 'Elegir MIGHT HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();

  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.firstOutcomes['guided-map']).toMatchObject({
    branch: 'mapa_asistido',
    correct: true,
    assisted: true,
  });
});

test('does not convert a miscalibrated transfer sentence into success', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 4);
  await page.goto('/crear');
  await revealTransferEvidence(page);
  await assignCorrectMap(page);
  await page.getByRole('button', {
    name: 'Comprobar',
    exact: true,
  }).click();
  await page.getByRole('textbox').fill('Nora must have changed the cover.');
  await page.getByRole('button', { name: 'Enviar mi frase', exact: true }).click();

  await expect(page.getByRole('heading', {
    name: 'La pista deja una posibilidad abierta',
    exact: true,
  })).toBeVisible();
  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.firstOutcomes.transfer.correct).toBe(false);
  expect(state.firstOutcomes.transfer.branch).toBe('misconcepcion_certeza');
});

test('local classifier distinguishes the authored transfer and D7 targets', async ({ request }) => {
  const transfer = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer',
      texto: 'Nora might have changed the cover.',
    },
  });
  expect(transfer.ok()).toBe(true);
  expect(await transfer.json()).toMatchObject({ rama: 'correcto' });

  const wrongStrength = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer',
      texto: 'Nora must have changed the cover.',
    },
  });
  expect(wrongStrength.ok()).toBe(true);
  expect(await wrongStrength.json()).toMatchObject({ rama: 'misconcepcion_certeza' });

  const retest = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'retest',
      texto: "Emi can't have uploaded the file.",
    },
  });
  expect(retest.ok()).toBe(true);
  expect(await retest.json()).toMatchObject({ rama: 'correcto' });
});

test('lesson 1.4 removes answer leakage and keeps the honest evidence line', async () => {
  const lessonPath = path.join(process.cwd(), 'public/workshops', `${LESSON_ID}.json`);
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8')) as {
    version: string;
    content_version: string;
    metadata: { duracion_estimada_min: number };
    pasos: Array<{
      ref_id: string;
      crear?: {
        audio?: { text: string };
        certaintyMap?: {
          production?: { category: string };
          statements: unknown[];
        };
        guideAvailable?: boolean;
        input?: string;
        responseParts?: unknown[];
      };
    }>;
  };

  expect(lesson.version).toBe('1.4.0');
  expect(lesson.content_version).toBe(CONTENT_VERSION);
  expect(lesson.metadata.duracion_estimada_min).toBe(5);
  expect(lesson.pasos.map((step) => step.ref_id)).toEqual([
    'arrival',
    'contrast',
    'prism',
    'guided-map',
    'transfer',
    'close',
    'retest',
  ]);
  expect(lesson.pasos.some((step) => step.crear?.responseParts?.length)).toBe(false);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.certaintyMap)
    .toMatchObject({
      production: { category: 'posible' },
      statements: [
        { sentenceStart: 'The track', sentenceEnd: 'been scheduled.' },
        { sentenceStart: 'Leo', sentenceEnd: 'edited the caption.' },
        { sentenceStart: 'Mara', sentenceEnd: 'uploaded the track.' },
      ],
    });
  expect(lesson.pasos.find((step) => step.ref_id === 'guided-map')?.crear?.guideAvailable)
    .toBe(true);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.guideAvailable)
    .toBe(true);
  expect(lesson.pasos.find((step) => step.ref_id === 'retest')?.crear?.guideAvailable)
    .not.toBe(true);
});

test('mobile map stays readable, tappable and motion-safe at 375px', async ({ page }) => {
  await mockTelemetry(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedStep(page, 3);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  const heading = page.getByRole('heading', {
    name: 'Completa cada deducción.',
    exact: true,
  });
  await expect(heading).toBeVisible();
  expect(await heading.evaluate((element) => getComputedStyle(element).fontSize)).toBe('28px');
  const subtitle = page.getByText(
    'Lee una señal y elige la expresión que completa la frase.',
    { exact: true }
  );
  expect(await subtitle.evaluate((element) => getComputedStyle(element).fontSize)).toBe('15px');

  const target = page.getByRole('button', {
    name: 'Elegir MUST HAVE para completar la frase',
    exact: true,
  });
  const targetBox = await target.boundingBox();
  expect(targetBox?.height).toBeGreaterThanOrEqual(44);
  const sentence = page.getByTestId('certainty-map-sentence');
  expect(await sentence.evaluate((element) => getComputedStyle(element).whiteSpace))
    .toBe('nowrap');
  const blank = page.getByTestId('certainty-map-drop-target');
  expect(await blank.textContent()).toBe('');
  const sentenceBox = await sentence.boundingBox();
  expect(sentenceBox?.width).toBeLessThanOrEqual(347);
  const controls = page.getByTestId('certainty-map-controls');
  const controlsBox = await controls.boundingBox();
  expect(controlsBox?.y).toBeGreaterThan(500);
  expect((controlsBox?.y ?? 0) + (controlsBox?.height ?? 0)).toBeLessThanOrEqual(812);
  expect(await page.getByRole('button', {
    name: 'Siguiente',
    exact: true,
  }).evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('nowrap');

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(await sentence.evaluate((element) => getComputedStyle(element).whiteSpace))
      .toBe('nowrap');
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'celestea-v15-guided-map-mobile.png');
});

test('mobile map accepts a real pointer drag without making drag mandatory', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 3);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  const token = page.getByRole('button', {
    name: 'Elegir MUST HAVE para completar la frase',
    exact: true,
  });
  const dropTarget = page.getByLabel('Espacio para la expresión', { exact: true });
  const tokenBox = await token.boundingBox();
  const targetBox = await dropTarget.boundingBox();
  expect(tokenBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(
    tokenBox!.x + tokenBox!.width / 2,
    tokenBox!.y + tokenBox!.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height / 2,
    { steps: 8 }
  );
  await page.mouse.up();

  await expect(page.getByLabel(
    'Espacio completado con MUST HAVE',
    { exact: true }
  )).toBeVisible();
  await expect(page.getByRole('button', {
    name: 'Siguiente',
    exact: true,
  })).toBeEnabled();
});
