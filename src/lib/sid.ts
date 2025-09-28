export async function getSID(): Promise<string> {
  if (typeof window === 'undefined') throw new Error('SID only available client-side');
  const { idbGet, idbPut } = await import('./idb');
  const existing = await idbGet<string>('meta', 'sid');
  if (existing) return existing;
  const sid = crypto.randomUUID();
  await idbPut('meta', 'sid', sid);
  return sid;
}
