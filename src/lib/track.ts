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
  verbo: 'inicio_taller' | 'envio_respuesta' | 'solicito_pista' | 'completo_paso' | 'taller_completado' | 'abandono_taller' | 'telemetria_crisol';
  result?: Json;
  ts: string; // ISO
  client_event_id: string; // idempotencia
  client_ts: string; // ISO desde cliente
};

async function postEventsBatch(events: LearningEvent[]): Promise<boolean> {
  try {
    const res = await fetch('/api/events/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    return res.ok;
  } catch {
    return false;
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

  let allOk = true;
  for (const batch of chunks) {
    const ok = await postEventsBatch(batch);
    if (!ok) {
      allOk = false;
      break;
    }
  }
  if (allOk) {
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

export function initTracking() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    scheduleQueueFlush();
  });
  // Attempt flush on init
  scheduleQueueFlush();
}
