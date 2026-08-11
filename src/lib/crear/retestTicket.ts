import { createHmac, timingSafeEqual } from 'node:crypto';

export const CREAR_RETEST_DELAY_MS = 168 * 60 * 60 * 1000;
export const CREAR_RETEST_TICKET_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CrearRetestTicketClaims {
  version: 1;
  classToken: string;
  participantCode: string;
  studyId: string;
  lessonId: string;
  issuedAt: number;
  notBefore: number;
  expiresAt: number;
}

export type CrearRetestTicketVerification =
  | { ok: true; claims: CrearRetestTicketClaims; eligible: boolean }
  | { ok: false; reason: 'malformed' | 'invalid_signature' | 'invalid_claims' | 'expired' };

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signature(secret: string, encodedPayload: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function validClaims(value: unknown): value is CrearRetestTicketClaims {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const claims = value as Record<string, unknown>;
  return (
    claims.version === 1
    && typeof claims.classToken === 'string'
    && claims.classToken.length > 0
    && claims.classToken.length <= 64
    && typeof claims.participantCode === 'string'
    && claims.participantCode.length > 0
    && claims.participantCode.length <= 64
    && typeof claims.studyId === 'string'
    && claims.studyId.length > 0
    && claims.studyId.length <= 128
    && typeof claims.lessonId === 'string'
    && claims.lessonId.length > 0
    && claims.lessonId.length <= 128
    && typeof claims.issuedAt === 'number'
    && Number.isFinite(claims.issuedAt)
    && typeof claims.notBefore === 'number'
    && Number.isFinite(claims.notBefore)
    && typeof claims.expiresAt === 'number'
    && Number.isFinite(claims.expiresAt)
    && claims.notBefore < claims.expiresAt
    // A ticket can be issued after the due date when D1 ingestion was delayed
    // or the learner returns on a recovered device. It still must be issued
    // inside the finite retest window.
    && claims.issuedAt < claims.expiresAt
  );
}

export function createCrearRetestTicket(
  secret: string,
  claims: CrearRetestTicketClaims
): string {
  if (secret.length < 32) throw new Error('retest_signing_secret_too_short');
  if (!validClaims(claims)) throw new Error('invalid_retest_ticket_claims');
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${signature(secret, payload)}`;
}

export function verifyCrearRetestTicket(
  secret: string,
  ticket: string,
  now = Date.now()
): CrearRetestTicketVerification {
  if (secret.length < 32) return { ok: false, reason: 'invalid_claims' };
  const [payload, supplied, extra] = ticket.split('.');
  if (!payload || !supplied || extra !== undefined) return { ok: false, reason: 'malformed' };

  const expected = signature(secret, payload);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length
    || !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return { ok: false, reason: 'invalid_signature' };
  }

  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!validClaims(claims)) return { ok: false, reason: 'invalid_claims' };
    if (now >= claims.expiresAt) return { ok: false, reason: 'expired' };
    return { ok: true, claims, eligible: now >= claims.notBefore };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}
