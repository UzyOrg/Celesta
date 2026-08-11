import { expect, test, type Page } from '@playwright/test';

/**
 * The pilot's only deliverable is the data. Every other suite asserts what the
 * learner sees; this one asserts what survives them — the events that actually
 * leave the browser, in the shape a third party has to be able to read.
 *
 * It plays all thirteen steps, day 1 and the retest, because the construct
 * projection is only complete once the delayed observations exist, and the last
 * measured step is exactly the one whose row was being dropped.
 */

const ATTEMPT_PROMPT = 'Inténtalo como puedas.';

interface CapturedEvent {
  verbo: string;
  paso_id: string;
  taller_id: string;
  class_token?: string;
  student_alias?: string;
  actor_sid: string;
  result?: Record<string, unknown>;
}

interface CapturedBatch {
  bytes: number;
  events: CapturedEvent[];
}

async function captureIngest(page: Page): Promise<{
  events: CapturedEvent[];
  batches: CapturedBatch[];
}> {
  const events: CapturedEvent[] = [];
  const batches: CapturedBatch[] = [];
  await page.route('**/api/events/ingest', async (route) => {
    const body = route.request().postData() ?? '';
    try {
      const payload = JSON.parse(body) as { events?: CapturedEvent[] };
      batches.push({ bytes: Buffer.byteLength(body, 'utf8'), events: payload.events ?? [] });
      events.push(...(payload.events ?? []));
    } catch {
      // Still a delivery attempt, just not one worth asserting on.
    }
    /**
     * The unload beacon fires while the page is being torn down, so this can
     * run against an already-orphaned request. Fulfilling it then throws, and
     * an unhandled throw leaves the worker waiting on a route that never
     * settles — a five-minute forced kill at the end of every run.
     */
    try {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ ok: true }),
      });
    } catch {
      // The page went away mid-flight; the payload was already recorded above.
    }
  });
  return { events, batches };
}

/** Items rotate per learner, so every step reads the one on screen. */
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

