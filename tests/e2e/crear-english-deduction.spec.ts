import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const LESSON_ID = 'CREAR-ENGLISH-DEDUCTION-V1';
const CONTENT_VERSION = '2026-07-30';
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
    statementId?: string;
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
    name: 'Completa la frase.',
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
    name: 'La misma idea, en otro caso.',
    exact: true,
  })).toBeVisible();
  await expect(page.getByLabel('Voz de Celestea').getByRole('button')).toBeVisible();
  await expect.poll(() => page.locator('audio').evaluate((element) =>
    (element as HTMLAudioElement).duration
  )).toBeGreaterThan(10);
  await expect(page.getByRole('button', {
    name: 'Empezar el caso',
    exact: true,
  })).toBeEnabled();
  await capture(page, 'celestea-v16-transfer-bridge-mobile.png');
  await page.getByRole('button', { name: 'Empezar el caso', exact: true }).click();

  await expect(page.getByRole('heading', {
    name: 'La maqueta de la feria.',
    exact: true,
  })).toBeVisible();
  await assignCorrectMap(page);
  await page.getByRole('button', {
    name: 'Comprobar',
    exact: true,
  }).click();
  await expect(page.getByRole('heading', {
    name: 'Escribe tu propia deducción.',
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole('heading', {
    name: 'La maqueta de la feria.',
    exact: true,
  })).toHaveCount(0);
  await expect(page.getByText('Ahora cambia de situación.', { exact: true })).toHaveCount(0);
  const productionAction = page.getByRole('button', {
    name: 'Enviar mi frase',
    exact: true,
  });
  const productionActionBox = await productionAction.boundingBox();
  expect(productionActionBox?.y).toBeGreaterThan(680);
  await capture(page, 'celestea-v16-production-mobile.png');
  await page.getByRole('textbox', {
    name: 'Nora estuvo en el salón durante el recreo. Nadie vio en qué trabajó. Escribe una posibilidad en inglés.',
    exact: true,
  }).fill('Nora might have worked on the model.');
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
    text: 'Nora might have worked on the model.',
    mapping: {
      elena: 'casi_seguro',
      leo: 'posible',
      mara: 'imposible',
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
    name: 'Emi estaba en una excursión cuando alguien movió el cartel del salón. Escribe en inglés qué no pudo haber hecho Emi.',
    exact: true,
  }).fill("Emi can't have moved the poster.");
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
  )).toHaveLength(4);
  const transferEvent = telemetry.find(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'transfer'
      && event.result?.rama === 'correcto'
  );
  expect(transferEvent?.result).toMatchObject({
    assisted: false,
    correcto: true,
    fase: 'transfer',
    targetCategory: 'posible',
    texto: 'Nora might have worked on the model.',
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

test('swaps one clue into Spanish without a side stripe or layout jump', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 3);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  const englishClue = page.getByText(
    'Valeria had fresh blue paint on her hands. The poster had the same paint.',
    { exact: true }
  );
  await expect(englishClue).toBeVisible();
  const clueViewport = page.getByTestId('certainty-map-clue');
  const beforeBox = await clueViewport.boundingBox();
  const translationAction = page.getByRole('button', {
    name: 'Mostrar pista en español',
    exact: true,
  });
  const translationActionBox = await translationAction.boundingBox();
  expect(translationActionBox?.height).toBeGreaterThanOrEqual(44);
  await translationAction.click();
  await expect(page.getByText(
    'Valeria tenía pintura azul fresca en las manos. El cartel tenía la misma pintura.',
    { exact: true }
  )).toBeVisible();
  await expect(englishClue).toHaveCount(0);
  await expect(page.getByRole('button', {
    name: 'Mostrar pista en inglés',
    exact: true,
  })).toBeVisible();
  const afterBox = await clueViewport.boundingBox();
  expect(Math.abs((afterBox?.height ?? 0) - (beforeBox?.height ?? 0))).toBeLessThanOrEqual(2);
  expect(await clueViewport.evaluate((element) =>
    getComputedStyle(element).borderInlineStartWidth
  )).toBe('0px');
  await capture(page, 'celestea-v16-translation-mobile.png');
  const verticalOverflow = await page.evaluate(() =>
    document.documentElement.scrollHeight - window.innerHeight
  );
  expect(verticalOverflow).toBeLessThanOrEqual(1);

  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.assistance['guided-map']).toBe(true);
  await expect.poll(() => telemetry.some(
    (event) => event.verbo === 'solicito_pista'
      && event.paso_id === 'guided-map'
      && event.result?.rama === 'translation_opened'
  )).toBe(true);
});

