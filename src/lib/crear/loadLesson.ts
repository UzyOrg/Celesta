"use client";

import { idbGet, idbPut } from '@/lib/idb';
import type { CrearLessonId, CrearWorkshop } from './types';
import { validateCrearWorkshopJson } from './validation';

const CACHE_PREFIX = 'crear:workshop';

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

export async function loadCrearLesson(id: CrearLessonId): Promise<CrearWorkshop> {
  const cacheKey = `${CACHE_PREFIX}:${id}`;
  const cached = await idbGet<CrearWorkshop>('workshops', cacheKey);

  try {
    const res = await fetch(`/workshops/${id}.json`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`No se pudo cargar la lección (${res.status})`);
    }

    const rawText = await res.text();
    const parsed = JSON.parse(rawText) as unknown;
    const checksum = await sha256Hex(rawText);
    const validated = validateCrearWorkshopJson(parsed);
    if (validated.id_taller !== id) {
      throw new Error('La lección recibida no coincide con la solicitada.');
    }
    if (checksum && !validated.checksum) {
      validated.checksum = checksum;
    }

    await idbPut('workshops', cacheKey, validated);
    return validated;
  } catch (error) {
    if (cached) return validateCrearWorkshopJson(cached);
    throw error;
  }
}
