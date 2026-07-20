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
    correcto?: boolean;
    fase?: string;
    intento?: number;
    partes?: Array<{ categoria: string; texto: string }>;
    rama?: string;
    score?: number;
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
  await expect(page.getByRole('heading', { name: 'Bien hecho', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

interface StructuredAnswers {
  almostCertain: string;
  possible: string;
  impossible: string;
}

async function submitStructuredAnswer(
  page: Page,
  answers: StructuredAnswers
) {
  await page
    .getByRole('textbox', { name: 'Según las pistas, ¿qué ocurrió casi con seguridad?', exact: true })
    .fill(answers.almostCertain);
  await page.getByRole('button', { name: 'Siguiente conclusión', exact: true }).click();
  await page
    .getByRole('textbox', {
      name: '¿Qué pudo haber ocurrido, aunque no puedes asegurarlo?',
      exact: true,
    })
    .fill(answers.possible);
  await page.getByRole('button', { name: 'Siguiente conclusión', exact: true }).click();
  await page
    .getByRole('textbox', { name: '¿Qué no pudo haber ocurrido?', exact: true })
    .fill(answers.impossible);
  await page.getByRole('button', { name: 'Enviar mis respuestas', exact: true }).click();
}

async function revealThreeCluesAndAnswer(page: Page) {
  const explorer = page.getByRole('region', { name: 'Explorador de evidencias' });
  const answer = page.locator('textarea');

  await expect(explorer).toBeVisible();
  await expect(explorer.getByText('Pista 1 de 3', { exact: true })).toBeVisible();
  await expect(answer).toBeHidden();

  await explorer.getByRole('button', { name: 'Ver siguiente pista', exact: true }).click();
  await expect(explorer.getByText('Pista 2 de 3', { exact: true })).toBeVisible();
  await expect(answer).toBeHidden();

  await explorer.getByRole('button', { name: 'Ver siguiente pista', exact: true }).click();
  await expect(explorer.getByText('Pista 3 de 3', { exact: true })).toBeVisible();
  await expect(answer).toBeHidden();

  await explorer.getByRole('button', { name: 'Responder el caso', exact: true }).click();
  await expect(answer).toBeVisible();
}

test('cinematic English probe records transfer and D7 without false mastery', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const telemetryEvents = await mockTelemetry(page);
  const response = await page.goto('/crear');
  expect(response?.status()).toBe(200);

  const arrivalHeading = page.getByRole('heading', { name: '¿Qué fue lo que pasó?' });
  await expect(arrivalHeading).toBeVisible();
  await expect(page.getByText('Módulo de inglés', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nivel de inglés B1+ / B2', { exact: true })).toBeVisible();
  await expect(page.getByText(
    'Aprenderás a explicar en inglés qué pudo haber ocurrido usando pistas.',
    { exact: true }
  )).toBeVisible();
  await expect(page.getByText('CASO 01', { exact: true })).toBeVisible();
  expect(await arrivalHeading.evaluate((element) => getComputedStyle(element).fontSize)).toBe('28px');
  const arrivalSubtitle = page.locator('p[class*="sceneBody"]').first();
  expect(await arrivalSubtitle.evaluate((element) => getComputedStyle(element).fontSize)).toBe('12px');
  expect(await arrivalSubtitle.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('pre-line');
  await expect(page.getByRole('navigation', { name: 'Fases de la experiencia' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Explorador de evidencias' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Estoy listo', exact: true })).toBeInViewport();
  await capture(page, 'celestea-v2-mobile-hero.png');
  await page.getByRole('button', { name: 'Estoy listo', exact: true }).click();

  const precheckHeading = page.getByRole('heading', { name: '¿Qué crees que pasó?' });
  await expect(precheckHeading).toBeVisible();
  expect(await precheckHeading.evaluate((element) => getComputedStyle(element).fontSize)).toBe('28px');
  const precheckSubtitle = page.locator('p[class*="sceneBody"]').first();
  expect(await precheckSubtitle.evaluate((element) => getComputedStyle(element).fontSize)).toBe('12px');
  await revealThreeCluesAndAnswer(page);
  const reviewClues = page.getByRole('button', { name: 'Revisar pistas', exact: true });
  await expect(reviewClues.locator('svg.lucide-arrow-left')).toBeVisible();
  const firstConclusion = page.getByRole('textbox', {
    name: 'Según las pistas, ¿qué ocurrió casi con seguridad?',
    exact: true,
  });
  await firstConclusion.fill('The cloud must have replaced the file.');
  await page.getByRole('button', { name: 'Revisar pistas', exact: true }).click();
  await expect(firstConclusion).toBeHidden();
  await page.getByRole('button', { name: 'Responder el caso', exact: true }).click();
  await expect(firstConclusion).toHaveValue('The cloud must have replaced the file.');
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The cloud must have replaced the file.',
      possible: 'Diego might have moved it.',
      impossible: "Nerea can't have deleted it.",
    }
  );

  await expect(page.getByRole('heading', { name: 'Las dos frases hablan del mismo cambio, pero no dicen lo mismo.' })).toBeVisible();
  const factRadio = page.getByRole('radio', { name: 'Cuenta algo que alguien vio.', exact: true });
  const inferenceRadio = page.getByRole('radio', { name: 'Expresa una conclusión basada en pistas.', exact: true });
  await factRadio.check();
  await factRadio.press('ArrowRight');
  await expect(inferenceRadio).toBeChecked();
  await page.getByRole('radio', { name: 'Da una orden al sistema.', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByText('PROBEMOS DE NUEVO', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Probar otra vez', exact: true }).click();
  await page.getByRole('radio', { name: 'Expresa una conclusión basada en pistas.', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByText('BIEN HECHO', { exact: true })).toHaveCount(0);
  const correctFeedbackHeading = page.getByRole('heading', { name: 'Bien hecho', exact: true });
  await expect(correctFeedbackHeading).toBeVisible();
  expect(await correctFeedbackHeading.evaluate((element) => getComputedStyle(element).color))
    .toBe('rgb(141, 232, 206)');
  await expect(page.getByText(
    'La frase A cuenta lo que pasó y la frase B usa las pistas para explicar qué debió ocurrir.',
    { exact: true }
  )).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tus palabras muestran qué tan seguro estás.' })).toBeVisible();
  const prism = page.locator('[aria-label="Elige un nivel de certeza"]');
  const almostCertain = prism.getByRole('button', { name: 'Casi seguro MUST HAVE', exact: true });
  await expect(almostCertain).toHaveAttribute('aria-pressed', 'true');
  const possible = prism.getByRole('button', { name: 'Es posible MIGHT HAVE', exact: true });
  await possible.click();
  await expect(possible).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('La pista lo permite, pero no lo demuestra.', { exact: true })).toBeVisible();
  const prismExample = page.locator('div[class*="prismExample"]');
  expect(await prismExample.evaluate((element) => getComputedStyle(element).borderLeftWidth)).toBe('0px');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  const sentencePrompt = page.locator('p[class*="responsePrompt"]').filter({
    hasText: 'Completa la frase: Camila',
  });
  await expect(sentencePrompt).toBeVisible();
  expect(await sentencePrompt.textContent()).not.toContain('___');
  const sentenceBlank = sentencePrompt.getByRole('img', { name: 'espacio en blanco' });
  await expect(sentenceBlank).toBeVisible();
  expect(await sentenceBlank.evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe('2px');
  await chooseAndContinue(page, 'must have');
  await chooseAndContinue(page, 'might have');
  await chooseAndContinue(page, "can't have");

  await expect(page.getByRole('heading', { name: 'Ahora escribe una conclusión cuidadosa.' })).toBeVisible();
  await page.getByRole('textbox').fill('Diego might have renamed the file.');
  await page.getByRole('button', { name: 'Enviar respuesta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cuidadosa y clara' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Un archivo cambió de nombre. ¿Qué ocurrió?' })).toBeVisible();
  await revealThreeCluesAndAnswer(page);
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The system must have renamed it.',
      possible: 'Camila might have edited it.',
      impossible: "Omar can't have changed it.",
    }
  );
  await expect(page.getByRole('heading', { name: 'Ahora resuelve un misterio musical.' })).toBeVisible();
  await revealThreeCluesAndAnswer(page);
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The track must have been scheduled.',
      possible: 'Leo might have edited the caption.',
      impossible: "Mara can't have uploaded it.",
    }
  );
  await expect(page.getByRole('heading', { name: 'Aplicaste la idea en una situación nueva' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Aplicaste la idea en una situación nueva' })).toBeVisible();
  const reloadedTransferState = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(reloadedTransferState.attempts.transfer).toBe(1);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Terminaste por hoy.' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminar por hoy', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'El código cambió durante la noche.' })).toBeVisible();
  await revealThreeCluesAndAnswer(page);
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The platform must have applied the update.',
      possible: 'Ren might have edited the code.',
      impossible: "Emi can't have pushed it.",
    }
  );
  await expect(page.getByRole('heading', { name: 'Pudiste usar las tres formas una semana después' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Terminaste la revisión.' })).toBeVisible();
  await expect(page.getByText('Pudiste usar las tres formas en un caso nuevo.', { exact: true })).toBeVisible();
  const completedState = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1') ?? '{}'
    )
  );
  expect(completedState.attempts.retest).toBe(1);
  expect(completedState.firstOutcomes.retest.correct).toBe(true);
  const expectedMeasurementPhases: Record<string, string> = {
    precheck: 'pre_check',
    postcheck: 'post',
    transfer: 'transfer',
    retest: 'post',
  };
  for (const [stepId, phase] of Object.entries(expectedMeasurementPhases)) {
    await expect
      .poll(
        () => telemetryEvents.filter(
          (event) => event.verbo === 'envio_respuesta' && event.paso_id === stepId
        ),
        { timeout: 5_000 }
      )
      .toHaveLength(1);
    const measurementEvent = telemetryEvents.find(
      (event) => event.verbo === 'envio_respuesta' && event.paso_id === stepId
    );
    expect(measurementEvent?.result).toMatchObject({
      attempt: 1,
      correcto: true,
      fase: phase,
      intento: 1,
    });
    expect(measurementEvent?.result?.partes).toHaveLength(3);
  }
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

  await page.getByRole('button', { name: 'Estoy listo', exact: true }).click();
  await revealThreeCluesAndAnswer(page);
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The cloud must have replaced the file.',
      possible: 'Diego might have moved it.',
      impossible: "Nerea can't have deleted it.",
    }
  );

  await expect(page.getByRole('heading', { name: 'Las dos frases hablan del mismo cambio, pero no dicen lo mismo.' })).toBeVisible();
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
        contentVersion: '2026-07-20',
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

  await expect(page.getByRole('heading', { name: 'Ahora resuelve un misterio musical.' })).toBeVisible();
  await revealThreeCluesAndAnswer(page);
  await submitStructuredAnswer(
    page,
    {
      almostCertain: 'The label might have scheduled it.',
      possible: 'Leo must have edited it.',
      impossible: 'Mara might have uploaded it.',
    }
  );
  await expect(page.getByRole('heading', { name: 'Las pistas no permiten la misma seguridad' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Terminaste por hoy.' })).toBeVisible();
  await expect(
    page.getByText('Guardamos tus respuestas. En siete días te mostraremos un caso nuevo para ver qué recuerdas sin repasar.', {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByText('Aplicaste la idea en una situación nueva', { exact: false })).toHaveCount(0);
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

  const swappedCategories = await request.post('/api/classify', {
    data: {
      tallerId: 'CREAR-ENGLISH-DEDUCTION-V1',
      pasoRefId: 'transfer',
      texto: "Leo might have edited the caption. Mara can't have uploaded it. The track must have been scheduled.",
      partes: [
        { categoria: 'casi_seguro', texto: 'Leo might have edited the caption.' },
        { categoria: 'posible', texto: "Mara can't have uploaded it." },
        { categoria: 'imposible', texto: 'The track must have been scheduled.' },
      ],
    },
  });
  expect(swappedCategories.ok()).toBe(true);
  expect((await swappedCategories.json()).rama).toBe('misconcepcion_certeza');
});

test('desktop arrival keeps the cinematic CTA compact and visible', async ({ page }) => {
  await mockTelemetry(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', { name: '¿Qué fue lo que pasó?' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Fases de la experiencia' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Explorador de evidencias' })).toHaveCount(0);
  const cta = page.getByRole('button', { name: 'Estoy listo', exact: true });
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

test('lesson 1.2.0 keeps arrival and PRE free of answer leaks', async () => {
  const lessonPath = path.join(process.cwd(), 'public/workshops/CREAR-ENGLISH-DEDUCTION-V1.json');
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8')) as {
    version: string;
    content_version: string;
    pasos: Array<{
      ref_id: string;
      pregunta_abierta_validada?: {
        pregunta?: string;
        placeholder?: string;
      };
      crear?: {
        audio?: { text?: string };
        display?: {
          eyebrow?: string;
          headline?: string;
          body?: string;
          moduleLabel?: string;
          levelLabel?: string;
          learningGoal?: string;
        };
        evidence?: Array<{ id: string; label: string; value: string }>;
        responseParts?: Array<{
          id: string;
          categoria: string;
          label: string;
          prompt: string;
          placeholder: string;
          minChars: number;
        }>;
      };
    }>;
  };
  const arrival = lesson.pasos.find((step) => step.ref_id === 'arrival');
  const precheck = lesson.pasos.find((step) => step.ref_id === 'precheck');
  const measuredSteps = ['precheck', 'postcheck', 'transfer', 'retest']
    .map((stepId) => lesson.pasos.find((step) => step.ref_id === stepId));

  expect(lesson.version).toBe('1.2.0');
  expect(lesson.content_version).toBe('2026-07-20');
  expect(arrival?.crear?.evidence).toBeUndefined();
  expect(arrival?.crear?.display).toMatchObject({
    eyebrow: 'CASO 01',
    moduleLabel: 'Módulo de inglés',
    levelLabel: 'B1+ / B2',
  });
  expect(arrival?.crear?.display?.body).toContain('\n');
  expect(precheck?.crear?.evidence?.map((item) => item.id)).toEqual(['diego', 'nerea', 'sync']);

  const canonicalResponseParts = measuredSteps[0]?.crear?.responseParts;
  expect(canonicalResponseParts).toHaveLength(3);
  for (const step of measuredSteps) {
    expect(step?.crear?.responseParts).toEqual(canonicalResponseParts);
  }

  const authoredHints = [
    ...Object.values(arrival?.crear?.display ?? {}),
    arrival?.crear?.audio?.text ?? '',
    arrival?.pregunta_abierta_validada?.pregunta ?? '',
    arrival?.pregunta_abierta_validada?.placeholder ?? '',
    ...Object.values(precheck?.crear?.display ?? {}),
    precheck?.crear?.audio?.text ?? '',
    precheck?.pregunta_abierta_validada?.pregunta ?? '',
    precheck?.pregunta_abierta_validada?.placeholder ?? '',
    ...(precheck?.crear?.evidence ?? []).flatMap((item) => [item.label, item.value]),
    ...(precheck?.crear?.responseParts ?? []).flatMap((part) => [
      part.label,
      part.prompt,
      part.placeholder,
    ]),
  ].join(' ').toLowerCase();
  expect(authoredHints).not.toMatch(
    /strong evidence|open possibility|ruled out|certainty prism|past participle|\b(?:must|might|may|could|cannot|can't|couldn't|could not)\s+have\b/
  );
});
