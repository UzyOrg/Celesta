import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const LESSON_ID = 'CREAR-ENGLISH-DEDUCTION-V1';
const CONTENT_VERSION = '2026-08-07-medicion-separada';
const ARTIFACT_DIR = path.join(process.cwd(), 'test-artifacts');

/**
 * The pre-check and the guided map now rotate their items per learner, because
 * the authored order put every correct answer on the option that shared its
 * position. Nothing in this suite may assume a fixed sequence: the helpers read
 * the item on screen and answer *that* one. Tests that care about coverage
 * assert on the returned set, not on the order.
 */
const PRECHECK_ANSWERS: Record<string, string> = {
  sofia: 'Casi seguro',
  tadeo: 'Podría ser',
  renata: 'No puede ser',
};

const MAP_TERMS: Record<string, string> = {
  valeria: 'MUST HAVE',
  mateo: 'MIGHT HAVE',
  iker: "CAN'T HAVE",
  elena: 'MUST HAVE',
};

const PRECHECK_WRONG_ANSWERS: Record<string, string> = {
  sofia: 'No puede ser',
  tadeo: 'Casi seguro',
  renata: 'Podría ser',
};

const PRECHECK_CLUES: Record<string, string> = {
  sofia: 'Sofía tenía pintura azul fresca en las manos. El cartel tenía la misma pintura.',
  tadeo: 'Tadeo se quedó en la biblioteca a la hora de la salida. Nadie vio qué estaba haciendo.',
  renata: 'Renata estaba en otro plantel cuando cambiaron el cartel.',
};

const MAP_CLUES: Record<string, string> = {
  valeria: 'A classmate saw Valeria paint the poster. It still had fresh blue paint.',
  mateo: 'Mateo stayed after class. No one saw whether he worked on the poster.',
  iker: 'Iker was playing a match at another school when the poster was made.',
  elena: 'Elena had fresh glue on her hands. The same glue was on the model.',
};

const MAP_TRANSLATIONS: Record<string, string> = {
  valeria: 'Una compañera vio a Valeria pintarlo. El cartel aún tenía pintura fresca.',
  mateo: 'Mateo se quedó después de clase. Nadie vio si trabajó en el cartel.',
  iker: 'Iker estaba jugando un partido en otra escuela cuando hicieron el cartel.',
  elena: 'Elena tenía pegamento fresco en las manos. La maqueta tenía el mismo pegamento.',
};

const MAP_CATEGORIES: Record<string, string> = {
  valeria: 'casi_seguro',
  mateo: 'posible',
  iker: 'imposible',
  elena: 'casi_seguro',
};

const MAP_WRONG_TERMS: Record<string, string> = {
  valeria: 'MIGHT HAVE',
  mateo: 'MUST HAVE',
  iker: 'MIGHT HAVE',
  elena: 'MIGHT HAVE',
};

const MAP_WRONG_FEEDBACK: Record<string, string> = {
  valeria: 'Una compañera vio a Valeria pintarlo: la evidencia hace que sea casi seguro.',
  mateo: 'Estar ahí lo hace posible, pero nadie vio qué hizo: no puedes asegurarlo.',
  iker: 'El partido lo coloca fuera de la escuela: esta acción queda descartada.',
};

/**
 * Reads the id of the item currently on screen, waiting out the enter/exit
 * transition. `AnimatePresence` keeps the outgoing node mounted for a frame, so
 * reading the attribute straight after a click can return the previous item.
 */
async function activeId(
  page: Page,
  testId: string,
  attribute: string,
  previous?: string
): Promise<string> {
  const locator = page.getByTestId(testId);
  await expect.poll(async () => {
    const nodes = await locator.all();
    if (nodes.length !== 1) return null;
    const id = await nodes[0]!.getAttribute(attribute);
    return id === previous ? null : id;
  }, { timeout: 15_000 }).not.toBeNull();
  return (await locator.getAttribute(attribute))!;
}

/**
 * Production copy, named once. The shape is the same everywhere: the
 * proposition is stated and the **certainty is the gap the learner fills**.
 * Practice teaches that gap by drag-and-drop (`sentenceStart` … `sentenceEnd`
 * around a modal); transfer and retest present the identical gap in Spanish
 * (`Es … que Nora haya trabajado`) next to the English one in the placeholder
 * (`Nora … the model.`), so what has to be supplied is unmistakable and the
 * previous screen's answer is never handed back. Two earlier framings failed
 * here and both are regressions worth catching as a diff: stating the bare
 * proposition ("Escribe tu deducción en inglés: Nora trabajó en la maqueta"),
 * which reads as a translation order and scores a correct learner as wrong,
 * and naming the certainty outright, which leaks the un-revealed answer to the
 * calibration step immediately before.
 */
const GATE_PROMPT = '¿Podrías escribir en inglés qué tan seguro es que Camila haya sido quien lo borró?';
const ATTEMPT_PROMPT = 'Inténtalo como puedas.';
const ATTEMPT_PROMPT_NO = 'Inténtalo como puedas. Esto no se califica.';
const BLOCKED_HINT = 'Si no te sale, elige “Todavía no”. También es una respuesta.';
const NORA_FRAME = 'Es … que Nora haya trabajado en la maqueta.';
/**
 * Day 7 is a parallel form of day 1, not a different question. It changes the
 * case — new person, new object, new clue — and holds the target certainty
 * fixed at `posible`. When it asked for `can't have` while day 1 asked for
 * `might have`, a drop between the two sittings was equally well explained by
 * forgetting and by the modal changing, and n≈5 cannot separate those.
 */
const EMI_FRAME = 'Es … que Emi haya pintado el mural.';
const PRODUCTION_PROMPT = 'Escríbelo como hemos practicado';

interface CapturedLearningEvent {
  client_event_id: string;
  paso_id: string;
  verbo: string;
  result?: {
    assisted?: boolean;
    attempt?: number;
    baselineGate?: string;
    classifierAgreed?: boolean;
    classifierSource?: string;
    correcto?: boolean;
    fase?: string;
    intento?: number;
    latencyMs?: number;
    retestDueAt?: number;
    mapping?: Record<string, string>;
    rama?: string;
    score?: number;
    statementId?: string;
    targetCategory?: string;
    texto?: string;
    shownOrder?: string[];
    expressedCategory?: string | null;
    formWellFormed?: boolean;
    subjectPresent?: boolean;
    certaintyConsistent?: boolean;
    learningOpportunity?: {
      id: string;
      condition: string;
      constructs: string[];
      novelty: string;
      timing: string;
      cueFrame?: string;
    };
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
    const storageKey = `celesta:crear:study:${lessonId}`;
    // The init script runs again on reload. Preserve the learner's decision so
    // this helper can exercise the real resume path instead of reseeding it.
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(
      storageKey,
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
        evidenceLedger: [],
      })
    );
  }, { lessonId: LESSON_ID, contentVersion: CONTENT_VERSION, index: stepIndex });
}