test('turns a corrected map into assisted evidence instead of a false independent success', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 3);
  await page.goto('/crear');

  await page.getByRole('button', {
    name: 'Elegir MIGHT HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByText(
    'La pintura conecta directamente a Valeria con el cartel: la evidencia es fuerte.',
    { exact: true }
  )).toBeVisible();
  await page.getByRole('button', {
    name: 'Elegir MUST HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', {
    name: 'Elegir MIGHT HAVE para completar la frase',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', {
    name: "Elegir CAN'T HAVE para completar la frase",
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
  await expect.poll(() => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'guided-map'
      && event.result?.statementId === 'valeria'
  )).toHaveLength(2);
  const valeriaAttempts = telemetry.filter(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'guided-map'
      && event.result?.statementId === 'valeria'
  );
  expect(valeriaAttempts[0]?.result).toMatchObject({
    assisted: false,
    correcto: false,
    rama: 'map_item_incorrecto',
  });
  expect(valeriaAttempts[1]?.result).toMatchObject({
    assisted: true,
    correcto: true,
    rama: 'map_item_correcto',
  });
});

test('does not convert a miscalibrated transfer sentence into success', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 5);
  await page.goto('/crear');
  await assignCorrectMap(page);
  await page.getByRole('button', {
    name: 'Comprobar',
    exact: true,
  }).click();
  await page.getByRole('textbox').fill('Nora must have worked on the model.');
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
      texto: 'Nora might have worked on the model.',
    },
  });
  expect(transfer.ok()).toBe(true);
  expect(await transfer.json()).toMatchObject({ rama: 'correcto' });

  const wrongStrength = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer',
      texto: 'Nora must have worked on the model.',
    },
  });
  expect(wrongStrength.ok()).toBe(true);
  expect(await wrongStrength.json()).toMatchObject({ rama: 'misconcepcion_certeza' });

  const retest = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'retest',
      texto: "Emi can't have moved the poster.",
    },
  });
  expect(retest.ok()).toBe(true);
  expect(await retest.json()).toMatchObject({ rama: 'correcto' });
});

test('lesson 1.6 integrates the voiced transfer bridge and familiar contexts', async () => {
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
        evidencePresentation?: unknown;
        guideAvailable?: boolean;
        input?: string;
        responseParts?: unknown[];
      };
    }>;
  };

  expect(lesson.version).toBe('1.6.1');
  expect(lesson.content_version).toBe(CONTENT_VERSION);
  expect(lesson.metadata.duracion_estimada_min).toBe(5);
  expect(lesson.pasos.map((step) => step.ref_id)).toEqual([
    'arrival',
    'contrast',
    'prism',
    'guided-map',
    'transfer-bridge',
    'transfer',
    'close',
    'retest',
  ]);
  expect(lesson.pasos.some((step) => step.crear?.responseParts?.length)).toBe(false);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.certaintyMap)
    .toMatchObject({
      production: { category: 'posible' },
      statements: [
        {
          sentenceStart: 'Elena',
          sentenceEnd: 'worked on the model.',
          translationEs: expect.any(String),
          feedbackIncorrecto: expect.any(String),
        },
        {
          sentenceStart: 'Leo',
          sentenceEnd: 'worked on the model.',
          translationEs: expect.any(String),
          feedbackIncorrecto: expect.any(String),
        },
        {
          sentenceStart: 'Mara',
          sentenceEnd: 'worked on the model.',
          translationEs: expect.any(String),
          feedbackIncorrecto: expect.any(String),
        },
      ],
    });
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.evidencePresentation)
    .toBeUndefined();
  expect(lesson.pasos.find((step) => step.ref_id === 'guided-map')?.crear?.guideAvailable)
    .toBe(true);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer-bridge')?.crear?.audio?.text)
    .toContain('Ahora cambia el caso, no la idea');
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
    name: 'Completa la frase.',
    exact: true,
  });
  await expect(heading).toBeVisible();
  const headingSize = await heading.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(headingSize).toBeGreaterThanOrEqual(22);
  expect(headingSize).toBeLessThanOrEqual(26);
  await expect(page.getByText(
    'Lee una señal y elige la expresión que completa la frase.',
    { exact: true }
  )).toHaveCount(0);
  expect(await page.getByText(
    'Valeria had fresh blue paint on her hands. The poster had the same paint.',
    { exact: true }
  ).evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px');

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

  await target.click();
  await expect(target).toHaveCount(0);
  await expect(page.getByRole('group', {
    name: 'Expresiones para completar la frase',
    exact: true,
  }).getByRole('button')).toHaveCount(2);
  await expect(page.getByTestId('certainty-term-slot-casi_seguro'))
    .toHaveAttribute('data-vacant', 'true');
  await expect(page.getByLabel(
    'Espacio completado con MUST HAVE. Toca para cambiarlo',
    { exact: true }
  )).toBeVisible();
  await blank.click();
  await expect(target).toBeVisible();
  await expect(page.getByRole('group', {
    name: 'Expresiones para completar la frase',
    exact: true,
  }).getByRole('button')).toHaveCount(3);

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
    if (viewport.height >= 800 && viewport.width <= 414) {
      const verticalOverflow = await page.evaluate(() =>
        document.documentElement.scrollHeight - window.innerHeight
      );
      expect(verticalOverflow).toBeLessThanOrEqual(1);
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'celestea-v16-guided-map-mobile.png');
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
    'Espacio completado con MUST HAVE. Toca para cambiarlo',
    { exact: true }
  )).toBeVisible();
  await expect(page.getByRole('button', {
    name: 'Siguiente',
    exact: true,
  })).toBeEnabled();
});