/** Plays every step to the end, including the day 7 retest. */
async function playWholeLesson(page: Page): Promise<void> {
  await page.goto('/crear?t=TEST-PILOT&a=P01');
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();

  // 1 · precheck — baseline certainty, before any instruction.
  let seenItem: string | undefined;
  for (let index = 0; index < 3; index += 1) {
    const itemId = await activeId(page, 'precheck-item', 'data-item-id', seenItem);
    seenItem = itemId;
    await page.getByRole('radio', { name: PRECHECK_ANSWERS[itemId]!, exact: true }).click();
    await page.getByRole('button', {
      name: index === 2 ? 'Ver la comparación' : 'Siguiente',
      exact: true,
    }).click();
  }

  // 2 · precheck-production — baseline form, still before instruction.
  await page.getByRole('button', { name: 'Sí', exact: true }).click();
  await page.getByLabel(ATTEMPT_PROMPT, { exact: true })
    .fill('Camila must have cleaned the board.');
  await page.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();

  // 3 · contrast — the non-evidentiary step.
  await page.getByRole('radio', {
    name: 'Es casi seguro que Valeria pintó el póster.',
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  // 4 · prism
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  // 5 · guided-map — supported, same case.
  let seenStatement: string | undefined;
  for (let index = 0; index < 3; index += 1) {
    const statementId = await activeId(
      page,
      'certainty-map-question',
      'data-statement-id',
      seenStatement
    );
    seenStatement = statementId;
    await page.getByRole('button', {
      name: `Elegir ${MAP_TERMS[statementId]} para completar la frase`,
      exact: true,
    }).click();
    if (index < 2) {
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();

  // 6 · transfer-bridge
  await page.getByRole('button', { name: 'Continuar al caso nuevo', exact: true }).click();

  // 7 · transfer — supported, new case. One statement only.
  const transferId = await activeId(page, 'certainty-map-question', 'data-statement-id');
  await page.getByRole('button', {
    name: `Elegir ${MAP_TERMS[transferId]} para completar la frase`,
    exact: true,
  }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();

  // 8 · transfer-check-certainty — independent, new case.
  await page.getByRole('radio', { name: 'Es posible', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar decisión', exact: true }).click();

  // 9 · transfer-production — independent form, new case.
  await page.getByRole('textbox').fill('Nora might have worked on the model.');
  await page.getByRole('button', { name: 'Guardar mi frase', exact: true }).click();
  // This step does reveal feedback, unlike the measured ones around it.
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  // 10 · close
  await page.getByRole('button', { name: 'Terminar por hoy', exact: true }).click();

  // 11 · retest-certainty — delayed. The gate is already open because the
  // Playwright server runs with NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS=0.
  await page.getByRole('radio', { name: 'Es posible', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar decisión', exact: true }).click();

  // 12 · retest-production — the last measured row, and the one that used to
  // be missing from the projection.
  await page.getByRole('textbox').fill('Emi might have painted the mural.');
  await page.getByRole('button', { name: 'Terminar revisión', exact: true }).click();
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();
}

test('a full run ships every measured step and a complete construct projection', async ({ page }) => {
  const captured = await captureIngest(page);
  await playWholeLesson(page);

  await expect.poll(
    () => captured.events.some((event) => event.verbo === 'taller_completado'),
    { message: 'the completion event never left the browser', timeout: 15_000 }
  ).toBe(true);

  const completion = captured.events.find((event) => event.verbo === 'taller_completado')!;
  const states = completion.result?.constructStates as
    | Array<{ construct: string; claim: string; delayed?: unknown; baseline?: unknown }>
    | undefined;

  // The projection must exist, or the ledger is a log nobody can read.
  expect(states, 'taller_completado carries no construct projection').toBeTruthy();
  const byConstruct = new Map(states!.map((state) => [state.construct, state]));

  // `evidence_comprehension` is declared non-evidentiary, so it must not appear.
  expect(Array.from(byConstruct.keys()).sort()).toEqual(['certainty_calibration', 'modal_form']);

  for (const [construct, state] of Array.from(byConstruct.entries())) {
    expect(state.baseline, `${construct} shipped without its baseline`).toBeTruthy();
    // The regression this suite exists for: the day 7 row used to be missing
    // because `advance` ran in the same tick as `persistAttempt`.
    expect(state.delayed, `${construct} shipped without its delayed observation`).toBeTruthy();
    expect(state.claim).not.toBe('unproven');
  }

  // Every batch has to fit under the ingest route's own 64KB ceiling.
  for (const batch of captured.batches) {
    expect(batch.bytes, 'a batch exceeded the ingest payload limit').toBeLessThan(64 * 1024);
  }

  const verbs = captured.events.map((event) => event.verbo);
  expect(verbs).toContain('inicio_taller');
  expect(verbs.filter((verb) => verb === 'envio_respuesta').length).toBeGreaterThanOrEqual(8);
  expect(verbs.filter((verb) => verb === 'taller_completado')).toHaveLength(1);
});

test('a returning learner does not re-report a study that already completed', async ({ page }) => {
  const captured = await captureIngest(page);
  await playWholeLesson(page);
  await expect.poll(
    () => captured.events.filter((event) => event.verbo === 'taller_completado').length,
    { timeout: 15_000 }
  ).toBe(1);

  // The learner comes back to look at the closing screen again. `phase` is
  // already `completed` in localStorage, so a guard that lives only in a React
  // ref would fire the event again on every single load.
  await page.reload();
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForTimeout(1500);

  expect(
    captured.events.filter((event) => event.verbo === 'taller_completado')
  ).toHaveLength(1);
});

/**
 * Every teacher-facing read of `eventos_de_aprendizaje` filters on
 * `class_token`, and Postgres never matches NULL. An entry link without a token
 * therefore writes rows that no product surface can retrieve — the pilot's data
 * would exist and be unreachable. See `docs/adr/0008`.
 */
test('an entry link with a class token attributes every event it produces', async ({ page }) => {
  const captured = await captureIngest(page);
  await page.goto('/crear?t=PILOTO-01');
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();

  let seen: string | undefined;
  for (let index = 0; index < 3; index += 1) {
    const itemId = await activeId(page, 'precheck-item', 'data-item-id', seen);
    seen = itemId;
    await page.getByRole('radio', { name: PRECHECK_ANSWERS[itemId]!, exact: true }).click();
    await page.getByRole('button', {
      name: index === 2 ? 'Ver la comparación' : 'Siguiente',
      exact: true,
    }).click();
  }

  await expect.poll(() => captured.events.length, { timeout: 15_000 }).toBeGreaterThan(2);
  expect(captured.events.every((event) => event.class_token === 'PILOTO-01')).toBe(true);
  expect(captured.events.map((event) => event.verbo)).toContain('inicio_taller');
});

/**
 * `class_token` says which cohort a row belongs to. Without an alias the pilot
 * can tell that somebody in the group produced the sentence and not who — which
 * is the whole point of a five-person study. `?a=` names them from the link.
 */
test('an entry link with a name attributes every event to that learner', async ({ page }) => {
  const captured = await captureIngest(page);
  await page.goto('/crear?t=PILOTO-01&a=Uziel');
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();

  await expect.poll(() => captured.events.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(captured.events.every((event) => event.student_alias === 'Uziel')).toBe(true);
  expect(captured.events.every((event) => event.class_token === 'PILOTO-01')).toBe(true);
});

/**
 * The learner types the bare URL, or follows a stale bookmark. The study has to
 * keep reporting under the identity it started with; re-reading the link on
 * every load would turn one person's evidence into two anonymous halves.
 */
test('a study keeps its token when the learner returns without one', async ({ page }) => {
  const captured = await captureIngest(page);
  await page.goto('/crear?t=PILOTO-01&a=Uziel');
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();
  await expect.poll(() => captured.events.length, { timeout: 15_000 }).toBeGreaterThan(0);

  const before = captured.events.length;
  await page.goto('/crear');
  // Every precheck item offers the same three certainty options, so this picks
  // a valid one whichever item the shuffle put first. Being right is irrelevant
  // here; what matters is who the resulting row is attributed to.
  await page.getByRole('radio', { name: 'Casi seguro', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();

  await expect.poll(() => captured.events.length, { timeout: 15_000 }).toBeGreaterThan(before);
  const after = captured.events.slice(before);
  expect(after.every((event) => event.class_token === 'PILOTO-01')).toBe(true);
  expect(after.every((event) => event.student_alias === 'Uziel')).toBe(true);
});

test('an open link still records, anonymously, instead of failing closed', async ({ page }) => {
  const captured = await captureIngest(page);
  await page.goto('/crear');
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();

  await expect.poll(() => captured.events.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(captured.events[0]!.class_token).toBeUndefined();
});
