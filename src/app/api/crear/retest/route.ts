import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  readBoundedJson,
  RequestBodyTooLargeError,
} from '@/lib/server/boundedJson';
import {
  CREAR_RETEST_DELAY_MS,
  CREAR_RETEST_TICKET_TTL_MS,
  createCrearRetestTicket,
  verifyCrearRetestTicket,
} from '@/lib/crear/retestTicket';

export const runtime = 'nodejs';
export const revalidate = 0;
const RETEST_MAX_BODY_BYTES = 8 * 1024;
const RETEST_MAX_TICKET_LENGTH = 4_096;

const IssueSchema = z.object({
  classToken: z.string().min(1).max(64),
  participantCode: z.string().min(1).max(64),
  studyId: z.string().min(1).max(128),
  lessonId: z.string().min(1).max(128),
}).strict();

const ValidateSchema = z.object({
  ticket: z.string().min(1).max(RETEST_MAX_TICKET_LENGTH),
}).strict();

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function signingSecret(): string | null {
  const value = process.env.CREAR_RETEST_SIGNING_SECRET ?? '';
  return value.length >= 32 ? value : null;
}

function serverDelayMs(): number {
  if (process.env.CREAR_RETEST_TEST_MODE !== '1') return CREAR_RETEST_DELAY_MS;
  const hours = Number(process.env.CREAR_RETEST_DELAY_HOURS ?? 0);
  return Number.isFinite(hours) && hours >= 0 ? hours * 60 * 60 * 1000 : 0;
}

function validateTicket(secret: string, ticket: string) {
  if (ticket.length > RETEST_MAX_TICKET_LENGTH) {
    return noStoreJson({ error: 'malformed' }, 403);
  }
  const verification = verifyCrearRetestTicket(secret, ticket, Date.now());
  if (!verification.ok) return noStoreJson({ error: verification.reason }, 403);

  return noStoreJson({
    eligible: verification.eligible,
    classToken: verification.claims.classToken,
    participantCode: verification.claims.participantCode,
    studyId: verification.claims.studyId,
    lessonId: verification.claims.lessonId,
    notBefore: verification.claims.notBefore,
    expiresAt: verification.claims.expiresAt,
    serverNow: Date.now(),
  });
}

/** Compatibility for links already distributed with `?rt=`. New clients use PUT. */
export async function GET(request: Request) {
  const secret = signingSecret();
  if (!secret) return noStoreJson({ error: 'server_misconfigured' }, 500);
  const ticket = new URL(request.url).searchParams.get('ticket') ?? '';
  return validateTicket(secret, ticket);
}

/** Validate a bearer ticket without placing it in request URLs or server logs. */
export async function PUT(request: Request) {
  const secret = signingSecret();
  if (!secret) return noStoreJson({ error: 'server_misconfigured' }, 500);
  const clientIp = getClientIp(request);
  const { allowed } = checkRateLimit(`crear:retest:validate:${clientIp}`, 40, 60_000);
  if (!allowed) return noStoreJson({ error: 'rate_limited' }, 429);

  try {
    const parsed = ValidateSchema.parse(
      await readBoundedJson(request, RETEST_MAX_BODY_BYTES)
    );
    return validateTicket(secret, parsed.ticket);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return noStoreJson({ error: 'payload_too_large' }, 413);
    }
    return noStoreJson({ error: 'malformed' }, 403);
  }
}

export async function POST(request: Request) {
  const secret = signingSecret();
  if (!secret) return noStoreJson({ error: 'server_misconfigured' }, 500);
  const clientIp = getClientIp(request);
  const { allowed } = checkRateLimit(`crear:retest:${clientIp}`, 20, 60_000);
  if (!allowed) return noStoreJson({ error: 'rate_limited' }, 429);

  let parsed: z.infer<typeof IssueSchema>;
  try {
    parsed = IssueSchema.parse(await readBoundedJson(request, RETEST_MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return noStoreJson({ error: 'payload_too_large' }, 413);
    }
    return noStoreJson({ error: 'invalid_request' }, 400);
  }

  let completedAt: number | null = null;
  if (process.env.CREAR_RETEST_TEST_MODE === '1') {
    completedAt = Date.now();
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return noStoreJson({ error: 'server_misconfigured' }, 500);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from('eventos_de_aprendizaje')
      .select('ts')
      .eq('class_token', parsed.classToken)
      .eq('student_alias', parsed.participantCode)
      .eq('taller_id', parsed.lessonId)
      .eq('verbo', 'completo_paso')
      .eq('result->>studyId', parsed.studyId)
      .eq('result->>milestone', 'day1_complete')
      .order('ts', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[crear/retest] milestone lookup failed', error.message);
      return noStoreJson({ error: 'milestone_lookup_failed' }, 500);
    }
    completedAt = data?.ts ? Date.parse(data.ts) : null;
  }

  if (completedAt === null || !Number.isFinite(completedAt)) {
    return noStoreJson({ error: 'day1_not_completed' }, 403);
  }

  const issuedAt = Date.now();
  const notBefore = completedAt + serverDelayMs();
  const expiresAt = notBefore + CREAR_RETEST_TICKET_TTL_MS;
  if (issuedAt >= expiresAt) {
    return noStoreJson({ error: 'retest_window_expired' }, 410);
  }
  const ticket = createCrearRetestTicket(secret, {
    version: 1,
    classToken: parsed.classToken,
    participantCode: parsed.participantCode,
    studyId: parsed.studyId,
    lessonId: parsed.lessonId,
    issuedAt,
    notBefore,
    expiresAt,
  });

  return noStoreJson({
    ticket,
    eligible: issuedAt >= notBefore,
    notBefore,
    expiresAt,
    retestPath: `/crear#rt=${encodeURIComponent(ticket)}`,
    serverNow: Date.now(),
  });
}
