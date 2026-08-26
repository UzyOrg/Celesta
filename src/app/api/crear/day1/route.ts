import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  readBoundedJson,
  RequestBodyTooLargeError,
} from '@/lib/server/boundedJson';
import { verifyCrearRetestTicket } from '@/lib/crear/retestTicket';

export const runtime = 'nodejs';
export const revalidate = 0;

const MAX_BODY_BYTES = 8 * 1024;
const MAX_TICKET_LENGTH = 4_096;

/**
 * Day 7 closes by showing the learner her own Day 1 sentence. That sentence
 * lived only in `localStorage`, so a learner returning on another phone, or
 * after clearing the browser, reached the closing screen with the Day 1 column
 * blank — the one column the screen is built around. Telemetry always has it.
 *
 * The study is taken from the verified ticket and never from the request, so a
 * caller can only ever read back the study its own signature already names.
 */
const BodySchema = z.object({
  ticket: z.string().min(1).max(MAX_TICKET_LENGTH),
}).strict();

/** Authored on the Day 1 independent steps; see the lesson JSON. */
const DAY_ONE_FORM = 'independent-transfer-form';
const DAY_ONE_CERTAINTY = 'independent-transfer-certainty';

interface EventRow {
  ts: string;
  result: Record<string, unknown> | null;
}

interface Attempt {
  text: string;
  rama: string | null;
  score: number | null;
  correcto: boolean;
  ts: string;
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function signingSecret(): string | null {
  const value = process.env.CREAR_RETEST_SIGNING_SECRET ?? '';
  return value.length >= 32 ? value : null;
}

function opportunityId(result: Record<string, unknown> | null): string | null {
  const opportunity = result?.learningOpportunity;
  if (!opportunity || typeof opportunity !== 'object') return null;
  const id = (opportunity as Record<string, unknown>).id;
  return typeof id === 'string' ? id : null;
}

/**
 * The last attempt is what the learner left standing, which is what the closing
 * screen quotes back. Rows arrive oldest first.
 */
function lastAttempt(rows: EventRow[], learningOpportunity: string): Attempt | null {
  let found: Attempt | null = null;
  for (const row of rows) {
    if (opportunityId(row.result) !== learningOpportunity) continue;
    const text = row.result?.texto;
    if (typeof text !== 'string' || text.trim().length === 0) continue;
    found = {
      text: text.trim(),
      rama: typeof row.result?.rama === 'string' ? row.result.rama : null,
      score: typeof row.result?.score === 'number' ? row.result.score : null,
      correcto: row.result?.correcto === true,
      ts: row.ts,
    };
  }
  return found;
}

export async function PUT(request: Request) {
  const secret = signingSecret();
  if (!secret) return noStoreJson({ error: 'server_misconfigured' }, 500);

  const clientIp = getClientIp(request);
  const { allowed } = checkRateLimit(`crear:day1:${clientIp}`, 40, 60_000);
  if (!allowed) return noStoreJson({ error: 'rate_limited' }, 429);

  let ticket: string;
  try {
    ticket = BodySchema.parse(await readBoundedJson(request, MAX_BODY_BYTES)).ticket;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return noStoreJson({ error: 'payload_too_large' }, 413);
    }
    return noStoreJson({ error: 'malformed' }, 403);
  }

  const verification = verifyCrearRetestTicket(secret, ticket, Date.now());
  if (!verification.ok) return noStoreJson({ error: verification.reason }, 403);
  const { studyId, lessonId } = verification.claims;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return noStoreJson({ error: 'server_misconfigured' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from('eventos_de_aprendizaje')
    .select('ts,result')
    .eq('taller_id', lessonId)
    .eq('verbo', 'envio_respuesta')
    .eq('result->>studyId', studyId)
    .order('ts', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[crear/day1] lookup failed', error.message);
    return noStoreJson({ error: 'day1_lookup_failed' }, 500);
  }

  const rows = (data ?? []) as EventRow[];
  return noStoreJson({
    studyId,
    production: lastAttempt(rows, DAY_ONE_FORM),
    certainty: lastAttempt(rows, DAY_ONE_CERTAINTY),
  });
}
