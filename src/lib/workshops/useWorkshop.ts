"use client";
import { useEffect, useState } from 'react';
import { idbGet, idbPut } from '@/lib/idb';
import { validateWorkshopJson, Workshop } from './schema';

export function useWorkshop(id: string) {
  const [data, setData] = useState<Workshop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const normalizeId = (raw: string) => raw.replace(/\.json$/i, '');
    const normalizedId = normalizeId(id);
    async function sha256Hex(text: string): Promise<string | null> {
      try {
        if (!('crypto' in window) || !('subtle' in window.crypto)) return null;
        const enc = new TextEncoder();
        const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(text));
        const arr = Array.from(new Uint8Array(buf));
        return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {
        return null;
      }
    }
    async function load() {
      setLoading(true);
      setError(null);
      const cacheKey = `workshop:${normalizedId}`;
      // Leer posible caché previa
      const cached = await idbGet<Workshop>('workshops', cacheKey);
      // Determinar content_version desde index.json, con fallback a caché o 'dev'
      let cv = cached?.content_version ?? 'dev';
      try {
        const idxRes = await fetch('/workshops/index.json', { cache: 'no-store' });
        if (idxRes.ok) {
          const list = await idxRes.json();
          if (Array.isArray(list)) {
            const entry = list.find((w: any) => w && (w.id_taller === normalizedId || w.id === normalizedId));
            if (entry?.content_version) cv = String(entry.content_version);
          }
        }
      } catch {
        // Ignorar y usar fallback de caché
      }
      const url = `/workshops/${normalizedId}.json?v=${encodeURIComponent(cv)}`;

      // Try network first (con versión), luego fallback a caché
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Network ${res.status}`);
        const text = await res.text();
        const hash = await sha256Hex(text);
        const json = JSON.parse(text);
        if (hash && !json.checksum) json.checksum = hash;
        const valid = validateWorkshopJson(json);
        await idbPut('workshops', cacheKey, valid);
        if (!cancelled) {
          setData(valid);
          setLoading(false);
        }
        return;
      } catch (e) {
        // Fallback to cache
        if (cached) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setError((e as Error).message || 'Error loading workshop');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, error, loading } as const;
}

