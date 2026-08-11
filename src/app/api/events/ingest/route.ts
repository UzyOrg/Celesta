import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, type RateLimitResult } from '@/lib/rate-limit';
import {
  PayloadTooLargeError,
  FIRST_WRITE_WINS_UPSERT_OPTIONS,
  firstEventsByClientId,
  parseIngestPayload,
  prepareEventRowsForInsert,
  type IngestEvent,
  type JsonValue,
} from '@/lib/events/ingestPolicy';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_DISTINCT_CLASS_TOKENS = 16;
const WINDOW_MS = 60_000;
const LIMIT_IP = 240;
const LIMIT_IP_CLASS = 120;

function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'rate_limited' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
      },
    }
  );
}

function resultAlias(event: IngestEvent): string | null {
  if (event.student_alias) return event.student_alias;
  if (!event.result || typeof event.result !== 'object' || Array.isArray(event.result)) return null;
  const alias = (event.result as Record<string, JsonValue>).alias;
  return typeof alias === 'string' && alias.trim().length > 0 && alias.length <= 128
    ? alias.trim()
    : null;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipRateLimit = checkRateLimit(`events:ingest:ip:${ip}`, LIMIT_IP, WINDOW_MS);
  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  try {
    const { events } = parseIngestPayload(await req.text());
    const uniqueEvents = firstEventsByClientId(events);
    const tokens = Array.from(new Set(
      uniqueEvents.flatMap((event) => event.class_token ? [event.class_token] : [])
    ));
    if (tokens.length > MAX_DISTINCT_CLASS_TOKENS) {
      return NextResponse.json({ error: 'too_many_class_tokens' }, { status: 400 });
    }

    for (const token of tokens) {
      const tokenRateLimit = checkRateLimit(
        `events:ingest:ip-class:${ip}:${token}`,
        LIMIT_IP_CLASS,
        WINDOW_MS
      );
      if (!tokenRateLimit.allowed) return rateLimitResponse(tokenRateLimit);
    }

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const rows = prepareEventRowsForInsert(uniqueEvents, new Date().toISOString());

    /**
     * `ignoreDuplicates` maps to `ON CONFLICT DO NOTHING`: a retry is a true
     * no-op. A normal upsert updated `ts` and could rewrite the first event with
     * a later client payload, destroying the chronology idempotency is meant to
     * protect.
     */
    const { data: insertedRows, error } = await supabase
      .from('eventos_de_aprendizaje')
      .upsert(rows, FIRST_WRITE_WINS_UPSERT_OPTIONS)
      .select('client_event_id');

    if (error) {
      console.error('ingest_insert_failed', { code: error.code });
      return NextResponse.json({ error: 'ingest_unavailable' }, { status: 503 });
    }

    // A duplicate event must have no secondary side effects either. PostgREST
    // returns only rows inserted by DO NOTHING, so alias last_seen advances only
    // for a genuinely new learning event.
    const insertedIds = new Set(
      (insertedRows ?? []).flatMap((row) =>
        typeof row?.client_event_id === 'string' ? [row.client_event_id] : []
      )
    );

    try {
      const aliasMap = new Map<
        string,
        { class_token: string; student_session_id: string; alias: string; last_seen: string }
      >();
      const lastSeen = new Date().toISOString();
      for (const event of uniqueEvents) {
        if (!insertedIds.has(event.client_event_id) || !event.class_token) continue;
        const alias = resultAlias(event);
        if (!alias) continue;
        const studentSessionId = event.student_session_id ?? event.actor_sid;
        aliasMap.set(`${event.class_token}|${studentSessionId}`, {
          class_token: event.class_token,
          student_session_id: studentSessionId,
          alias,
          last_seen: lastSeen,
        });
      }

      if (aliasMap.size > 0) {
        const { error: aliasError } = await supabase
          .from('alias_sessions')
          .upsert(Array.from(aliasMap.values()), {
            onConflict: 'class_token,student_session_id',
          });
        if (aliasError) console.error('alias_upsert_failed', { code: aliasError.code });
      }
    } catch (aliasError) {
      console.error('alias_upsert_unexpected', {
        name: aliasError instanceof Error ? aliasError.name : 'unknown',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    console.error('ingest_unexpected', {
      name: error instanceof Error ? error.name : 'unknown',
    });
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
