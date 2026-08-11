import { expect, test, type Page } from '@playwright/test';
import {
  FIRST_WRITE_WINS_UPSERT_OPTIONS,
  firstEventsByClientId,
  parseIngestPayload,
  prepareEventRowsForInsert,
  type IngestEvent,
  type JsonValue,
} from '../../src/lib/events/ingestPolicy';
import {
  checkRateLimit,
  getRateLimitStats,
  resetRateLimit,
} from '../../src/lib/rate-limit';

const FALLBACK_QUEUE_KEY = 'celesta:telemetry:fallback:v1';
const ARRIVAL_HEADING = 'El cartel cambió antes de la feria.';

// The lesson loader has its own IndexedDB fallback. Blocking the service worker
// keeps that test from passing through the independent CacheStorage layer.
test.use({ serviceWorkers: 'block' });

function event(overrides: Partial<IngestEvent> = {}): IngestEvent {
  const clientTimestamp = '2026-08-10T12:00:00.000Z';
  return {
    actor_sid: 'student-session-1',
    student_session_id: 'student-session-1',
    student_alias: 'P01',
    class_token: 'PILOT-1',
    taller_id: 'CREAR-ENGLISH-DEDUCTION-V1',
    paso_id: 'arrival',
    verbo: 'inicio_taller',
    ts: clientTimestamp,
    client_event_id: 'event-id-00000001',
    client_ts: clientTimestamp,
    ...overrides,
  };
}

async function fulfillIngest(page: Page): Promise<void> {
  await page.route('**/api/events/ingest', async (route) => {
    try {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ ok: true }),
      });
    } catch {
      // An unload beacon may outlive the page. Its body was already durable.
    }
  });
}

test('deduplicates a batch before insert and owns the immutable server timestamp', () => {
  const first = event();
  const retryWithMutatedData = event({
    paso_id: 'mutated-retry',
    ts: '2030-01-01T00:00:00.000Z',
    client_ts: '2030-01-01T00:00:00.000Z',
  });
  const parsed = parseIngestPayload(JSON.stringify({
    events: [first, retryWithMutatedData],
  }));

  expect(firstEventsByClientId(parsed.events)).toEqual([first]);

  const serverTimestamp = '2026-08-10T12:00:05.000Z';
  const rows = prepareEventRowsForInsert(parsed.events, serverTimestamp);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    client_event_id: first.client_event_id,
    paso_id: first.paso_id,
    ts: serverTimestamp,
    client_ts: first.client_ts,
  });
  expect(rows[0]!.ts).not.toBe(first.ts);
  expect(FIRST_WRITE_WINS_UPSERT_OPTIONS).toEqual({
    onConflict: 'client_event_id',
    ignoreDuplicates: true,
  });
});

test('rejects oversized, deep, and structurally unexpected ingest payloads', () => {
  const withUnexpectedField = {
    ...event(),
    internal_only: true,
  };
  expect(() => parseIngestPayload(JSON.stringify({ events: [withUnexpectedField] })))
    .toThrow();

  let deepResult: JsonValue = { value: true };
  for (let depth = 0; depth < 14; depth += 1) {
    deepResult = { next: deepResult };
  }
  expect(() => parseIngestPayload(JSON.stringify({
    events: [event({ result: deepResult })],
  }))).toThrow();

  expect(() => parseIngestPayload(JSON.stringify({
    events: [event({ result: 'x'.repeat(70 * 1024) })],
  }))).toThrow('payload_too_large');
});

test('shared in-memory rate limits expire and remain bounded', async () => {
  const expiryKey = `telemetry-test-expiry-${Date.now()}`;
  expect(checkRateLimit(expiryKey, 2, 10).allowed).toBe(true);
  expect(checkRateLimit(expiryKey, 2, 10).allowed).toBe(true);
  expect(checkRateLimit(expiryKey, 2, 10).allowed).toBe(false);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(checkRateLimit(expiryKey, 2, 10).allowed).toBe(true);
  resetRateLimit(expiryKey);

  const prefix = `telemetry-test-bounded-${Date.now()}-`;
  for (let index = 0; index < 10_050; index += 1) {
    checkRateLimit(`${prefix}${index}`, 1, 60_000);
  }
  expect(getRateLimitStats().totalBuckets).toBeLessThanOrEqual(10_000);
  for (let index = 0; index < 10_050; index += 1) {
    resetRateLimit(`${prefix}${index}`);
  }
});