async function seedLockedRetest(page: Page) {
  await page.addInitScript(({ lessonId, contentVersion }) => {
    const now = Date.now();
    const storageKey = `celesta:crear:study:${lessonId}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        studyId: 'study-locked-retest',
        lessonId,
        contentVersion,
        startedAt: now - 60_000,
        updatedAt: now,
        phase: 'waiting_retest',
        stepIndex: 11,
        retestDueAt: now + 7 * 24 * 60 * 60 * 1000,
        attempts: {},
        firstOutcomes: {},
        latestOutcomes: {},
        awaitingFeedback: {},
        assistance: {},
        evidenceLedger: [],
      })
    );
  }, { lessonId: LESSON_ID, contentVersion: CONTENT_VERSION });
}

async function completeBaselineProduction(
  page: Page,
  { gate = 'Sí', text = 'Camila must have cleaned the board.' } = {}
) {
  await expect(page.getByRole('heading', {
    name: 'Antes de empezar, un intento.',
    exact: true,
  })).toBeVisible();
  await page.getByRole('button', { name: gate, exact: true }).click();
  await page.getByLabel(ATTEMPT_PROMPT, { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();
}

/**
 * Answers the pre-check whatever order it comes in. Returns the item ids in
 * the order this run actually saw them, so a test can assert the set of items
 * without pinning the sequence.
 */
async function completePrecheck(
  page: Page,
  answers: Record<string, string> = PRECHECK_ANSWERS
): Promise<string[]> {
  const shown: string[] = [];
  const total = Object.keys(PRECHECK_ANSWERS).length;
  for (let index = 0; index < total; index += 1) {
    const itemId = await activeId(page, 'precheck-item', 'data-item-id', shown[index - 1]);
    shown.push(itemId);
    await page.getByRole('radio', { name: answers[itemId]!, exact: true }).click();
    await page.getByRole('button', {
      name: index === total - 1 ? 'Ver la comparación' : 'Siguiente',
      exact: true,
    }).click();
  }
  return shown;
}

async function reachGuidedMap(page: Page) {
  await page.goto('/crear');
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();
  await completePrecheck(page);
  await completeBaselineProduction(page);
  await page.getByRole('radio', {
    name: 'Es casi seguro que Valeria pintó el póster.',
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

/**
 * Solves the map correctly whatever order the clues come in. Returns the
 * statement ids in the order this run saw them.
 */
async function assignCorrectMap(page: Page, count = 3): Promise<string[]> {
  const shown: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const statementId = await activeId(
      page,
      'certainty-map-question',
      'data-statement-id',
      shown[index - 1]
    );
    shown.push(statementId);
    await page.getByRole('button', {
      name: `Elegir ${MAP_TERMS[statementId]} para completar la frase`,
      exact: true,
    }).click();
    if (index < count - 1) {
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    }
  }
  return shown;
}

test('Hallmark arrival reads as one quiet cinematic task across mobile widths', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 0);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', {
    name: 'El cartel cambió antes de la feria.',
    exact: true,
  })).toBeVisible();
  await expect(page.locator('[aria-label="Caso uno"]')).toHaveCount(0);
  await expect(page.getByText('Escuchar introducción', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel(
    'Cartel de la feria. Está en el salón y la pintura todavía está fresca.',
    { exact: true }
  )).toBeVisible();

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
    name: 'Ver la primera pista',
    exact: true,
  });
  const title = page.getByRole('heading', {
    name: 'El cartel cambió antes de la feria.',
    exact: true,
  });
  const titleBox = await title.boundingBox();
  expect(titleBox?.height).toBeLessThanOrEqual(70);

  const actionBox = await primaryAction.boundingBox();
  expect(actionBox?.height).toBeGreaterThanOrEqual(52);
  expect(actionBox?.y).toBeGreaterThan(620);

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

  await page.setViewportSize({ width: 320, height: 700 });
  await page.reload();
  const narrowTitle = page.getByRole('heading', {
    name: 'El cartel cambió antes de la feria.',
    exact: true,
  });
  await expect(narrowTitle).toBeVisible();
  expect((await narrowTitle.boundingBox())?.height).toBeLessThanOrEqual(30);
  await expect(page.getByText('Escuchar introducción', { exact: true })).toHaveCount(0);
  await capture(page, 'celestea-hallmark-arrival-320.png');

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
    expect((await title.boundingBox())?.height).toBeLessThanOrEqual(74);
  }

  const desktopActionBox = await primaryAction.boundingBox();
  expect((desktopActionBox?.y ?? 0) + (desktopActionBox?.height ?? 0))
    .toBeLessThanOrEqual(800);
});

test('precheck captures three neutral certainty decisions before the explanation', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 1);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', {
    name: 'Son tres decisiones rápidas antes de ver cómo expresarlo en inglés.',
    exact: true,
  })).toBeVisible();
  expect(await page.getByRole('heading', {
    name: 'Son tres decisiones rápidas antes de ver cómo expresarlo en inglés.',
    exact: true,
  }).evaluate((element) => getComputedStyle(element).fontSize)).toBe('22px');
  await expect(page.getByText('Decide solo con la pista', { exact: true })).toHaveCount(0);
  const firstItemId = await activeId(page, 'precheck-item', 'data-item-id');
  await expect(page.getByText(PRECHECK_CLUES[firstItemId]!, { exact: true })).toBeVisible();
  await expect(page.getByText('MUST HAVE', { exact: true })).toHaveCount(0);
  await expect(page.getByText('MIGHT HAVE', { exact: true })).toHaveCount(0);
  await expect(page.getByText("CAN'T HAVE", { exact: true })).toHaveCount(0);

  const nextAction = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(nextAction).toBeDisabled();
  for (const option of ['Casi seguro', 'Podría ser', 'No puede ser']) {
    const radio = page.getByRole('radio', { name: option, exact: true });
    await expect(radio).toBeVisible();
    expect((await radio.locator('..').boundingBox())?.height).toBeGreaterThanOrEqual(51.5);
  }

  // Deliberately wrong, to prove an incorrect baseline decision is recorded
  // without any correctness feedback reaching the learner.
  await page.getByRole('radio', {
    name: PRECHECK_WRONG_ANSWERS[firstItemId]!,
    exact: true,
  }).click();
  await expect(nextAction).toBeEnabled();
  await capture(page, 'celestea-hallmark-precheck-375.png');

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      vertical: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow.horizontal).toBeLessThanOrEqual(1);
    expect(overflow.vertical).toBeLessThanOrEqual(1);
    const actionBox = await nextAction.boundingBox();
    expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    if (viewport.width !== 375) {
      await capture(page, `celestea-hallmark-precheck-${viewport.width}.png`);
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await nextAction.click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  const secondItemId = await activeId(page, 'precheck-item', 'data-item-id', firstItemId);
  await expect(page.getByText(PRECHECK_CLUES[secondItemId]!, { exact: true })).toBeVisible();

  // The per-learner order is seeded, not random: a reload must resume on the
  // same clue, or the position a learner saw could never be reconstructed.
  await page.reload();
  await expect(page.getByText('2 de 3', { exact: true })).toBeVisible();
  await expect(page.getByTestId('precheck-item')).toHaveAttribute('data-item-id', secondItemId);
  await expect(page.getByText(PRECHECK_CLUES[secondItemId]!, { exact: true })).toBeVisible();

  await page.getByRole('radio', {
    name: PRECHECK_ANSWERS[secondItemId]!,
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  const thirdItemId = await activeId(page, 'precheck-item', 'data-item-id', secondItemId);
  await page.getByRole('radio', {
    name: PRECHECK_ANSWERS[thirdItemId]!,
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Ver la comparación', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Antes de empezar, un intento.',
    exact: true,
  })).toBeVisible();

  // Delivery is intentionally at-least-once: a reload can race an IndexedDB
  // flush. The ingest endpoint de-duplicates by this stable client id.
  const uniquePrecheckEvents = () => Array.from(new Map(
    telemetry
      .filter((event) => event.verbo === 'envio_respuesta' && event.paso_id === 'precheck')
      .map((event) => [event.client_event_id, event])
  ).values());
  await expect.poll(uniquePrecheckEvents).toHaveLength(3);
  const precheckEvents = uniquePrecheckEvents();
  const shownIds = [firstItemId, secondItemId, thirdItemId];
  // Each clue is probed exactly once, in the order this learner saw it — but
  // the order itself is no longer authored, so the assertion is on the set.
  expect(precheckEvents.map((event) => event.result?.statementId)).toEqual(shownIds);
  expect([...shownIds].sort()).toEqual(['renata', 'sofia', 'tadeo']);
  expect(precheckEvents.map((event) => event.result?.correcto)).toEqual([false, true, true]);
  for (const event of precheckEvents) {
    expect(event.result).toMatchObject({
      fase: 'pre_check',
      assisted: false,
      latencyMs: expect.any(Number),
      // The shown order rides on every answer, so position bias is measurable
      // in the data rather than merely avoided in the UI.
      shownOrder: shownIds,
      learningOpportunity: {
        id: 'baseline-certainty-calibration',
        constructs: ['certainty_calibration'],
        condition: 'independent',
        novelty: 'same_case',
        timing: 'immediate',
      },
    });
    expect(event.result?.learningOpportunity?.cueFrame).toBeTruthy();
  }
});

test('the pre-check answer key does not run down the option column', async ({ page }) => {
  /**
   * The authored order made item 1 → option 1, item 2 → option 2, item 3 →
   * option 3. A learner tapping straight down the column scored 3/3 on the
   * only pre-measure the study has. Different learners must now meet the
   * clues in different orders.
   */
  const firstClueByStudy: string[] = [];
  for (const studyId of ['study-a', 'study-b', 'study-c', 'study-d', 'study-e', 'study-f']) {
    await page.context().clearCookies();
    await page.goto('/crear');
    await page.evaluate(({ key, id }) => {
      const now = Date.now();
      localStorage.setItem(key, JSON.stringify({
        studyId: id,
        lessonId: 'CREAR-ENGLISH-DEDUCTION-V1',
        contentVersion: '2026-08-07-medicion-separada',
        startedAt: now,
        updatedAt: now,
        phase: 'initial',
        stepIndex: 1,
        attempts: {},
        firstOutcomes: {},
        latestOutcomes: {},
        awaitingFeedback: {},
        assistance: {},
        evidenceLedger: [],
      }));
    }, { key: `celesta:crear:study:${LESSON_ID}`, id: studyId });
    await page.goto('/crear');
    firstClueByStudy.push(await activeId(page, 'precheck-item', 'data-item-id'));
  }

  expect(new Set(firstClueByStudy).size).toBeGreaterThan(1);
});

test('contrast is one compact diagnostic task at common mobile widths', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 3);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', {
    name: 'Observa las dos frases.',
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Frase A', exact: true }))
    .toContainText('Valeria painted the poster.');
  await expect(page.getByRole('article', { name: 'Frase B', exact: true }))
    .toContainText('Valeria must have painted the poster.');
  await expect(page.locator('mark', { hasText: 'must have' })).toBeVisible();
  await expect(page.getByLabel('Voz de Celestea').getByRole('button', {
    name: 'Reproducir voz',
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    'Las dos hablan de Valeria. Solo una presenta una conclusión.',
    { exact: true }
  )).toHaveCount(0);

  const choices = [
    'Valeria pintó el póster.',
    'Es casi seguro que Valeria pintó el póster.',
    'Valeria debe pintar el póster.',
  ];
  for (const choice of choices) {
    const radio = page.getByRole('radio', { name: choice, exact: true });
    await expect(radio).toBeVisible();
    const choiceBox = await radio.locator('..').boundingBox();
    expect(choiceBox?.height).toBeGreaterThanOrEqual(51.5);
  }

  await page.getByRole('radio', {
    name: 'Es casi seguro que Valeria pintó el póster.',
    exact: true,
  }).click();
  await expect(page.getByRole('button', { name: 'Comprobar', exact: true }))
    .toBeEnabled();
  await capture(page, 'celestea-hallmark-contrast-375.png');

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      vertical: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow.horizontal).toBeLessThanOrEqual(1);
    expect(overflow.vertical).toBeLessThanOrEqual(1);

    const actionBox = await page.getByRole('button', {
      name: 'Comprobar',
      exact: true,
    }).boundingBox();
    expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0))
      .toBeLessThanOrEqual(viewport.height);
  }
});

test('locked D7 gate keeps safe gutters at mobile widths', async ({ page }) => {
  await mockTelemetry(page);
  await seedLockedRetest(page);

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/crear');

    const heading = page.getByRole('heading', {
      name: 'Volvemos en una semana.',
      exact: true,
    });
    await expect(heading).toBeVisible();
    const action = page.getByRole('button', {
      name: 'Listo, cerrar',
      exact: true,
    });
    const exit = page.getByRole('button', {
      name: 'Salir',
      exact: true,
    });
    const headingBox = await heading.boundingBox();
    const actionBox = await action.boundingBox();
    const exitBox = await exit.boundingBox();

    expect(headingBox?.x).toBeGreaterThanOrEqual(16);
    expect(actionBox?.x).toBeGreaterThanOrEqual(16);
    expect((actionBox?.x ?? 0) + (actionBox?.width ?? 0))
      .toBeLessThanOrEqual(viewport.width - 16);
    expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0))
      .toBeLessThanOrEqual(viewport.height);
    expect(exitBox?.x).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    )).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'celestea-hallmark-d7-gate-375.png');
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
  // The bridge names both objects, so the third change of case stops arriving
  // unannounced. The heading is the recording's own sentence, said out loud.
  await expect(page.getByRole('heading', {
    name: 'Cambia el caso, no la idea.',
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    'Ya resolviste el cartel con ayuda. Ahora la maqueta de la feria, con menos apoyo.',
    { exact: true }
  )).toBeVisible();
  await expect(page.getByLabel('Voz de Celestea').getByRole('button')).toBeVisible();
  await expect.poll(() => page.locator('audio').evaluate((element) =>
    (element as HTMLAudioElement).duration
  )).toBeGreaterThan(10);
  await expect(page.getByRole('button', {
    name: 'Continuar al caso nuevo',
    exact: true,
  })).toBeEnabled();
  await capture(page, 'celestea-v17-transfer-bridge-mobile.png');
  await page.getByRole('button', { name: 'Continuar al caso nuevo', exact: true }).click();

  await expect(page.getByRole('heading', {
    name: 'La maqueta de la feria.',
    exact: true,
  })).toBeVisible();
  await assignCorrectMap(page, 1);
  await page.getByRole('button', {
    name: 'Comprobar',
    exact: true,
  }).click();
  await expect(page.getByRole('heading', {
    name: '¿Qué tan seguro es?',
    exact: true,
  })).toBeVisible();
  await capture(page, 'celestea-v17-independent-certainty-mobile.png');
  await page.getByRole('radio', { name: 'Es posible', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar decisión', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Ahora dilo en inglés.',
    exact: true,
  })).toBeVisible();
  // The clue was read on the certainty screen; here the frame with the missing
  // certainty takes its place.
  await expect(page.getByText(NORA_FRAME, { exact: true })).toBeVisible();
  await expect(page.getByText(
    'Nora stayed in the classroom during recess. Nobody saw what she was doing.',
    { exact: true }
  )).toHaveCount(0);
  const productionAction = page.getByRole('button', {
    name: 'Guardar mi frase',
    exact: true,
  });
  const productionActionBox = await productionAction.boundingBox();
  expect(productionActionBox?.y).toBeGreaterThan(620);
  await capture(page, 'celestea-v17-production-mobile.png');
  await page.getByRole('textbox', {
    name: PRODUCTION_PROMPT,
    exact: true,
  }).fill('Nora might have worked on the model.');
  await expect(page.getByPlaceholder('Nora … the model.', { exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Guardar mi frase', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Tu frase conserva la posibilidad',
    exact: true,
  })).toBeVisible();

  const transferState = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(transferState.firstOutcomes.transfer).toMatchObject({
    correct: true,
    assisted: false,
    mapping: {
      elena: 'casi_seguro',
    },
  });
  expect(transferState.firstOutcomes['transfer-check-certainty']).toMatchObject({
    correct: true,
    assisted: false,
    text: 'Es posible',
  });
  expect(transferState.firstOutcomes['transfer-production']).toMatchObject({
    correct: true,
    assisted: false,
    text: 'Nora might have worked on the model.',
  });
  expect(transferState.evidenceLedger).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: 'independent-transfer-certainty',
      constructs: ['certainty_calibration'],
      condition: 'independent',
      correct: true,
    }),
    expect.objectContaining({
      id: 'independent-transfer-form',
      constructs: ['modal_form'],
      condition: 'independent',
      correct: true,
    }),
  ]));

  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Terminaste por hoy.',
    exact: true,
  })).toBeVisible();
  // A receipt, not a paragraph: a deliverable label and two named dimensions,
  // each with its own state. No score, no percentage, no "1 de 2".
  const receipt = page.getByRole('region', { name: 'Lo que guardamos de hoy', exact: true });
  await expect(receipt).toBeVisible();
  const receiptRows = receipt.getByRole('listitem');
  await expect(receiptRows).toHaveCount(2);
  await expect(receiptRows.nth(0)).toContainText('Interpretación de las pistas');
  await expect(receiptRows.nth(0)).toContainText('correcta');
  await expect(receiptRows.nth(1)).toContainText('Forma en inglés');
  await expect(receiptRows.nth(1)).toContainText('correcta');
  await expect(page.getByText('Camila must have cleaned the board.', { exact: true }))
    .toBeVisible();
  await expect(page.getByText('Nora might have worked on the model.', { exact: true }))
    .toBeVisible();
  await expect(page.getByText('%', { exact: false })).toHaveCount(0);
  await expect(page.getByText('1 de 2', { exact: false })).toHaveCount(0);
  await capture(page, 'celestea-v18-closing-diagnostic-375.png');
  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    )).toBeLessThanOrEqual(1);
    const closeBox = await page.getByRole('button', {
      name: 'Terminar por hoy',
      exact: true,
    }).boundingBox();
    expect((closeBox?.y ?? 0) + (closeBox?.height ?? 0))
      .toBeLessThanOrEqual(viewport.height);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Terminar por hoy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Una semana después.', exact: true })).toBeVisible();
  await expect(page.getByText('CELESTEA', { exact: true })).toHaveCount(0);
  await capture(page, 'celestea-v17-d7-certainty-mobile.png');
  await page.getByRole('radio', { name: 'Es posible', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar decisión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ahora dilo en inglés.', exact: true })).toBeVisible();
  await expect(page.getByText(EMI_FRAME, { exact: true })).toBeVisible();
  await page.getByRole('textbox', {
    name: PRODUCTION_PROMPT,
    exact: true,
  }).fill('Emi might have painted the mural.');
  await page.getByRole('button', { name: 'Terminar revisión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La idea sigue contigo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Terminaste la revisión.', exact: true })).toBeVisible();
  await expect(page.getByText(
    'Pudiste escribir una deducción en un caso nuevo.',
    { exact: true }
  )).toBeVisible();
  // One statement-level observation plus one aggregate event for the single
  // supported transfer item.
  await expect.poll(() => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta' && event.paso_id === 'transfer'
  )).toHaveLength(2);
  const transferEvent = telemetry.find(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'transfer-production'
      && event.result?.rama === 'correcto'
  );
  expect(transferEvent?.result).toMatchObject({
    assisted: false,
    correcto: true,
    fase: 'transfer',
    texto: 'Nora might have worked on the model.',
    latencyMs: expect.any(Number),
    // No model runs against this server, so local is the honest provenance and
    // there is nothing for it to agree with.
    classifierSource: 'local',
    learningOpportunity: {
      id: 'independent-transfer-form',
      constructs: ['modal_form'],
      condition: 'independent',
      novelty: 'new_case',
      timing: 'immediate',
    },
  });
  // The day 7 due date is mirrored to the server so a lost localStorage cannot
  // erase who owes a retest.
  await expect.poll(() => typeof telemetry.find(
    (event) => event.verbo === 'taller_completado'
  )?.result?.retestDueAt).toBe('number');
  expect(consoleErrors, `Missing resources: ${missingResources.join(', ')}`).toEqual([]);
});

test('keeps the independent production cue and primary action inside common mobile viewports', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 9);

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/crear');
    // The visible cue on this screen is the Spanish frame to render in English,
    // not the case evidence: past `arrival` the artifact is icon-only (ADR 0005)
    // and its caption is display:none. Asserting the frame is what protects the
    // measure — it is Spanish on purpose, so the screen never hands the learner
    // the English sentence this step exists to elicit.
    await expect(page.getByRole('heading', {
      name: 'Ahora dilo en inglés.',
      exact: true,
    })).toBeVisible();
    await expect(page.getByText(
      'Es … que Nora haya trabajado en la maqueta.',
      { exact: true }
    )).toBeVisible();

    const primaryAction = page.getByRole('button', {
      name: 'Guardar mi frase',
      exact: true,
    });
    const actionBox = await primaryAction.boundingBox();
    expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0))
      .toBeLessThanOrEqual(viewport.height);

    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 320, height: 812 });
  await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });
  const scaledAction = page.getByRole('button', {
    name: 'Guardar mi frase',
    exact: true,
  });
  await scaledAction.scrollIntoViewIfNeeded();
  await expect(scaledAction).toBeVisible();
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  )).toBeLessThanOrEqual(1);
});

test('keeps the learning guide available and marks its use as assisted', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 5);
  await page.goto('/crear');

  await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Tres formas según la fuerza de la evidencia',
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
  await seedStep(page, 5);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  const clueId = await activeId(page, 'certainty-map-question', 'data-statement-id');
  const englishClue = page.getByText(MAP_CLUES[clueId]!, { exact: true });
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
  await expect(page.getByText(MAP_TRANSLATIONS[clueId]!, { exact: true })).toBeVisible();
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
  await seedStep(page, 5);
  await page.goto('/crear');

  // Get the first clue wrong on purpose, correct it, then solve the rest.
  const retriedId = await activeId(page, 'certainty-map-question', 'data-statement-id');
  await page.getByRole('button', {
    name: `Elegir ${MAP_WRONG_TERMS[retriedId]} para completar la frase`,
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByText(MAP_WRONG_FEEDBACK[retriedId]!, { exact: true })).toBeVisible();
  await page.getByRole('button', {
    name: `Elegir ${MAP_TERMS[retriedId]} para completar la frase`,
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  const remaining: string[] = [retriedId];
  for (let index = 1; index < 3; index += 1) {
    const statementId = await activeId(
      page,
      'certainty-map-question',
      'data-statement-id',
      remaining[index - 1]
    );
    remaining.push(statementId);
    await page.getByRole('button', {
      name: `Elegir ${MAP_TERMS[statementId]} para completar la frase`,
      exact: true,
    }).click();
    if (index < 2) {
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();

  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  // The step as a whole was assisted. That summary is fair; the per-clue flag
  // below is the one that must not inherit it.
  expect(state.firstOutcomes['guided-map']).toMatchObject({
    branch: 'mapa_asistido',
    correct: true,
    assisted: true,
  });
  const attemptsFor = (statementId: string) => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'guided-map'
      && event.result?.statementId === statementId
  );
  // Two events for the retried clue plus one each for the other two. Polling
  // only on the first clue would race the flush of the last one.
  await expect.poll(() => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'guided-map'
      && typeof event.result?.statementId === 'string'
  )).toHaveLength(4);
  const retriedAttempts = attemptsFor(retriedId);
  expect(retriedAttempts[0]?.result).toMatchObject({
    assisted: false,
    correcto: false,
    rama: 'map_item_incorrecto',
  });
  expect(retriedAttempts[1]?.result).toMatchObject({
    assisted: true,
    correcto: true,
    rama: 'map_item_correcto',
  });

  /**
   * A retry on one clue says nothing about the next one. When `assisted` was
   * map-wide, every clue after the first mistake was filed as assisted and the
   * flag stopped meaning what it says — the two clues this learner solved
   * unaided were recorded as if they had been helped.
   */
  for (const statementId of remaining.slice(1)) {
    const attempts = attemptsFor(statementId);
    expect(attempts, `clue ${statementId} was solved first time`).toHaveLength(1);
    expect(attempts[0]?.result).toMatchObject({
      assisted: false,
      correcto: true,
      rama: 'map_item_correcto',
    });
  }
});

test('does not convert a miscalibrated transfer sentence into success', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 7);
  await page.goto('/crear');
  await assignCorrectMap(page, 1);
  await page.getByRole('button', {
    name: 'Comprobar',
    exact: true,
  }).click();
  await page.getByRole('radio', { name: 'Es posible', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar decisión', exact: true }).click();
  await page.getByRole('textbox').fill('Nora must have worked on the model.');
  await page.getByRole('button', { name: 'Guardar mi frase', exact: true }).click();

  await expect(page.getByRole('heading', {
    name: 'La forma cambió tu certeza',
    exact: true,
  })).toBeVisible();
  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.firstOutcomes['transfer-production'].correct).toBe(false);
  expect(state.firstOutcomes['transfer-production'].branch).toBe('misconcepcion_certeza');

  /**
   * ...and does not convert it into a form error either. `modal + have +
   * participle` was spelled perfectly here; what failed was the calibration,
   * which is measured one screen earlier and has its own row on the receipt.
   * Scoring `modal_form` off the classifier branch collapsed the two
   * constructs the split screens exist to keep apart.
   */
  const formEvidence = (state.evidenceLedger as Array<{
    id: string;
    constructs: string[];
    correct: boolean;
  }>).filter((entry) => entry.id === 'independent-transfer-form');
  expect(formEvidence).toHaveLength(1);
  expect(formEvidence[0]).toMatchObject({
    constructs: ['modal_form'],
    correct: true,
  });
});

test('records the two constructs of a production attempt separately', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 7);
  await page.goto('/crear');
  await assignCorrectMap(page, 1);
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  // A learner who judges "casi seguro" and then writes `must have` is
  // internally consistent and mis-calibrated. Those are two findings.
  await page.getByRole('radio', { name: 'Es casi seguro', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar decisión', exact: true }).click();
  await page.getByRole('textbox').fill('Nora must have worked on the model.');
  await page.getByRole('button', { name: 'Guardar mi frase', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'La forma cambió tu certeza',
    exact: true,
  })).toBeVisible();

  await expect.poll(() => telemetry.some(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'transfer-production'
  )).toBe(true);
  const production = telemetry.find(
    (event) => event.verbo === 'envio_respuesta' && event.paso_id === 'transfer-production'
  );
  expect(production?.result).toMatchObject({
    rama: 'misconcepcion_certeza',
    expressedCategory: 'casi_seguro',
    formWellFormed: true,
    subjectPresent: true,
    certaintyConsistent: true,
  });
});

test('a deduction about the wrong classmate is not a correct deduction', async ({ request }) => {
  /**
   * The subject group used to be matched as a raw substring, and `he` is
   * inside `the`. Any sentence containing "the model" satisfied it, so a
   * well-formed deduction about someone the clue never mentioned scored
   * `correcto` — and the route prefers a high-confidence structural local
   * match, so the model could not overturn it.
   */
  const response = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer-production',
      texto: 'Elena might have worked on the model.',
    },
  });
  expect(response.ok()).toBe(true);
  expect(await response.json()).not.toMatchObject({ rama: 'correcto' });
});

test('a day 7 link cannot skip a learner into a retest they have not earned', async ({ page }) => {
  /**
   * The bypass writes `stepIndex` to storage. Fired on someone who has not
   * finished day 1 — a forwarded link, a curious tap — it threw away their
   * position and dropped them into a measurement of something they had never
   * been taught.
   */
  await mockTelemetry(page);
  await seedStep(page, 1);
  await page.goto('/crear?retest=1');
  await expect(page.getByRole('heading', { name: 'Una semana después.', exact: true }))
    .toHaveCount(0);
  await expect(page.getByRole('heading', {
    name: 'Son tres decisiones rápidas antes de ver cómo expresarlo en inglés.',
    exact: true,
  })).toBeVisible();
  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.stepIndex).toBe(1);
});

test('local classifier distinguishes the authored transfer and D7 targets', async ({ request }) => {
  const transfer = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer-production',
      texto: 'Nora might have worked on the model.',
    },
  });
  expect(transfer.ok()).toBe(true);
  expect(await transfer.json()).toMatchObject({ rama: 'correcto' });

  const wrongStrength = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer-production',
      texto: 'Nora must have worked on the model.',
    },
  });
  expect(wrongStrength.ok()).toBe(true);
  expect(await wrongStrength.json()).toMatchObject({ rama: 'misconcepcion_certeza' });

  const retest = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'retest-production',
      texto: 'Emi might have painted the mural.',
    },
  });
  expect(retest.ok()).toBe(true);
  expect(await retest.json()).toMatchObject({ rama: 'correcto' });

  const transferPronoun = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'transfer-production',
      texto: 'She might have worked on the model.',
    },
  });
  expect(transferPronoun.ok()).toBe(true);
  expect(await transferPronoun.json()).toMatchObject({ rama: 'correcto' });

  const retestPronoun = await request.post('/api/classify', {
    data: {
      tallerId: LESSON_ID,
      pasoRefId: 'retest-production',
      texto: 'They might have painted the mural.',
    },
  });
  expect(retestPronoun.ok()).toBe(true);
  expect(await retestPronoun.json()).toMatchObject({ rama: 'correcto' });
});

test('near misses reach an authored branch instead of falling into no_claro', async ({ request }) => {
  const cases: Array<[string, string, string]> = [
    ['transfer-production', 'Nora might have worked on the model.', 'correcto'],
    ['transfer-production', 'She may have helped with the project.', 'correcto'],
    ['transfer-production', 'Nora must have worked on the model.', 'misconcepcion_certeza'],
    ['transfer-production', 'Nora might have work on the model.', 'misconcepcion_forma_general'],
    ['transfer-production', 'Nora might of worked on it.', 'misconcepcion_forma_general'],
    ['transfer-production', 'Maybe Nora worked on the model.', 'significado_sin_forma'],
    ['transfer-production', "I don't know", 'no_claro'],
    ['retest-production', 'Emi might have painted the mural.', 'correcto'],
    ['retest-production', 'Emi might painted the mural.', 'misconcepcion_forma'],
    ['retest-production', 'Emi might have paint the mural.', 'misconcepcion_forma_general'],
    ["retest-production", "Emi can't have painted the mural.", 'misconcepcion_certeza'],
    ['retest-production', 'Maybe Emi painted the mural.', 'significado_sin_forma'],
    // L1 interference: Spanish speakers keep the certainty and break the form.
    ['transfer-production', 'Nora must to have moved the model.', 'misconcepcion_certeza'],
    ['transfer-production', 'Nora must had moved the model.', 'misconcepcion_certeza'],
    ['retest-production', 'Emi must to have painted the mural.', 'misconcepcion_certeza'],
    ['retest-production', 'Emi must had painted the mural.', 'misconcepcion_certeza'],
    // Answering in Spanish is a real deduction without the target structure,
    // not an unreadable answer.
    ['transfer-production', 'Tal vez Nora trabajó en la maqueta.', 'significado_sin_forma'],
    ['transfer-production', 'Creo que Nora pudo haber trabajado en la maqueta.', 'significado_sin_forma'],
    ['retest-production', 'Tal vez Emi pintó el mural.', 'significado_sin_forma'],
  ];

  for (const [pasoRefId, texto, expected] of cases) {
    const response = await request.post('/api/classify', {
      data: { tallerId: LESSON_ID, pasoRefId, texto },
    });
    expect(response.ok(), `${pasoRefId} · ${texto}`).toBe(true);
    const body = await response.json() as { rama: string; source?: string };
    expect(body.rama, `${pasoRefId} · ${texto}`).toBe(expected);
    expect(body.source, `${pasoRefId} · ${texto}`).toBe('local');
  }

  const noClaroCases = cases.filter(([, , expected]) => expected === 'no_claro');
  expect(noClaroCases.map(([, texto]) => texto)).toEqual(["I don't know"]);
});

test('the pre-instruction baseline separates self-efficacy from production', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 2);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', {
    name: 'Antes de empezar, un intento.',
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(GATE_PROMPT, { exact: true })).toBeVisible();
  // No teaching surface on a measurement screen.
  await expect(page.getByRole('button', { name: 'Ayuda', exact: true })).toHaveCount(0);
  await expect(page.getByText('MUST HAVE', { exact: true })).toHaveCount(0);

  const attemptField = page.locator('#celestea-baseline-attempt');
  const baseline = page.getByRole('region', {
    name: 'Intento inicial en inglés',
    exact: true,
  });

  /**
   * Progressive disclosure, asserted by absence rather than by visibility.
   * Before the gate is answered the two gate buttons are the only controls
   * that exist: a disabled control here would be dead with no stated cause,
   * unlike the one after "sí", which is a consequence of the learner's own
   * declaration and names its own exit.
   */
  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(attemptField).toHaveCount(0);
    await expect(baseline.locator('button:disabled')).toHaveCount(0);
    await expect(baseline.locator('textarea')).toHaveCount(0);
    await expect(baseline.getByRole('button')).toHaveCount(2);
    // The second negative that competed with the gate's own "Todavía no".
    await expect(page.getByText('Todavía no sé cómo decirlo')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 375, height: 812 });

  // "Todavía no" softens the frame; it must never close the field, because the
  // failed pre-instruction attempt is both the measurement and the pretesting
  // benefit.
  const gateNo = page.getByRole('button', { name: 'Todavía no', exact: true });
  const gateYes = page.getByRole('button', { name: 'Sí', exact: true });
  await gateNo.click();
  await expect(gateNo).toHaveAttribute('aria-pressed', 'true');
  await expect(gateYes).toHaveAttribute('aria-pressed', 'false');
  await expect(attemptField).toBeVisible();
  await expect(page.getByPlaceholder('Camila … the board.', { exact: true })).toBeVisible();
  // "Todavía no" keeps the reassurance that the attempt isn't graded.
  await expect(page.getByText(ATTEMPT_PROMPT_NO, { exact: true })).toBeVisible();

  // After "todavía no" the empty submission stays available: the failed
  // pre-instruction attempt is both the measurement and the pretesting benefit.
  const emptyAction = page.getByRole('button', {
    name: 'Continuar sin escribir',
    exact: true,
  });
  const saveAction = page.getByRole('button', {
    name: 'Guardar y continuar',
    exact: true,
  });
  await expect(emptyAction).toBeEnabled();
  await expect(baseline.getByRole('button')).toHaveCount(3);

  // The learner can correct the self-assessment after seeing the field.
  await gateYes.click();
  await expect(gateYes).toHaveAttribute('aria-pressed', 'true');
  await expect(attemptField).toBeVisible();
  // "Sí" drops the "no se califica" reassurance; only the prompt to try remains.
  await expect(page.getByText(ATTEMPT_PROMPT, { exact: true })).toBeVisible();

  /**
   * "Sí" is a declaration, and the primary action holds the learner to it.
   * Offering "continuar sin escribir" right after they said they could write
   * the sentence prices the declaration at zero and collapses belief and
   * behaviour back into one measure. The disabled state is bounded on purpose:
   * the hint names the exit, and both gate buttons stay live, so changing your
   * mind is a recorded answer rather than a dead end.
   */
  await expect(emptyAction).toHaveCount(0);
  await expect(saveAction).toBeDisabled();
  await expect(page.getByText(BLOCKED_HINT, { exact: true })).toBeVisible();
  await expect(gateNo).toBeEnabled();
  await expect(gateYes).toBeEnabled();

  await attemptField.fill('Camila must have cleaned the board.');
  await expect(emptyAction).toHaveCount(0);
  await expect(saveAction).toBeEnabled();
  await expect(page.getByText(BLOCKED_HINT, { exact: true })).toHaveCount(0);

  // Whitespace is not an attempt, and the block has to survive it.
  await attemptField.fill('   ');
  await expect(saveAction).toBeDisabled();
  await attemptField.fill('Camila must have cleaned the board.');
  await expect(saveAction).toBeEnabled();

  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const actionBox = await page.getByRole('button', {
      name: 'Guardar y continuar',
      exact: true,
    }).boundingBox();
    expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0))
      .toBeLessThanOrEqual(viewport.height);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'celestea-v18-baseline-production-375.png');

  await page.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Observa las dos frases.', exact: true }))
    .toBeVisible();

  const baselineEvents = () => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta' && event.paso_id === 'precheck-production'
  );
  await expect.poll(() => baselineEvents().map((event) => event.result?.rama)).toEqual([
    'baseline_gate_no',
    'baseline_gate_yes',
    'baseline_produccion',
  ]);
  for (const event of baselineEvents()) {
    expect(event.result).toMatchObject({
      fase: 'pre_check',
      assisted: false,
      latencyMs: expect.any(Number),
      learningOpportunity: {
        id: 'baseline-modal-form',
        constructs: ['modal_form'],
        condition: 'independent',
        novelty: 'same_case',
        timing: 'immediate',
      },
    });
  }
  const attempt = baselineEvents().at(-1);
  expect(attempt?.result?.texto).toBe('Camila must have cleaned the board.');
  expect(attempt?.result?.baselineGate).toBe('yes');
  // Measurement, not grading: the raw sentence is kept for a human reader and
  // no branch is asserted.
  expect(attempt?.result?.correcto).toBe(false);
  expect(attempt?.result?.score).toBe(0);

  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.firstOutcomes['precheck-production'].text)
    .toBe('Camila must have cleaned the board.');
  // Believing you can write a sentence is not evidence that you can, so the
  // gate never enters the ledger.
  expect(state.evidenceLedger.filter(
    (observation: { id: string }) => observation.id === 'baseline-modal-form'
  )).toHaveLength(1);
});

test('skipping the baseline still records an interpretable signal', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 2);
  await page.goto('/crear');

  await page.getByRole('button', { name: 'Todavía no', exact: true }).click();
  // The empty state of the one primary action, not a competing secondary
  // control: skipping is a measured behaviour, so it advances the same way.
  await page.getByRole('button', {
    name: 'Continuar sin escribir',
    exact: true,
  }).click();
  await expect(page.getByRole('heading', { name: 'Observa las dos frases.', exact: true }))
    .toBeVisible();

  await expect.poll(() => telemetry.filter(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'precheck-production'
      && event.result?.rama === 'baseline_produccion_omitida'
  )).toHaveLength(1);
  const skipped = telemetry.find(
    (event) => event.result?.rama === 'baseline_produccion_omitida'
  );
  expect(skipped?.result?.texto).toBeUndefined();
  expect(skipped?.result?.baselineGate).toBe('no');
});

/**
 * The closing screen is the only thing the learner *receives* for having
 * written a baseline that served the study rather than them, and it is the last
 * impression of day 1 — the one that decides whether they come back on day 7.
 * When the baseline was skipped there is no arc to show, and the receipt still
 * has to read as a finished block rather than a truncated one.
 */
test('the closing receipt degrades to a complete block when the baseline was skipped', async ({ page }) => {
  await mockTelemetry(page);
  await page.addInitScript(({ lessonId, contentVersion }) => {
    const now = Date.now();
    const outcome = (branch: string, correct: boolean, score: number, text: string) => ({
      branch, correct, score, text, attempt: 1, confidence: 1, submittedAt: now,
    });
    const outcomes = {
      // Submitted empty: an interpretable signal, but nothing to compare.
      'precheck-production': outcome('baseline_produccion_omitida', false, 0, ''),
      'transfer-check-certainty': outcome('correcto', true, 1, 'Es posible'),
      'transfer-production': outcome('correcto', true, 2, 'Nora might have worked on the model.'),
    };
    localStorage.setItem(`celesta:crear:study:${lessonId}`, JSON.stringify({
      studyId: 'study-closure-no-baseline',
      lessonId,
      contentVersion,
      startedAt: now,
      updatedAt: now,
      phase: 'initial',
      stepIndex: 10,
      attempts: {},
      firstOutcomes: outcomes,
      latestOutcomes: outcomes,
      awaitingFeedback: {},
      assistance: {},
      evidenceLedger: [],
    }));
  }, { lessonId: LESSON_ID, contentVersion: CONTENT_VERSION });

  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/crear');

  const receipt = page.getByRole('region', { name: 'Lo que guardamos de hoy', exact: true });
  await expect(receipt).toBeVisible();
  await expect(receipt.getByRole('listitem')).toHaveCount(2);
  await expect(receipt).toContainText('Interpretación de las pistas');
  await expect(receipt).toContainText('Forma en inglés');
  // No arc, and no empty scaffolding left behind where it used to be.
  await expect(page.getByText('Al empezar escribiste', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Ahora escribiste', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Nora might have worked on the model.', { exact: true }))
    .toHaveCount(0);

  await capture(page, 'celestea-v19-closing-receipt-no-baseline-320.png');
  for (const viewport of [
    { width: 320, height: 812 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    const closeBox = await page.getByRole('button', {
      name: 'Terminar por hoy',
      exact: true,
    }).boundingBox();
    expect((closeBox?.y ?? 0) + (closeBox?.height ?? 0))
      .toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    )).toBeLessThanOrEqual(1);
  }
});

/**
 * The rule used to be explained twice: a flat paragraph under the heading, and
 * the labelled formula rail at the very bottom — the better explanation, placed
 * where the attention was already spent. One representation, moved to the top.
 */
test('prism states the structure once, above the forces, and fits 320×812', async ({ page }) => {
  await mockTelemetry(page);
  await seedStep(page, 4);
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/crear');

  await expect(page.getByRole('heading', {
    name: 'La forma cambia según la fuerza de la evidencia.',
    exact: true,
  })).toBeVisible();
  await expect(page.getByText('PERSONA + must', { exact: false })).toHaveCount(0);
  await expect(page.getByText('acción en participio', { exact: true })).toHaveCount(1);

  const rail = page.getByRole('group', {
    name: 'Partes de una deducción sobre el pasado',
    exact: true,
  });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('must have');

  // Structure first, then the three forces.
  const forces = page.locator('button[aria-pressed]');
  await expect(forces).toHaveCount(3);
  const railBox = await rail.boundingBox();
  const forcesBox = await forces.first().boundingBox();
  expect(railBox?.y ?? 0).toBeLessThan(forcesBox?.y ?? 0);

  // The swap is the mechanism, so the rail must follow every choice.
  await forces.nth(2).click();
  await expect(rail).toContainText("can't have");
  await expect(rail).not.toContainText('must have');

  await capture(page, 'celestea-v19-prism-320.png');
  const action = page.getByRole('button', { name: 'Continuar', exact: true });
  const actionBox = await action.boundingBox();
  expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0)).toBeLessThanOrEqual(812);
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  )).toBeLessThanOrEqual(1);
});

/**
 * A certainty question that never names the conclusion measures the wrong
 * thing: the learner has to guess the proposition first, and a wrong answer
 * can no longer be attributed. The proposition and the question must be on
 * screen together, at the narrowest width, without scrolling.
 *
 * On the production screens the proposition arrives as a **frame with the
 * certainty missing** — the same gap the practice map taught by drag-and-drop,
 * now in Spanish beside its English twin in the placeholder. The clue is not
 * repeated: it was read one screen earlier and re-printing it spent the space
 * the frame needs. There is no case breadcrumb to assert: it was removed, and
 * these tests now guard its absence so it does not creep back as chrome.
 */
for (const screen of [
  {
    index: 8,
    refId: 'transfer-check-certainty',
    question: '¿Qué tan seguro es que Nora haya sido quien trabajó en la maqueta?',
    caseLabel: 'Maqueta de la feria',
    caseStatus: 'Segundo caso: quién trabajó en la maqueta.',
  },
  {
    index: 9,
    refId: 'transfer-production',
    question: PRODUCTION_PROMPT,
    frame: NORA_FRAME,
    caseLabel: 'Maqueta de la feria',
    caseStatus: 'Segundo caso: quién trabajó en la maqueta.',
  },
  {
    index: 11,
    refId: 'retest-certainty',
    question: '¿Qué tan seguro es que Emi haya sido quien pintó el mural?',
    caseLabel: 'Mural de la entrada',
    caseStatus: 'Tercer caso: quién pintó el mural.',
  },
  {
    index: 12,
    refId: 'retest-production',
    question: PRODUCTION_PROMPT,
    frame: EMI_FRAME,
    caseLabel: 'Mural de la entrada',
    caseStatus: 'Tercer caso: quién pintó el mural.',
  },
]) {
  test(`${screen.refId} names its proposition without chrome at 320×812`, async ({ page }) => {
    await mockTelemetry(page);
    await seedStep(page, screen.index);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/crear');

    const question = page.getByText(screen.question, { exact: true });
    await expect(question).toBeVisible();

    const targets = [question];
    if (screen.frame) {
      const frame = page.getByText(screen.frame, { exact: true });
      await expect(frame).toBeVisible();
      targets.push(frame);
      // The gap is the point. A frame that states the certainty would hand
      // back the answer to the calibration step immediately before, which is
      // rendered with `revealFeedback: false` precisely so it stays unknown.
      for (const certainty of ['casi seguro', 'posible', 'descartado', 'imposible']) {
        await expect(page.getByText(certainty, { exact: false })).toHaveCount(0);
      }
      // The clue lives on the certainty screen, not here.
      await expect(page.getByText('stayed in the classroom', { exact: false }))
        .toHaveCount(0);
      await expect(page.getByText('stayed in the art workshop', { exact: false }))
        .toHaveCount(0);
    }

    // No breadcrumb chrome: neither half of the old rótulo is on screen.
    await expect(page.getByText(screen.caseLabel, { exact: true })).toHaveCount(0);
    await expect(page.getByText(screen.caseStatus, { exact: true })).toHaveCount(0);
    // The position bar is the only thing left beside the exit button.
    await expect(page.getByRole('progressbar')).toBeVisible();

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(812);
    }
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    )).toBeLessThanOrEqual(1);
  });
}

/**
 * `condition: "independent"` is the claim the whole evidence design rests on.
 * Asserting it in the JSON is not enough: the affordance must be absent from
 * the rendered page, on a step reached after the guide has been unlocked.
 */
for (const independentStep of [
  { index: 8, refId: 'transfer-check-certainty', heading: '¿Qué tan seguro es?' },
  { index: 9, refId: 'transfer-production', heading: 'Ahora dilo en inglés.' },
]) {
  test(`${independentStep.refId} exposes no guide affordance in the DOM`, async ({ page }) => {
    await mockTelemetry(page);
    await seedStep(page, independentStep.index);
    await page.goto('/crear');

    await expect(page.getByRole('heading', {
      name: independentStep.heading,
      exact: true,
    })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ayuda', exact: true })).toHaveCount(0);
    await expect(page.getByText('Guía', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('propagates classifier provenance and disagreement into telemetry', async ({ page }) => {
  const telemetry = await mockTelemetry(page);
  await seedStep(page, 9);
  // The pilot server runs the model; the test server cannot. Standing in for
  // the model lets the arbitration fields be verified end to end.
  await page.route('**/api/classify', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        rama: 'correcto',
        confianza: 0.91,
        source: 'model',
        localRama: 'misconcepcion_forma_general',
        localConfianza: 0.95,
        modelRama: 'correcto',
        modelConfianza: 0.91,
        agreed: false,
      }),
    });
  });
  await page.goto('/crear');

  await page.getByRole('textbox').fill('Nora might have worked on the model.');
  await page.getByRole('button', { name: 'Guardar mi frase', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Tu frase conserva la posibilidad',
    exact: true,
  })).toBeVisible();

  await expect.poll(() => telemetry.some(
    (event) => event.verbo === 'envio_respuesta'
      && event.paso_id === 'transfer-production'
      && event.result?.classifierSource === 'model'
      && event.result?.classifierAgreed === false
  )).toBe(true);
});

test('a day 7 link opens the retest even after local state is lost', async ({ page }) => {
  await mockTelemetry(page);
  await seedLockedRetest(page);
  await page.goto('/crear');
  await expect(page.getByRole('heading', {
    name: 'Volvemos en una semana.',
    exact: true,
  })).toBeVisible();

  await page.goto('/crear?retest=1');
  await expect(page.getByRole('heading', { name: 'Una semana después.', exact: true }))
    .toBeVisible();
  const state = await page.evaluate((lessonId) =>
    JSON.parse(localStorage.getItem(`celesta:crear:study:${lessonId}`) ?? '{}'),
  LESSON_ID);
  expect(state.phase).toBe('initial');
  expect(state.retestDueAt).toBeUndefined();
});

test('lesson 1.17.0 measures production before instruction and declares every guide contract', async () => {
  const lessonPath = path.join(process.cwd(), 'public/workshops', `${LESSON_ID}.json`);
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8')) as {
    version: string;
    content_version: string;
    audio_asset_version: string;
    metadata: { duracion_estimada_min: number };
    pasos: Array<{
      ref_id: string;
      opcion_multiple?: { pregunta: string };
      pregunta_abierta_validada?: { pregunta: string; placeholder?: string };
      crear?: {
        audio?: { text: string };
        baselineProduction?: Record<string, string>;
        caseArtifact?: { label: string; status: string };
        certaintyMap?: { artifact?: { kind: string }; statements: unknown[] };
        classifier?: {
          ramas: Array<{
            rama: string;
            prioridad?: number;
            match?: { allGroups?: string[][] };
          }>;
        };
        display?: { headline?: string; body?: string };
        formula?: Array<{ label: string }>;
        learningOpportunity?: { condition: string };
        precheck?: { items: unknown[]; options: unknown[] };
        evidencePresentation?: unknown;
        guideAvailable?: boolean;
        input?: string;
        responseParts?: unknown[];
      };
    }>;
  };
  const stepBy = (refId: string) => lesson.pasos.find((step) => step.ref_id === refId);

  expect(lesson.version).toBe('1.17.0');
  expect(lesson.content_version).toBe(CONTENT_VERSION);
  // Nothing was re-rendered in the voice layer, so both versions stay pinned
  // together. If they ever diverge, `audioAssetsReady` mutes every scene.
  expect(lesson.audio_asset_version).toBe(lesson.content_version);
  expect(lesson.metadata.duracion_estimada_min).toBe(5);
  expect(lesson.pasos.map((step) => step.ref_id)).toEqual([
    'arrival',
    'precheck',
    'precheck-production',
    'contrast',
    'prism',
    'guided-map',
    'transfer-bridge',
    'transfer',
    'transfer-check-certainty',
    'transfer-production',
    'close',
    'retest-certainty',
    'retest-production',
  ]);
  expect(lesson.pasos.map((step) => step.crear?.display?.headline))
    .not.toContain('Depende de qué tan seguro estás.');
  expect(lesson.pasos.find((step) => step.ref_id === 'precheck')?.crear?.precheck)
    .toMatchObject({
      items: expect.any(Array),
      options: expect.any(Array),
    });

  const baseline = lesson.pasos.find((step) => step.ref_id === 'precheck-production')?.crear;
  expect(baseline?.baselineProduction).toMatchObject({
    gatePrompt: GATE_PROMPT,
    gateYesLabel: 'Sí',
    gateNoLabel: 'Todavía no',
    attemptPrompt: ATTEMPT_PROMPT,
    emptySubmitLabel: 'Continuar sin escribir',
    submitLabel: 'Guardar y continuar',
  });
  // The empty submission is the same button, not a second control: the gate
  // measures belief and the empty submission measures behaviour, and two
  // near-identical negatives on one screen made the learner read them as one
  // question asked twice.
  expect(baseline?.baselineProduction).not.toHaveProperty('skipLabel');
  // It measures, it does not teach: no guide, no classifier, no feedback.
  expect(baseline?.guideAvailable).toBe(false);
  expect(baseline?.classifier).toBeUndefined();
  // The baseline case must not reappear anywhere else, or the pre-measure and
  // the lesson stop being independent.
  const camilaSteps = lesson.pasos.filter((step) =>
    JSON.stringify(step).toLowerCase().includes('camila')
  );
  expect(camilaSteps.map((step) => step.ref_id)).toEqual(['precheck-production']);

  // `guideAvailable` is a declared contract on every measured step, and a step
  // that claims independence can never expose the guide.
  for (const step of lesson.pasos) {
    if (!step.crear?.learningOpportunity) continue;
    expect(
      typeof step.crear.guideAvailable,
      `${step.ref_id} must declare guideAvailable`
    ).toBe('boolean');
    if (step.crear.learningOpportunity.condition === 'independent') {
      expect(step.crear.guideAvailable, `${step.ref_id} is independent`).toBe(false);
    }
  }

  for (const refId of ['transfer-production', 'retest-production']) {
    const ramas = lesson.pasos.find((step) => step.ref_id === refId)
      ?.crear?.classifier?.ramas ?? [];
    expect(ramas.map((rama) => rama.rama)).toEqual(expect.arrayContaining([
      'misconcepcion_forma_general',
      'significado_sin_forma',
    ]));
    // Intermediate priorities: more specific misconceptions still win, but a
    // near-miss can no longer fall through to `no_claro`.
    expect(ramas.find((rama) => rama.rama === 'misconcepcion_forma_general')?.prioridad)
      .toBe(70);
    expect(ramas.find((rama) => rama.rama === 'significado_sin_forma')?.prioridad)
      .toBe(60);
  }
  expect(lesson.pasos.some((step) => step.crear?.responseParts?.length)).toBe(false);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.certaintyMap)
    .toMatchObject({
      artifact: { kind: 'model' },
      statements: [
        {
          sentenceStart: 'Elena',
          sentenceEnd: 'worked on the model.',
          translationEs: expect.any(String),
          feedbackIncorrecto: expect.any(String),
        },
      ],
    });
  // Supported transfer stays at one statement on purpose: it models the idea on a
  // new case without repeating the three-way sort the learner already completed.
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.certaintyMap?.statements)
    .toHaveLength(1);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.evidencePresentation)
    .toBeUndefined();
  expect(lesson.pasos.find((step) => step.ref_id === 'guided-map')?.crear?.guideAvailable)
    .toBe(true);
  // The bridge audio was deliberately not re-rendered: the heading now *is* the
  // recording's own sentence, so screen and voice say the same thing for the
  // first time. Assert both together so the test cannot stay green while the
  // screen says something the recording does not.
  const bridge = lesson.pasos.find((step) => step.ref_id === 'transfer-bridge')?.crear;
  expect(bridge?.audio?.text).toContain('Ahora cambia el caso, no la idea');
  expect(bridge?.display?.headline).toBe('Cambia el caso, no la idea.');
  // Naming both objects is what makes the change of case legible; a numbered
  // list inside a paragraph was the part that truncated on a phone.
  expect(bridge?.display?.body).toBe(
    'Ya resolviste el cartel con ayuda. Ahora la maqueta de la feria, con menos apoyo.'
  );
  expect(bridge?.display?.body).not.toMatch(/\d\)/);
  expect(lesson.pasos.find((step) => step.ref_id === 'transfer')?.crear?.guideAvailable)
    .toBe(true);
  expect(lesson.pasos.find((step) => step.ref_id === 'retest-production')?.crear?.guideAvailable)
    .not.toBe(true);

  /**
   * The structural rule is stated once. It used to appear twice on `prism`: a
   * flat paragraph near the top and the labelled formula rail at the bottom.
   * Two representations of one rule double the extrinsic load and add nothing,
   * so the paragraph is gone and the rail — which segments the sentence — now
   * carries the participle wording it used to duplicate.
   */
  const prism = stepBy('prism')?.crear;
  expect(prism?.display?.body).toBe('');
  expect(prism?.formula?.map((part) => part.label)).toEqual([
    'quién',
    'fuerza de la evidencia + have',
    'acción en participio',
  ]);

  /**
   * The measured cell is `certainty_calibration` and then `modal_form`. Asking
   * "how sure can your conclusion be" without ever naming the conclusion adds a
   * guess-the-proposition task nobody wanted to measure, and makes a wrong
   * answer un-attributable between three different causes. Both Nora screens
   * and both Emi screens now state the proposition in Spanish.
   */
  for (const [refId, proposition] of [
    ['transfer-check-certainty', 'Nora haya sido quien trabajó en la maqueta'],
    ['transfer-production', 'Nora haya trabajado en la maqueta'],
    ['retest-certainty', 'Emi haya sido quien pintó el mural'],
    ['retest-production', 'Emi haya pintado el mural'],
  ] as const) {
    const step = stepBy(refId);
    const onScreen = [
      step?.opcion_multiple?.pregunta,
      step?.pregunta_abierta_validada?.pregunta,
      step?.crear?.display?.body,
    ].filter(Boolean).join(' ');
    expect(onScreen, `${refId} must name the proposition`).toContain(proposition);
  }

  /**
   * The certainty is the gap, and the gap must stay open. On both production
   * steps the frame carries an ellipsis where the modality goes and names no
   * certainty word, because the calibration step immediately before runs with
   * `revealFeedback: false` — printing "es posible" here would return the
   * answer the learner was never given.
   */
  for (const refId of ['transfer-production', 'retest-production'] as const) {
    const body = stepBy(refId)?.crear?.display?.body ?? '';
    expect(body, `${refId} must leave the certainty as a gap`).toContain('…');
    for (const certainty of ['casi seguro', 'posible', 'descartado', 'imposible']) {
      expect(body.toLowerCase(), `${refId} must not state the certainty`)
        .not.toContain(certainty);
    }
  }

  /**
   * Naming the proposition in Spanish removes a vocabulary hunt nobody is
   * measuring; it must not also hand over the answer. No participle this step
   * accepts may appear in anything the step shows on screen.
   */
  for (const refId of ['transfer-production', 'retest-production'] as const) {
    const step = stepBy(refId);
    const participles = step?.crear?.classifier?.ramas
      .find((rama) => rama.rama === 'correcto')?.match?.allGroups?.at(-1) ?? [];
    expect(participles.length).toBeGreaterThan(0);
    const onScreen = [
      step?.crear?.display?.headline,
      step?.crear?.display?.body,
      step?.pregunta_abierta_validada?.pregunta,
      step?.pregunta_abierta_validada?.placeholder,
      step?.crear?.caseArtifact?.label,
      step?.crear?.caseArtifact?.status,
    ].filter(Boolean).join(' ').toLowerCase();
    for (const participle of participles) {
      expect(onScreen, `${refId} shows the accepted participle "${participle}"`)
        .not.toMatch(new RegExp(`\\b${participle}\\b`));
    }
  }

  /**
   * The case changes three times on purpose — `novelty: "new_case"` is what
   * sustains the transfer claim. `transfer-bridge` is what narrates the change,
   * in Spanish and with audio; the JSON keeps the case status so `arrival` can
   * introduce it, but nothing renders it as persistent chrome any more.
   */
  for (const [refId, status] of [
    ['transfer-check-certainty', 'Segundo caso: quién trabajó en la maqueta.'],
    ['transfer-production', 'Segundo caso: quién trabajó en la maqueta.'],
    ['retest-certainty', 'Tercer caso: quién pintó el mural.'],
    ['retest-production', 'Tercer caso: quién pintó el mural.'],
  ] as const) {
    expect(stepBy(refId)?.crear?.caseArtifact?.status).toBe(status);
  }
  expect(stepBy('transfer-bridge')?.crear?.display?.headline)
    .toBe('Cambia el caso, no la idea.');
});

test('mobile map stays readable, tappable and motion-safe at 375px', async ({ page }) => {
  await mockTelemetry(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedStep(page, 5);
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
  const readableClueId = await activeId(page, 'certainty-map-question', 'data-statement-id');
  expect(await page.getByText(
    MAP_CLUES[readableClueId]!,
    { exact: true }
  ).evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px');

  const target = page.getByRole('button', {
    name: `Elegir ${MAP_TERMS[readableClueId]} para completar la frase`,
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
  await expect(page.getByTestId(`certainty-term-slot-${MAP_CATEGORIES[readableClueId]}`))
    .toHaveAttribute('data-vacant', 'true');
  await expect(page.getByLabel(
    `Espacio completado con ${MAP_TERMS[readableClueId]}. Toca para cambiarlo`,
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
  await seedStep(page, 5);
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
  await seedStep(page, 5);
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

/**
 * P2 · A construct nobody ever observes independently cannot back a claim, and
 * saying so has to be structural rather than remembered. The schema refuses the
 * ambiguous state, so this asserts the lesson actually sits in the declared one.
 */
test('every non-independent construct is declared non-evidentiary', async () => {
  const lessonPath = path.join(process.cwd(), 'public/workshops', `${LESSON_ID}.json`);
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8')) as {
    pasos: Array<{
      ref_id: string;
      crear?: {
        learningOpportunity?: {
          constructs: string[];
          condition: string;
          novelty: string;
          timing: string;
          evidentiary?: boolean;
        };
      };
    }>;
  };

  const authored = lesson.pasos
    .map((step, order) => ({ order, refId: step.ref_id, lo: step.crear?.learningOpportunity }))
    .filter((entry): entry is { order: number; refId: string; lo: NonNullable<typeof entry.lo> } =>
      Boolean(entry.lo));

  const constructs = Array.from(new Set(authored.flatMap((entry) => entry.lo.constructs)));
  expect(constructs.length).toBeGreaterThan(0);

  for (const construct of constructs) {
    const entries = authored.filter((entry) => entry.lo.constructs.includes(construct));
    const independent = entries.filter((entry) => entry.lo.condition === 'independent');

    if (independent.length === 0) {
      for (const entry of entries) {
        expect(
          entry.lo.evidentiary,
          `${entry.refId} measures ${construct}, which is never independent`
        ).toBe(false);
      }
      continue;
    }

    // P1 · The baseline must exist and must come first, which is what lets the
    // aggregation find it structurally instead of guessing from step names.
    const evidentiary = entries.filter((entry) => entry.lo.evidentiary !== false);
    const baselines = evidentiary.filter(
      (entry) =>
        entry.lo.condition === 'independent' &&
        entry.lo.novelty === 'same_case' &&
        entry.lo.timing === 'immediate'
    );
    expect(baselines, `${construct} needs one pre-instruction baseline`).toHaveLength(1);
    expect(
      Math.min(...evidentiary.map((entry) => entry.order)),
      `the ${construct} baseline must precede every other observation of it`
    ).toBe(baselines[0]!.order);
  }

  expect(
    lesson.pasos.find((step) => step.ref_id === 'contrast')?.crear?.learningOpportunity?.evidentiary
  ).toBe(false);
});

/**
 * P5 · The ledger is a log; a claim is a relation between rows of the same
 * construct. These are the transitions the pilot has to be able to tell apart —
 * above all "the lesson taught it" versus "they arrived already knowing it",
 * which is the entire reason the baseline exists.
 */
test('construct aggregation refuses claims the observations do not support', async () => {
  const { aggregateCrearConstructStates } =
    await import('../../src/lib/crear/constructState');

  let clock = 1_000;
  const observation = (overrides: Record<string, unknown> = {}) => ({
    id: 'lo',
    constructs: ['certainty_calibration'],
    condition: 'independent',
    novelty: 'same_case',
    timing: 'immediate',
    stepId: 'step',
    branch: 'correcto',
    correct: true,
    assisted: false,
    attempt: 1,
    recordedAt: (clock += 10),
    ...overrides,
  });
  const baseline = (o = {}) => observation(o);
  const supported = (o = {}) => observation({ condition: 'supported', ...o });
  const independent = (o = {}) => observation({ novelty: 'new_case', ...o });
  const delayed = (o = {}) => observation({ novelty: 'new_case', timing: 'delayed', ...o });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claimOf = (ledger: unknown[]) => aggregateCrearConstructStates(ledger as any)[0]?.claim;

  expect(claimOf([supported(), independent(), delayed()])).toBe('unproven');
  expect(claimOf([baseline({ correct: false }), supported()])).toBe('supported_only');
  expect(claimOf([baseline({ correct: false }), independent()])).toBe('independent_only');
  expect(claimOf([baseline({ correct: false }), independent(), delayed()])).toBe('durable');

  // Already correct before instruction: nothing after it is attributable.
  expect(claimOf([baseline(), independent(), delayed()])).toBe('preexisting');
  // `independent` that needed help is not independent, whatever the label says.
  expect(
    claimOf([baseline({ correct: false }), delayed({ assisted: true })])
  ).toBe('unproven');
  // Retry recovers the thread; it does not recover the measure.
  expect(
    claimOf([baseline({ correct: false }), independent({ correct: false }), independent({ attempt: 2 })])
  ).toBe('unproven');

  // Process rows stay in the ledger and out of every claim.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mixed = aggregateCrearConstructStates([
    observation({ constructs: ['evidence_comprehension'], condition: 'supported', evidentiary: false }),
    baseline({ correct: false, branch: 'confunde_certeza' }),
    independent(),
  ] as any);
  expect(mixed.map((state) => state.construct)).toEqual(['certainty_calibration']);
  expect(mixed[0]!.errorShapes).toEqual(['confunde_certeza']);
});
