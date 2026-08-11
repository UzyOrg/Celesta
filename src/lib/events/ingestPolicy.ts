import { z } from 'zod';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_RESULT_DEPTH = 12;
const MAX_RESULT_NODES = 4_000;
const MAX_RESULT_KEYS = 160;
const MAX_RESULT_ARRAY_ITEMS = 240;
const MAX_RESULT_STRING_LENGTH = 8_192;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isBoundedJsonValue(value: unknown): value is JsonValue {
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;

  while (pending.length > 0) {
    const current = pending.pop()!;
    nodes += 1;
    if (nodes > MAX_RESULT_NODES || current.depth > MAX_RESULT_DEPTH) return false;

    if (current.value === null || typeof current.value === 'boolean') continue;
    if (typeof current.value === 'string') {
      if (current.value.length > MAX_RESULT_STRING_LENGTH) return false;
      continue;
    }
    if (typeof current.value === 'number') {
      if (!Number.isFinite(current.value)) return false;
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > MAX_RESULT_ARRAY_ITEMS) return false;
      for (const entry of current.value) {
        pending.push({ value: entry, depth: current.depth + 1 });
      }
      continue;
    }
    if (typeof current.value !== 'object') return false;

    const record = current.value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > MAX_RESULT_KEYS) return false;
    for (const key of keys) {
      if (key.length > 160) return false;
      pending.push({ value: record[key], depth: current.depth + 1 });
    }
  }

  return true;
}

const EventSchema = z.object({
  actor_sid: z.string().trim().min(1).max(256),
  student_session_id: z.string().trim().min(1).max(256).optional(),
  student_alias: z.string().trim().min(1).max(128).optional(),
  class_token: z.string().trim().min(1).max(128).optional(),
  taller_id: z.string().trim().min(1).max(160),
  paso_id: z.string().trim().min(1).max(160),
  verbo: z.enum([
    'inicio_taller',
    'envio_respuesta',
    'solicito_pista',
    'completo_paso',
    'taller_completado',
    'abandono_taller',
  ]),
  result: z.unknown().refine(isBoundedJsonValue, 'result must be bounded JSON').optional(),
  // Kept in the wire contract for older clients. The canonical `ts` column is
  // assigned by the ingest route, so a device clock cannot overwrite server time.
  ts: z.string().max(64).datetime(),
  client_event_id: z.string().trim().min(8).max(160),
  client_ts: z.string().max(64).datetime(),
}).strict();

const PayloadSchema = z.object({
  events: z.array(EventSchema).min(1).max(200),
}).strict();

export type IngestEvent = z.infer<typeof EventSchema>;

export interface LearningEventInsertRow {
  client_event_id: string;
  actor_sid: string;
  student_session_id: string;
  student_alias: string | null;
  class_token: string | null;
  taller_id: string;
  paso_id: string;
  verbo: IngestEvent['verbo'];
  result: JsonValue | null;
  /** Server-owned occurrence timestamp for the canonical event row. */
  ts: string;
  /** Device timestamp retained separately for offline ordering diagnostics. */
  client_ts: string;
}

/** PostgREST's `ON CONFLICT DO NOTHING` policy: retries never mutate row one. */
export const FIRST_WRITE_WINS_UPSERT_OPTIONS = {
  onConflict: 'client_event_id',
  ignoreDuplicates: true,
} as const;

export class PayloadTooLargeError extends Error {
  constructor() {
    super('payload_too_large');
    this.name = 'PayloadTooLargeError';
  }
}

export function parseIngestPayload(text: string): { events: IngestEvent[] } {
  if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD_BYTES) {
    throw new PayloadTooLargeError();
  }
  return PayloadSchema.parse(JSON.parse(text) as unknown);
}

export function firstEventsByClientId(events: readonly IngestEvent[]): IngestEvent[] {
  const unique = new Map<string, IngestEvent>();
  for (const event of events) {
    if (!unique.has(event.client_event_id)) unique.set(event.client_event_id, event);
  }
  return Array.from(unique.values());
}

export function prepareEventRowsForInsert(
  events: readonly IngestEvent[],
  serverTimestamp: string
): LearningEventInsertRow[] {
  return firstEventsByClientId(events).map((event) => ({
    client_event_id: event.client_event_id,
    actor_sid: event.actor_sid,
    student_session_id: event.student_session_id ?? event.actor_sid,
    student_alias: event.student_alias ?? null,
    class_token: event.class_token ?? null,
    taller_id: event.taller_id,
    paso_id: event.paso_id,
    verbo: event.verbo,
    result: (event.result as JsonValue | undefined) ?? null,
    // The route inserts with ON CONFLICT DO NOTHING, so this first server-owned
    // timestamp remains immutable when a client retries the same event.
    ts: serverTimestamp,
    client_ts: event.client_ts,
  }));
}