test('keeps fixed slots and animates all initial selections plus directed swaps', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 3);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  const categories = [
    { id: 'casi_seguro', term: 'MUST HAVE' },
    { id: 'posible', term: 'MIGHT HAVE' },
    { id: 'imposible', term: "CAN'T HAVE" },
  ] as const;
  const slots = categories.map((category) =>
    page.getByTestId(`certainty-term-slot-${category.id}`)
  );
  await page.waitForTimeout(600);
  const initialSlotBoxes = await Promise.all(slots.map((slot) => slot.boundingBox()));
  const sentence = page.getByTestId('certainty-map-sentence');
  const initialSentenceBox = await sentence.boundingBox();

  async function startMotionRecorder() {
    await page.evaluate(() => {
      const samples: Array<{
        category: string;
        direction: string;
        x: number;
        y: number;
      }> = [];
      const startedAt = performance.now();
      const record = () => {
        document.querySelectorAll<HTMLElement>('[data-term-traveler="true"]')
          .forEach((element) => {
          const rect = element.getBoundingClientRect();
          samples.push({
            category: element.dataset.category ?? '',
            direction: element.dataset.direction ?? '',
            x: rect.x,
            y: rect.y,
          });
        });
        if (performance.now() - startedAt < 450) {
          const runtimeWindow = window as typeof window & {
            __celesteaTermMotionFrame?: number;
          };
          runtimeWindow.__celesteaTermMotionFrame = requestAnimationFrame(record);
        }
      };
      Object.assign(window, {
        __celesteaTermMotionSamples: samples,
      });
      record();
    });
  }

  async function stopMotionRecorder() {
    return page.evaluate(() => {
      const runtimeWindow = window as typeof window & {
        __celesteaTermMotionFrame?: number;
        __celesteaTermMotionSamples?: Array<{
          category: string;
          direction: string;
          x: number;
          y: number;
        }>;
      };
      if (runtimeWindow.__celesteaTermMotionFrame !== undefined) {
        cancelAnimationFrame(runtimeWindow.__celesteaTermMotionFrame);
      }
      return runtimeWindow.__celesteaTermMotionSamples ?? [];
    });
  }

  async function expectStableSlots() {
    const currentBoxes = await Promise.all(slots.map((slot) => slot.boundingBox()));
    currentBoxes.forEach((box, index) => {
      const initial = initialSlotBoxes[index];
      expect(box).not.toBeNull();
      expect(initial).not.toBeNull();
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs((box?.[key] ?? 0) - (initial?.[key] ?? 0)))
          .toBeLessThanOrEqual(1);
      }
    });
  }

  async function expectStableSentence() {
    const current = await sentence.boundingBox();
    expect(current).not.toBeNull();
    expect(initialSentenceBox).not.toBeNull();
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs((current?.[key] ?? 0) - (initialSentenceBox?.[key] ?? 0)))
        .toBeLessThanOrEqual(1);
    }
  }

  async function expectTermNearRule() {
    const term = page.getByTestId('selected-certainty-term');
    const rule = page.getByTestId('certainty-map-drop-target');
    const termBox = await term.boundingBox();
    const ruleBox = await rule.boundingBox();
    expect(termBox).not.toBeNull();
    expect(ruleBox).not.toBeNull();
    const ruleBottom = (ruleBox?.y ?? 0) + (ruleBox?.height ?? 0);
    const termBottom = (termBox?.y ?? 0) + (termBox?.height ?? 0);
    expect(ruleBottom - termBottom).toBeLessThanOrEqual(10);
  }

  function expectSpatialPath(
    samples: Array<{
      category: string;
      direction: string;
      x: number;
      y: number;
    }>,
    category: string,
    direction: 'incoming' | 'outgoing'
  ) {
    const path = samples.filter((sample) =>
      sample.category === category && sample.direction === direction
    );
    expect(path.length).toBeGreaterThanOrEqual(3);
    const xs = path.map((sample) => sample.x);
    const ys = path.map((sample) => sample.y);
    const distance = Math.hypot(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys)
    );
    expect(distance).toBeGreaterThan(40);
  }

  async function expectTermTypography(category: typeof categories[number]) {
    const traveler = page.getByTestId(
      `certainty-term-traveler-incoming-${category.id}`
    );
    await expect(traveler).toBeVisible();
    const styles = await page.evaluate((categoryId) => {
      const selectors = [
        `[data-testid="certainty-source-term-${categoryId}"]`,
        '[data-testid="selected-certainty-term"]',
        `[data-testid="certainty-term-traveler-incoming-${categoryId}"]`,
      ];
      const properties = [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'textTransform',
      ] as const;
      return selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const computed = getComputedStyle(element);
        return properties.map((property) => computed[property]);
      });
    }, category.id);
    expect(styles[0]).toEqual(styles[1]);
    expect(styles[0]).toEqual(styles[2]);
  }

  async function expectRestingSelection(category: typeof categories[number]) {
    await expect(page.getByTestId('selected-certainty-term')).toBeVisible();
    await expect(page.getByTestId('selected-certainty-term')).toHaveText(category.term);
    await expect(page.getByTestId(`certainty-source-term-${category.id}`)).toBeHidden();
    await expect(page.locator('[data-term-traveler="true"]')).toHaveCount(0);
    for (const candidate of categories) {
      if (candidate.id === category.id) continue;
      await expect(page.getByTestId(`certainty-source-term-${candidate.id}`)).toBeVisible();
    }
  }

  for (const category of categories) {
    await startMotionRecorder();
    await page.getByRole('button', {
      name: `Elegir ${category.term} para completar la frase`,
      exact: true,
    }).click();
    await expectTermTypography(category);
    await expectStableSentence();
    await page.waitForTimeout(340);
    const initialSamples = await stopMotionRecorder();
    expectSpatialPath(initialSamples, category.id, 'incoming');
    await expectRestingSelection(category);
    await expectStableSentence();
    await expectTermNearRule();
    await expectStableSlots();
    await expect(page.getByTestId(`certainty-term-slot-${category.id}`))
      .toHaveAttribute('data-vacant', 'true');
    await page.getByTestId('certainty-map-drop-target').click();
    await page.waitForTimeout(340);
    await expect(page.getByTestId(`certainty-source-term-${category.id}`)).toBeVisible();
    await expect(page.locator('[data-term-traveler="true"]')).toHaveCount(0);
    await expectStableSentence();
    await expectStableSlots();
  }

  for (const from of categories) {
    for (const to of categories) {
      if (from.id === to.id) continue;
      await page.getByRole('button', {
        name: `Elegir ${from.term} para completar la frase`,
        exact: true,
      }).click();
      await page.waitForTimeout(340);
      await startMotionRecorder();
      await page.getByRole('button', {
        name: `Elegir ${to.term} para completar la frase`,
        exact: true,
      }).click();
      await page.waitForTimeout(340);
      const swapSamples = await stopMotionRecorder();
      expectSpatialPath(swapSamples, from.id, 'outgoing');
      expectSpatialPath(swapSamples, to.id, 'incoming');
      await expectRestingSelection(to);
      await expectStableSentence();
      await expectTermNearRule();
      await expectStableSlots();
      await expect(page.getByTestId(`certainty-term-slot-${from.id}`))
        .toHaveAttribute('data-vacant', 'false');
      await expect(page.getByTestId(`certainty-term-slot-${to.id}`))
        .toHaveAttribute('data-vacant', 'true');
      await page.getByTestId('certainty-map-drop-target').click();
      await page.waitForTimeout(340);
    }
  }

  await page.getByRole('button', {
    name: 'Elegir MIGHT HAVE para completar la frase',
    exact: true,
  }).click();
  await page.waitForTimeout(340);
  await capture(page, 'celestea-v161-fixed-term-slots-mobile.png');
});
