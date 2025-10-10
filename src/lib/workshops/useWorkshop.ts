"use client";
import { useEffect, useState } from 'react';
import { idbGet, idbPut } from '@/lib/idb';
import { validateWorkshopJson, Workshop } from './schema';

/**
 * Hook para cargar talleres con arquitectura híbrida:
 * 
 * 1. TALLERES OFICIALES: Cargados desde /workshops/*.json (archivos estáticos)
 * 2. TALLERES PERSONALIZADOS: Cargados desde API /api/talleres/[id]
 * 
 * La distinción se hace automáticamente en el backend.
 */
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
      
      // 1. Intentar cargar desde caché
      const cached = await idbGet<Workshop>('workshops', cacheKey);
      
      // 2. Intentar cargar desde API unificada (maneja ambos tipos)
      try {
        const res = await fetch(`/api/talleres/${normalizedId}`, { cache: 'no-store' });
        
        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }
        
        const { contenido } = await res.json();
        
        if (!contenido) {
          throw new Error('No content in response');
        }
        
        // Validar y cachear
        const hash = await sha256Hex(JSON.stringify(contenido));
        if (hash && !contenido.checksum) contenido.checksum = hash;
        
        const valid = validateWorkshopJson(contenido);
        await idbPut('workshops', cacheKey, valid);
        
        if (!cancelled) {
          setData(valid);
          setLoading(false);
        }
        return;
        
      } catch (e) {
        console.error(`[useWorkshop] Error loading ${normalizedId}:`, e);
        
        // 3. Fallback a caché si existe
        if (cached) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
          }
          return;
        }
        
        // 4. Si no hay caché, mostrar error
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

