"use client";

import { idbAdd, idbDelete, idbGetAllEntries } from '@/lib/idb';
import { getOrCreateSessionId } from '@/lib/session';
import { getAliasFromLocalStorage } from '@/lib/alias';

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export type LearningEvent = {
  actor_sid: string;
  student_session_id: string;
  student_alias?: string;
  class_token?: string;
  taller_id: string;
  paso_id: string;
  verbo:
    | 'inicio_taller'
    | 'envio_respuesta'
    | 'solicito_pista'
    | 'completo_paso'
    | 'taller_completado'
    | 'abandono_taller';
  result?: Json;
  /** Kept for wire compatibility; the ingest route owns the canonical DB `ts`. */
  ts: string;
  client_event_id: string;
  client_ts: string;
};

export type TrackEventResult =
  | { status: 'queued'; storage: 'indexeddb' | 'localstorage'; clientEventId: string }
  | { status: 'sent'; storage: 'network'; clientEventId: string }
  | {
      status: 'not_persisted';
      reason:
        | 'invalid_event'
        | 'storage_unavailable'
        | 'server_rejected'
        | 'network_unavailable';
      clientEventId: string;
    };

type BatchPostResult = 'ok' | 'drop' | 'retry';

export const TELEMETRY_FALLBACK_STORAGE_KEY = 'celesta:telemetry:fallback:v1';
const MAX_FALLBACK_EVENTS = 200;
const MAX_FALLBACK_BYTES = 512 * 1024;
const MAX_BATCH_BYTES = 60 * 1024;
const MAX_BATCH_ITEMS = 100;
const VALID_VERBS = new Set<LearningEvent['verbo']>([
  'inicio_taller',
  'envio_respuesta',
  'solicito_pista',
  'completo_paso',
  'taller_completado',
  'abandono_taller',
]);

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    nodes += 1;
    if (nodes > 4_000 || current.depth > 12) return false;
    if (current.value === null || typeof current.value === 'boolean') continue;
    if (typeof current.value === 'string') {
      if (current.value.length > 8_192) return false;
      continue;
    }
    if (typeof current.value === 'number') {
      if (!Number.isFinite(current.value)) return false;
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > 240) return false;
      for (const entry of current.value) {
        pending.push({ value: entry, depth: current.depth + 1 });
      }
      continue;
    }
    if (!isRecord(current.value)) return false;
    const entries = Object.entries(current.value);
    if (entries.length > 160) return false;
    for (const [key, entry] of entries) {
      if (key.length > 160) return false;
      pending.push({ value: entry, depth: current.depth + 1 });
    }
  }
  return true;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value));
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isLearningEvent(value: unknown): value is LearningEvent {
  if (!isRecord(value)) return false;
  return (
    boundedString(value.actor_sid, 256) &&
    boundedString(value.student_session_id, 256) &&
    (value.student_alias === undefined || boundedString(value.student_alias, 128)) &&
    (value.class_token === undefined || boundedString(value.class_token, 128)) &&
    boundedString(value.taller_id, 160) &&
    boundedString(value.paso_id, 160) &&
    typeof value.verbo === 'string' &&
    VALID_VERBS.has(value.verbo as LearningEvent['verbo']) &&
    (value.result === undefined || isJsonValue(value.result)) &&
    isIsoTimestamp(value.ts) &&
    boundedString(value.client_event_id, 160) &&
    value.client_event_id.length >= 8 &&
    isIsoTimestamp(value.client_ts)
  );
}

function normalizeLearningEvent(event: LearningEvent): LearningEvent | null {
  try {
    // Normalize to the exact JSON representation used on the wire. This strips
    // `undefined` object properties and rejects cycles/BigInt before a caller is
    // told the event is durable.
    const normalized: unknown = JSON.parse(JSON.stringify(event));
    if (!isLearningEvent(normalized)) return null;
    if (utf8Bytes(JSON.stringify({ events: [normalized] })) > MAX_BATCH_BYTES) return null;
    return normalized;
  } catch {
    return null;
  }
}

function browserIsOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine !== false;
}

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

function readFallbackQueue(): LearningEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TELEMETRY_FALLBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, LearningEvent>();
    for (const entry of parsed) {
      if (isLearningEvent(entry) && !unique.has(entry.client_event_id)) {
        unique.set(entry.client_event_id, entry);
      }
    }
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