test('sends directly when both durable browser stores are unavailable', async ({ page }) => {
  await page.addInitScript((fallbackKey) => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open() {
          throw new DOMException('IndexedDB blocked for test', 'SecurityError');
        },
      },
    });
    const nativeSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value(this: Storage, key: string, value: string) {
        if (key === fallbackKey) {
          throw new DOMException('localStorage blocked for test', 'QuotaExceededError');
        }
        return nativeSetItem.call(this, key, value);
      },
    });
  }, FALLBACK_QUEUE_KEY);

  const deliveredIds: string[] = [];
  await page.route('**/api/events/ingest', async (route) => {
    const raw = route.request().postData() ?? '';
    try {
      const payload = JSON.parse(raw) as {
        events?: Array<{ client_event_id?: unknown }>;
      };
      for (const entry of payload.events ?? []) {
        if (typeof entry.client_event_id === 'string') deliveredIds.push(entry.client_event_id);
      }
    } catch {
      // The assertion below requires at least one valid direct-send body.
    }
    try {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ ok: true }),
      });
    } catch {
      // The direct-send payload was already captured before an unload race.
    }
  });

  await page.goto('/crear?t=NO-STORAGE&a=Direct');
  await expect(page.getByRole('heading', { name: ARRIVAL_HEADING, exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();
  await expect.poll(() => deliveredIds.length, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), FALLBACK_QUEUE_KEY)).toBeNull();
});

test('loads online with IndexedDB blocked, queues locally, and retries after a network failure', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open() {
          throw new DOMException('IndexedDB blocked for test', 'SecurityError');
        },
      },
    });
  });

  let acceptIngest = false;
  const deliveredIds: string[] = [];
  await page.route('**/api/events/ingest', async (route) => {
    if (!acceptIngest) {
      await route.abort('failed');
      return;
    }
    const raw = route.request().postData() ?? '';
    try {
      const payload = JSON.parse(raw) as {
        events?: Array<{ client_event_id?: unknown }>;
      };
      for (const entry of payload.events ?? []) {
        if (typeof entry.client_event_id === 'string') deliveredIds.push(entry.client_event_id);
      }
    } catch {
      // The response below still exercises retry safety for malformed requests.
    }
    try {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ ok: true }),
      });
    } catch {
      // The page can disappear while its beacon is in flight.
    }
  });

  await page.goto('/crear?t=RESILIENCE&a=Offline');
  await expect(page.getByRole('heading', { name: ARRIVAL_HEADING, exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Ver la primera pista', exact: true }).click();

  await expect.poll(async () => page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  }, FALLBACK_QUEUE_KEY)).toBeGreaterThan(0);

  acceptIngest = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => deliveredIds.length, { timeout: 10_000 }).toBeGreaterThan(0);
  await expect.poll(async () => page.evaluate(
    (key) => localStorage.getItem(key),
    FALLBACK_QUEUE_KEY
  ), { timeout: 10_000 }).toBeNull();
});

test('returns a validated cached lesson when its network request fails', async ({ page }) => {
  await fulfillIngest(page);
  await page.goto('/crear?t=CACHE&a=Cached');
  await expect(page.getByRole('heading', { name: ARRIVAL_HEADING, exact: true }))
    .toBeVisible();

  let failedLessonRequests = 0;
  await page.route(/\/workshops\/CREAR-ENGLISH-DEDUCTION-V1\.json(?:\?.*)?$/, async (route) => {
    failedLessonRequests += 1;
    await route.abort('failed');
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: ARRIVAL_HEADING, exact: true }))
    .toBeVisible();
  expect(failedLessonRequests).toBeGreaterThan(0);
});

test('a failed lesson cache write does not invalidate a valid network lesson', async ({ page }) => {
  await page.addInitScript(() => {
    const nativePut = IDBObjectStore.prototype.put;
    Object.defineProperty(IDBObjectStore.prototype, 'put', {
      configurable: true,
      value(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        if (this.name === 'workshops') {
          throw new DOMException('Quota exhausted for test', 'QuotaExceededError');
        }
        return Reflect.apply(nativePut, this, [value, key]);
      },
    });
  });
  await fulfillIngest(page);

  const response = await page.goto('/crear?t=NO-CACHE&a=Online');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: ARRIVAL_HEADING, exact: true }))
    .toBeVisible();
});
