"use client";
import { supabaseClient } from './auth';

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

/**
 * SECURE LOGOUT: Cierre de sesión completo (servidor + cliente)
 * 
 * SECURITY CRITICAL: Este logout implementa una estrategia de dos fases:
 * 
 * FASE 1 (SERVIDOR): Invalida la sesión en Supabase Auth
 * - Elimina el token JWT del servidor
 * - Invalida refresh tokens
 * - Previene reutilización de sesiones
 * 
 * FASE 2 (CLIENTE): Limpia TODO el estado local
 * - localStorage completo (identidades, progreso, sesiones)
 * - Previene contaminación de estado entre usuarios
 * 
 * ORDEN CRÍTICO: Servidor primero, cliente después
 * Si el logout del servidor falla, aún así se limpia el cliente para seguridad.
 * 
 * @returns Promise<void> - Siempre redirige al finalizar
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  console.log('[logout] 🔒 Starting secure logout sequence...');
  
  // ============================================================================
  // FASE 1: LOGOUT DEL SERVIDOR (CRÍTICO PARA SEGURIDAD)
  // ============================================================================
  try {
    console.log('[logout] Phase 1: Invalidating server session...');
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      console.error('[logout] ⚠️ Server logout failed:', error.message);
      console.error('[logout] ⚠️ Continuing with client cleanup for safety...');
      // NO retornamos aquí - continuamos con limpieza del cliente
    } else {
      console.log('[logout] ✅ Server session invalidated successfully');
    }
  } catch (e) {
    console.error('[logout] ❌ Exception during server logout:', e);
    console.error('[logout] ⚠️ Continuing with client cleanup for safety...');
    // NO retornamos aquí - continuamos con limpieza del cliente
  }
  
  // ============================================================================
  // FASE 2: LOGOUT DEL CLIENTE (AISLAMIENTO TOTAL)
  // ============================================================================
  try {
    console.log('[logout] Phase 2: Clearing client state...');
    
    // AISLAMIENTO TOTAL: Borrar TODO el localStorage
    // Esto incluye:
    // - Sesiones de Supabase (sb-*-auth-token)
    // - celesta:alias:* (identidades de estudiantes/docentes)
    // - celesta:sid:* (session IDs)
    // - celesta:last_teacher_token (tokens de docente)
    // - workshop_*_completed (progreso de talleres)
    // - Cualquier otro estado de la aplicación
    
    const totalKeys = localStorage.length;
    console.log(`[logout] Clearing ALL localStorage (${totalKeys} keys)...`);
    
    // Estrategia 1: localStorage.clear() (más agresivo y seguro)
    try {
      localStorage.clear();
      console.log(`[logout] ✅ Successfully cleared all ${totalKeys} keys`);
    } catch (clearError) {
      // Estrategia 2 (fallback): Eliminar clave por clave
      console.warn('[logout] localStorage.clear() failed, using fallback method');
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`[logout] Failed to remove key: ${key}`, e);
        }
      });
      
      console.log(`[logout] ✅ Cleared ${keysToDelete.length} keys using fallback`);
    }
  } catch (e) {
    console.error('[logout] ❌ CRITICAL: Failed to clear localStorage', e);
    // Aún así intentar redirigir para prevenir acceso no autorizado
  }
  
  // ============================================================================
  // REDIRECCIÓN FINAL
  // ============================================================================
  console.log('[logout] 🔒 Secure logout complete. Redirecting to login...');
  
  // Forzar recarga completa y redirigir al login
  // Esto asegura que:
  // 1. Cualquier estado en memoria se limpia
  // 2. Supabase revalida la sesión (detectará que es inválida)
  // 3. Usuario ve un estado 100% limpio
  // 4. Usuario puede volver a iniciar sesión inmediatamente
  window.location.href = '/login';
}
