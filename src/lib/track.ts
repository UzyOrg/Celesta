"use client";
import { idbAdd, idbDelete, idbGetAllEntries } from '@/lib/idb';
import { getOrCreateSessionId } from '@/lib/session';
import { getAliasFromLocalStorage } from '@/lib/alias';

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export type LearningEvent = {
  actor_sid: string;
  student_session_id: string;
  student_alias?: string; // ✅ NUEVO: Alias del estudiante (único por class_token)
  class_token?: string;
  taller_id: string;
  paso_id: string; // e.g., `${paso_numero}` or a semantic id
  verbo: 'inicio_taller' | 'envio_respuesta' | 'solicito_pista' | 'completo_paso' | 'taller_completado' | 'abandono_taller';
  result?: Json;
  ts: string; // ISO
  client_event_id: string; // idempotencia
  client_ts: string; // ISO desde cliente
};

type BatchPostResult = 'ok' | 'drop' | 'retry';

async function postEventsBatch(events: LearningEvent[]): Promise<BatchPostResult> {
  try {
    const res = await fetch('/api/events/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    if (res.ok) return 'ok';
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      return 'drop';
    }
    return 'retry';
  } catch {
    return 'retry';
  }
}

let backoffMs = 1000;
const MAX_BACKOFF_MS = 60_000;
let flushScheduled = false;
let flushInFlight: Promise<void> | null = null;
let flushRequested = false;
let retryTimer: number | null = null;

function scheduleQueueFlush(): void {
  if (typeof window === 'undefined' || flushScheduled || retryTimer !== null || !navigator.onLine) return;
  if (flushInFlight) {
    flushRequested = true;
    return;
  }
  flushScheduled = true;
  window.setTimeout(() => {
    flushScheduled = false;
    void flushEventQueue();
  }, 350);
}

async function flushEventQueueOnce(): Promise<void> {
  if (typeof window === 'undefined') return;
  const entries = await idbGetAllEntries<LearningEvent>('events');
  const queued = entries.map((entry) => entry.value);
  if (queued.length === 0) return;
  if (!navigator.onLine) return;
  // Chunk by payload size (target < 64KB) and a sane max items per batch
  const MAX_BYTES = 60 * 1024; // 60KB margin under server 64KB limit
  const MAX_ITEMS = 100; // server allows up to 200, stay conservative

  const chunks: LearningEvent[][] = [];
  let curr: LearningEvent[] = [];
  let currSize = 0;
  for (let i = 0; i < queued.length; i++) {
    const e = queued[i]!;
    const tentative = [...curr, e];
    const tentativeSize = new Blob([JSON.stringify({ events: tentative })]).size;
    if (tentativeSize <= MAX_BYTES && tentative.length <= MAX_ITEMS) {
      curr = tentative;
      currSize = tentativeSize;
    } else {
      if (curr.length > 0) chunks.push(curr);
      curr = [e];
      currSize = new Blob([JSON.stringify({ events: curr })]).size;
    }
  }
  if (curr.length > 0) chunks.push(curr);

  async function deliverBatch(batch: LearningEvent[]): Promise<'ok' | 'retry'> {
    const result = await postEventsBatch(batch);
    if (result === 'ok') return 'ok';
    if (result === 'retry') return 'retry';

    // A permanent 4xx can be caused by one malformed event. Bisect the batch
    // so valid telemetry still ships and only the poison entry is discarded.
    if (batch.length > 1) {
      const midpoint = Math.ceil(batch.length / 2);
      const left = await deliverBatch(batch.slice(0, midpoint));
      if (left === 'retry') return 'retry';
      return deliverBatch(batch.slice(midpoint));
    }

    const rejectedEvent = batch[0];
    if (rejectedEvent) {
      await Promise.all(
        entries
          .filter((entry) => entry.value.client_event_id === rejectedEvent.client_event_id)
          .map((entry) => idbDelete('events', entry.key))
      );
    }
    return 'ok';
  }

  let shouldRetry = false;
  for (const batch of chunks) {
    if (await deliverBatch(batch) === 'retry') {
      shouldRetry = true;
      break;
    }
  }
  if (!shouldRetry) {
    await Promise.all(entries.map((entry) => idbDelete('events', entry.key)));
    backoffMs = 1000;
  } else {
    if (retryTimer !== null) return;
    const delay = backoffMs;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void flushEventQueue();
    }, delay);
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  }
}

export function flushEventQueue(): Promise<void> {
  if (flushInFlight) {
    flushRequested = true;
    return flushInFlight;
  }

  flushInFlight = flushEventQueueOnce().finally(() => {
    flushInFlight = null;
    if (flushRequested) {
      flushRequested = false;
      scheduleQueueFlush();
    }
  });
  return flushInFlight;
}

