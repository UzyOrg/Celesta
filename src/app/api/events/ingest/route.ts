import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EventSchema = z.object({
  actor_sid: z.string().min(1),
  student_session_id: z.string().min(1).optional(),
  class_token: z.string().min(1).optional(),
  taller_id: z.string().min(1),
  paso_id: z.string().min(1),
  verbo: z.enum(['inicio_taller', 'envio_respuesta', 'solicito_pista', 'completo_paso', 'taller_completado', 'abandono_taller']),
  result: z.any().optional(),
  ts: z.string().datetime(),
  client_event_id: z.string().min(8),
  client_ts: z.string().datetime(),
});

const PayloadSchema = z.object({
  events: z.array(EventSchema).min(1).max(200),
});

// In-memory rate limits
const rlIp = new Map<string, { count: number; reset: number }>();
const rlIpClass = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000; // 60s
const LIMIT_IP = 240; // per 60s per ip
const LIMIT_IP_CLASS = 120; // per 60s per (ip,class_token)

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // rate limit per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now();
    const bucket = rlIp.get(ip);
    if (!bucket || now > bucket.reset) {
      rlIp.set(ip, { count: 1, reset: now + WINDOW_MS });
    } else {
      if (bucket.count >= LIMIT_IP) {
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
      }
      bucket.count += 1;
      rlIp.set(ip, bucket);
    }

    // Enforce payload size limit (~64KB) to accommodate modest batches
    const text = await req.text();
    if (text.length > 64 * 1024) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }
    const json = JSON.parse(text);
    const { events } = PayloadSchema.parse(json);

    // Additional rate limit per (ip, class_token)
    const tokens = new Set<string>();
    for (let i = 0; i < events.length; i++) {
      const t = (events[i] as any)?.class_token;
      if (typeof t === 'string' && t.trim().length > 0) tokens.add(t);
    }
    const now2 = Date.now();
    // First pass: check
    let limited = false;
    tokens.forEach((t) => {
      const key = `${ip}|${t}`;
      const bucket2 = rlIpClass.get(key);
      if (bucket2 && now2 <= bucket2.reset && bucket2.count >= LIMIT_IP_CLASS) {
        limited = true;
      }
    });
    if (limited) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    // Second pass: update
    tokens.forEach((t) => {
      const key = `${ip}|${t}`;
      const bucket2 = rlIpClass.get(key);
      if (!bucket2 || now2 > bucket2.reset) {
        rlIpClass.set(key, { count: 1, reset: now2 + WINDOW_MS });
      } else {
        bucket2.count += 1;
        rlIpClass.set(key, bucket2);
      }
    });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Prefer canonical table with idempotency
    const { error } = await supabase
      .from('eventos_de_aprendizaje')
      .upsert(
        events.map((e) => ({
          client_event_id: e.client_event_id,
          actor_sid: e.actor_sid,
          student_session_id: e.student_session_id ?? e.actor_sid,
          class_token: e.class_token ?? null,
          taller_id: e.taller_id,
          paso_id: e.paso_id,
          verbo: e.verbo,
          result: e.result ?? null,
          ts: e.ts,
          client_ts: e.client_ts,
        })),
        { onConflict: 'client_event_id' }
      );

    if (error) {
      console.error('ingest_upsert_error', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // PR-1.5: Upsert alias to alias_sessions if present in any event.result
    try {
      const aliasMap = new Map<string, { class_token: string; student_session_id: string; alias: string; last_seen: string }>();
      for (let i = 0; i < events.length; i++) {
        const e = events[i]!;
        const alias = (e as any)?.result?.alias;
        const class_token = e.class_token ?? null;
        const sid = e.student_session_id ?? e.actor_sid;
        if (alias && typeof alias === 'string' && class_token) {
          const key = `${class_token}|${sid}`;
          aliasMap.set(key, {
            class_token,
            student_session_id: sid,
            alias,
            last_seen: new Date().toISOString(),
          });
        }
      }
      if (aliasMap.size > 0) {
        const aliasRows = Array.from(aliasMap.values());
        const { error: aliasErr } = await supabase
          .from('alias_sessions')
          .upsert(aliasRows, { onConflict: 'class_token,student_session_id' });
        if (aliasErr) {
          // Do not fail ingestion if alias upsert fails; just log server-side
          console.error('alias_upsert_failed', aliasErr.message);
        }
      }
    } catch (e) {
      console.error('alias_upsert_unexpected', (e as any)?.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'unexpected', message: e?.message }, { status: 500 });
  }
}