function writeFallbackQueue(events: readonly LearningEvent[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (events.length === 0) {
      localStorage.removeItem(TELEMETRY_FALLBACK_STORAGE_KEY);
      return true;
    }
    if (events.length > MAX_FALLBACK_EVENTS || events.some((event) => !isLearningEvent(event))) {
      return false;
    }
    const serialized = JSON.stringify(events);
    if (utf8Bytes(serialized) > MAX_FALLBACK_BYTES) return false;
    localStorage.setItem(TELEMETRY_FALLBACK_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

function persistFallbackEvent(event: LearningEvent): boolean {
  const normalized = normalizeLearningEvent(event);
  if (!normalized) return false;
  const queued = readFallbackQueue();
  if (queued.some((candidate) => candidate.client_event_id === normalized.client_event_id)) {
    return true;
  }
  return writeFallbackQueue([...queued, normalized]);
}

let backoffMs = 1000;
const MAX_BACKOFF_MS = 60_000;
let flushScheduled = false;
let flushInFlight: Promise<void> | null = null;
let flushRequested = false;
let retryTimer: number | null = null;
let trackingInitialized = false;

function safelyStartFlush(): void {
  void flushEventQueue().catch(() => {
    // `flushEventQueue` is defensive itself. This final guard prevents a future
    // storage implementation from turning an event listener into an unhandled
    // rejection.
  });
}

function scheduleQueueFlush(): void {
  if (
    typeof window === 'undefined' ||
    flushScheduled ||
    retryTimer !== null ||
    !browserIsOnline()
  ) return;
  if (flushInFlight) {
    flushRequested = true;
    return;
  }
  flushScheduled = true;
  window.setTimeout(() => {
    flushScheduled = false;
    safelyStartFlush();
  }, 350);
}

function scheduleRetry(): void {
  if (typeof window === 'undefined' || retryTimer !== null || !browserIsOnline()) return;
  const delay = backoffMs;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    safelyStartFlush();
  }, delay);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

interface CollectedEvent {
  event: LearningEvent;
  idbKeys: IDBValidKey[];
}

async function collectQueuedEvents(): Promise<CollectedEvent[]> {
  let idbEntries: Array<{ key: IDBValidKey; value: LearningEvent }> = [];
  try {
    idbEntries = await idbGetAllEntries<LearningEvent>('events');
  } catch {
    // The localStorage fallback remains readable when IndexedDB is blocked.
  }

  const collected = new Map<string, CollectedEvent>();
  for (const entry of idbEntries) {
    if (!isLearningEvent(entry.value)) continue;
    const existing = collected.get(entry.value.client_event_id);
    if (existing) {
      existing.idbKeys.push(entry.key);
    } else {
      collected.set(entry.value.client_event_id, {
        event: entry.value,
        idbKeys: [entry.key],
      });
    }
  }

  for (const event of readFallbackQueue()) {
    const existing = collected.get(event.client_event_id);
    if (!existing) {
      collected.set(event.client_event_id, {
        event,
        idbKeys: [],
      });
    }
  }
  return Array.from(collected.values());
}

function chunkEvents(events: readonly LearningEvent[]): LearningEvent[][] {
  const chunks: LearningEvent[][] = [];
  let current: LearningEvent[] = [];

  for (const event of events) {
    const tentative = [...current, event];
    const bytes = utf8Bytes(JSON.stringify({ events: tentative }));
    if (bytes <= MAX_BATCH_BYTES && tentative.length <= MAX_BATCH_ITEMS) {
      current = tentative;
      continue;
    }
    if (current.length > 0) chunks.push(current);
    current = [event];
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

interface DeliveryResult {
  settledIds: Set<string>;
  retry: boolean;
}

async function deliverBatch(batch: LearningEvent[]): Promise<DeliveryResult> {
  const result = await postEventsBatch(batch);
  if (result === 'ok') {
    return {
      settledIds: new Set(batch.map((event) => event.client_event_id)),
      retry: false,
    };
  }
  if (result === 'retry') return { settledIds: new Set(), retry: true };

  // A permanent 4xx can be caused by one malformed legacy entry. Bisect so the
  // valid telemetry ships and only the poison event leaves the durable queue.
  if (batch.length > 1) {
    const midpoint = Math.ceil(batch.length / 2);
    const left = await deliverBatch(batch.slice(0, midpoint));
    if (left.retry) return left;
    const right = await deliverBatch(batch.slice(midpoint));
    return {
      settledIds: new Set([
        ...Array.from(left.settledIds),
        ...Array.from(right.settledIds),
      ]),
      retry: right.retry,
    };
  }

  const rejected = batch[0];
  if (rejected) {
    console.warn('telemetry_event_rejected', { clientEventId: rejected.client_event_id });
    return { settledIds: new Set([rejected.client_event_id]), retry: false };
  }
  return { settledIds: new Set(), retry: false };
}

async function removeSettledEvents(
  collected: readonly CollectedEvent[],
  settledIds: ReadonlySet<string>
): Promise<void> {
  const idbDeletes = collected
    .filter((entry) => settledIds.has(entry.event.client_event_id))
    .flatMap((entry) => entry.idbKeys)
    .map((key) => idbDelete('events', key));
  await Promise.allSettled(idbDeletes);

  const fallback = readFallbackQueue();
  if (fallback.some((event) => settledIds.has(event.client_event_id))) {
    // If this write fails the event remains and is safely re-sent: server-side
    // first-write-wins makes duplicates harmless.
    writeFallbackQueue(
      fallback.filter((event) => !settledIds.has(event.client_event_id))
    );
  }
}

async function flushEventQueueOnce(): Promise<void> {
  if (typeof window === 'undefined' || !browserIsOnline()) return;
  const collected = await collectQueuedEvents();
  if (collected.length === 0) return;

  let shouldRetry = false;
  const settledIds = new Set<string>();
  for (const batch of chunkEvents(collected.map((entry) => entry.event))) {
    const result = await deliverBatch(batch);
    result.settledIds.forEach((id) => settledIds.add(id));
    if (result.retry) {
      shouldRetry = true;
      break;
    }
  }

  if (settledIds.size > 0) await removeSettledEvents(collected, settledIds);
  if (shouldRetry) {
    scheduleRetry();
  } else {
    backoffMs = 1000;
  }
}

export function flushEventQueue(): Promise<void> {
  if (flushInFlight) {
    flushRequested = true;
    return flushInFlight;
  }

  flushInFlight = flushEventQueueOnce()
    .catch(() => {
      scheduleRetry();
    })
    .finally(() => {
      flushInFlight = null;
      if (flushRequested) {
        flushRequested = false;
        scheduleQueueFlush();
      }
    });
  return flushInFlight;
}

function makeClientEventId(sessionId: string, clientTimestamp: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20),
    ].join('-');
  }
  return `${sessionId}-${clientTimestamp}-${Math.random().toString(36).slice(2)}`;
}

export async function trackEvent(
  verbo: LearningEvent['verbo'],
  payload: {
    tallerId: string;
    pasoId: string;
    result?: Json;
    classToken?: string;
    sid?: string;
    checksum?: string;
    /** Stable id for milestones whose delivery may be retried across reloads. */
    clientEventId?: string;
  }
): Promise<TrackEventResult> {
  const sessionId = payload.sid ?? getOrCreateSessionId(payload.classToken);
  const clientTimestamp = new Date().toISOString();
  const clientEventId = boundedString(payload.clientEventId, 160) &&
    payload.clientEventId.length >= 8
    ? payload.clientEventId
    : makeClientEventId(sessionId, clientTimestamp);
  const alias = getAliasFromLocalStorage(payload.classToken);
  let result = payload.result;

  if (isRecord(payload.result) || alias || payload.checksum) {
    const base: Record<string, unknown> = isRecord(payload.result) ? { ...payload.result } : {};
    if (alias && base.alias == null) base.alias = alias;
    if (payload.checksum) base.checksum = payload.checksum;
    result = Object.keys(base).length > 0 ? base : payload.result;
  }

  const candidateEvent: LearningEvent = {
    actor_sid: sessionId,
    student_session_id: sessionId,
    ...(alias ? { student_alias: alias } : {}),
    ...(payload.classToken ? { class_token: payload.classToken } : {}),
    taller_id: payload.tallerId,
    paso_id: payload.pasoId,
    verbo,
    ...(result !== undefined ? { result } : {}),
    ts: clientTimestamp,
    client_event_id: clientEventId,
    client_ts: clientTimestamp,
  };
  const event = normalizeLearningEvent(candidateEvent);
  if (!event) {
    return { status: 'not_persisted', reason: 'invalid_event', clientEventId };
  }

  // Persist before networking so navigation never waits when either durable
  // browser store is available.
  try {
    await idbAdd('events', event);
    scheduleQueueFlush();
    return { status: 'queued', storage: 'indexeddb', clientEventId };
  } catch {
    if (persistFallbackEvent(event)) {
      scheduleQueueFlush();
      return { status: 'queued', storage: 'localstorage', clientEventId };
    }
  }

  // With no durable browser storage, a direct send is the last safe option. Its
  // outcome is returned explicitly so a critical caller can avoid claiming an
  // event was reported when it was not.
  if (!browserIsOnline()) {
    return { status: 'not_persisted', reason: 'storage_unavailable', clientEventId };
  }
  const direct = await postEventsBatch([event]);
  if (direct === 'ok') return { status: 'sent', storage: 'network', clientEventId };
  return {
    status: 'not_persisted',
    reason: direct === 'drop' ? 'server_rejected' : 'network_unavailable',
    clientEventId,
  };
}

const beaconed = new Set<string>();

async function beaconFlush(): Promise<void> {
  try {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.sendBeacon !== 'function'
    ) return;
    const collected = await collectQueuedEvents();
    const pending = collected
      .map((entry) => entry.event)
      .filter((event) => !beaconed.has(event.client_event_id));
    if (pending.length === 0) return;

    for (const batch of chunkEvents(pending)) {
      const payload = JSON.stringify({ events: batch });
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/events/ingest', blob)) {
        batch.forEach((event) => beaconed.add(event.client_event_id));
      }
    }
  } catch {
    // Unload delivery is best-effort. Durable queues stay intact for retry.
  }
}

function safelyBeacon(): void {
  void beaconFlush().catch(() => {
    // See beaconFlush: keep event listeners rejection-safe even after refactors.
  });
}

export function initTracking(): void {
  if (typeof window === 'undefined' || trackingInitialized) return;
  trackingInitialized = true;
  window.addEventListener('online', scheduleQueueFlush);
  window.addEventListener('pagehide', safelyBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') safelyBeacon();
  });
  scheduleQueueFlush();
}
