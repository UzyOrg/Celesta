"use client";

export function getOrCreateSessionId(classToken?: string): string {
  if (typeof window === 'undefined') return 'server';
  const key = `celesta:sid:${classToken || '__global__'}`;
  try {
    let sid = localStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      localStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return `${classToken || 'global'}-${Math.random().toString(36).slice(2)}`;
  }
}