export async function trackEvent(
  verbo: LearningEvent['verbo'],
  payload: {
    tallerId: string;
    pasoId: string;
    result?: Json;
    classToken?: string;
    sid?: string;
    checksum?: string; // SHA-256 del JSON del taller
  }
): Promise<void> {
  const sessionId = payload.sid ?? getOrCreateSessionId(payload.classToken);
  const client_ts = new Date().toISOString();
  const client_event_id = crypto.getRandomValues
    ? (() => {
        // UUID v4
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
        return (
          hex.substring(0, 8) +
          '-' +
          hex.substring(8, 12) +
          '-' +
          hex.substring(12, 16) +
          '-' +
          hex.substring(16, 20) +
          '-' +
          hex.substring(20)
        );
      })()
    : `${sessionId}-${client_ts}-${Math.random().toString(36).slice(2)}`;
  const alias = getAliasFromLocalStorage(payload.classToken);
  
  const event: LearningEvent = {
    actor_sid: sessionId,
    student_session_id: sessionId,
    student_alias: alias || undefined, // ✅ Alias como columna separada
    class_token: payload.classToken,
    taller_id: payload.tallerId,
    paso_id: payload.pasoId,
    verbo,
    result: (() => {
      const base: any = payload.result && typeof payload.result === 'object' ? { ...(payload.result as any) } : {};
      // Seguir incluyendo alias en result por compatibilidad
      if (alias && base && typeof base === 'object' && base.alias == null) {
        base.alias = alias;
      }
      if (payload.checksum) {
        base.checksum = payload.checksum;
      }
      return Object.keys(base).length ? base : payload.result;
    })(),
    ts: new Date().toISOString(),
    client_event_id,
    client_ts,
  };

  // Persist first so navigation never waits on the network. The existing
  // idempotent client_event_id makes background retries safe.
  try {
    await idbAdd('events', event);
    scheduleQueueFlush();
  } catch {
    // IndexedDB can be unavailable in private/restricted contexts. Preserve
    // the previous direct-send fallback instead of dropping the event.
    if (navigator.onLine) {
      await postEventsBatch([event]);
    }
  }
}

/**
 * Last-chance delivery when the page goes away.
 *
 * Events are written to IndexedDB first and flushed 350ms later, so closing the
 * tab right after the final answer leaves them queued. They would ship on the
 * learner's next visit — except the last event of the study is `taller_completado`,
 * and after that there is no next visit. `sendBeacon` is the only transport the
 * browser guarantees during unload; a `fetch` here is cancelled with the page.
 *
 * The queue is not cleared on success: `sendBeacon` reports that the payload was
 * handed to the browser, never that the server accepted it. `client_event_id`
 * makes the duplicate harmless, and a dropped final event would not be.
 */
const beaconed = new Set<string>();

async function beaconFlush(): Promise<void> {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  const entries = await idbGetAllEntries<LearningEvent>('events');
  /**
   * Only what this page has not already beaconed. `visibilitychange` fires
   * every time the learner switches apps, and re-sending the whole queue on
   * each one turns a phone that gets backgrounded ten times into ten full
   * resends. The set is per page load, so a genuine unload after a reload
   * still re-sends — which is the safe direction.
   */
  const pending = entries
    .map((entry) => entry.value)
    .filter((event) => !beaconed.has(event.client_event_id));
  if (pending.length === 0) return;

  // Same 60KB ceiling the normal path uses; sendBeacon also caps the payload.
  const MAX_BYTES = 60 * 1024;
  const send = (batch: LearningEvent[]) => {
    if (batch.length === 0) return;
    if (navigator.sendBeacon('/api/events/ingest', JSON.stringify({ events: batch }))) {
      batch.forEach((event) => beaconed.add(event.client_event_id));
    }
  };

  let batch: LearningEvent[] = [];
  for (const event of pending) {
    const tentative = [...batch, event];
    if (new Blob([JSON.stringify({ events: tentative })]).size > MAX_BYTES) {
      send(batch);
      batch = [event];
    } else {
      batch = tentative;
    }
  }
  send(batch);
}

export function initTracking() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    scheduleQueueFlush();
  });
  /**
   * `pagehide` fires on tab close, navigation and backgrounding on iOS, where
   * `beforeunload` is unreliable. `visibilitychange` covers the phone being
   * locked or the app switched away — the ordinary way a classroom session
   * ends.
   */
  window.addEventListener('pagehide', () => {
    void beaconFlush();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void beaconFlush();
  });
  // Attempt flush on init
  scheduleQueueFlush();
}
