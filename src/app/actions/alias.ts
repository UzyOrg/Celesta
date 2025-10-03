'use server';

import { headers } from 'next/headers';

const FALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';

async function resolveBaseUrl(): Promise<string | null> {
  try {
    const hdrs = await headers();
    const origin = hdrs.get('origin');
    if (origin && origin.trim().length > 0) return origin;
  } catch {
    // headers() may throw outside request scope
  }
  return FALLBACK_BASE_URL || null;
}

export async function lookupAliasServerAction(
  classToken: string,
  studentSessionId: string
): Promise<{ alias: string | null; ok: boolean }> {
  if (!classToken || !studentSessionId) return { alias: null, ok: false };
  const base = await resolveBaseUrl();
  if (!base) {
    console.error('lookupAliasServerAction_missing_origin');
    return { alias: null, ok: false };
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/roster/lookup-alias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_token: classToken, student_session_id: studentSessionId }),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('lookupAliasServerAction_http_error', res.status);
      return { alias: null, ok: false };
    }

    const json = (await res.json()) as { alias?: string | null };
    const alias = typeof json.alias === 'string' && json.alias.trim().length > 0 ? json.alias : null;
    return { alias, ok: true };
  } catch (e) {
    console.error('lookupAliasServerAction_exception', (e as Error)?.message ?? e);
    return { alias: null, ok: false };
  }
}
