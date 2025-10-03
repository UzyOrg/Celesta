"use client";

import { useEffect, useState } from 'react';
import { lookupAliasServerAction } from '@/app/actions/alias';

const LOCAL_KEY = (token?: string) => `celesta:alias:${token || '__global__'}`;

export function getAliasFromLocalStorage(classToken?: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = LOCAL_KEY(classToken);
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setAliasInLocalStorage(classToken: string | undefined, alias: string | null) {
  if (typeof window === 'undefined') return;
  const key = LOCAL_KEY(classToken);
  try {
    if (alias === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, alias);
    }
  } catch {
    // ignore quota or privacy errors
  }
}

export function useCanonicalAlias(classToken?: string, studentSessionId?: string) {
  const [alias, setAlias] = useState<string | null>(() => getAliasFromLocalStorage(classToken));
  const [loading, setLoading] = useState<boolean>(!!classToken && !!studentSessionId);

  useEffect(() => {
    if (!classToken || !studentSessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    lookupAliasServerAction(classToken, studentSessionId)
      .then(({ alias: serverAlias, ok }) => {
        if (cancelled) return;
        const localAlias = getAliasFromLocalStorage(classToken);
        if (!ok) {
          // Fallback to local cache on failure
          setAlias(localAlias ?? null);
          return;
        }
        if (serverAlias) {
          if (serverAlias !== localAlias) {
            setAliasInLocalStorage(classToken, serverAlias);
          }
          setAlias(serverAlias);
        } else if (localAlias) {
          setAlias(localAlias);
        } else {
          setAlias(null);
          setAliasInLocalStorage(classToken, null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classToken, studentSessionId]);

  const updateAlias = (next: string | null) => {
    setAlias(next);
    setAliasInLocalStorage(classToken, next);
    if (classToken && studentSessionId && next && next.trim().length) {
      void persistAliasToServer(classToken, studentSessionId, next.trim());
    }
  };

  return { alias, setAlias: updateAlias, loading };
}

export async function persistAliasToServer(
  classToken: string,
  studentSessionId: string,
  alias: string
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/roster/set-alias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_token: classToken, student_session_id: studentSessionId, alias }),
    });
    if (!res.ok) {
      console.error('persistAliasToServer_failed', res.status);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('persistAliasToServer_error', (e as Error)?.message ?? e);
    return { ok: false };
  }
}
