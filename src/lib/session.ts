"use client";
import { supabaseClient } from './auth';

/**
 * SECURITY: Estructura de sesión con expiración
 * Previene session hijacking persistente
 */
interface SessionData {
  sid: string;
  createdAt: number;
  expiresAt: number;
}

// Duración de sesión: 7 días
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Obtiene o crea un session ID con expiración automática
 * 
 * SECURITY: Las sesiones expiran después de 7 días para prevenir:
 * - Session hijacking persistente
 * - Acceso no autorizado en dispositivos compartidos
 * - Impersonación indefinida si se roba el localStorage
 * 
 * @param classToken - Token del grupo (opcional)
 * @returns Session ID válido o crea uno nuevo si expiró
 */
export function getOrCreateSessionId(classToken?: string): string {
  if (typeof window === 'undefined') return 'server';
  
  const key = `celesta:sid:${classToken || '__global__'}`;
  
  try {
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const data: SessionData = JSON.parse(stored);
        const now = Date.now();
        
        // Verificar si la sesión aún es válida
        if (now < data.expiresAt) {
          return data.sid; // Sesión válida, retornarla
        }
        
        // Sesión expirada, eliminarla
        console.log('[session] Session expired, creating new one');
        localStorage.removeItem(key);
      } catch (parseError) {
        // Formato antiguo (string simple), migrar a nuevo formato
        console.log('[session] Migrating legacy session format');
        localStorage.removeItem(key);
      }
    }
    
    // Crear nueva sesión con expiración
    const sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const now = Date.now();
    
    const sessionData: SessionData = {
      sid,
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS
    };
    
    localStorage.setItem(key, JSON.stringify(sessionData));
    console.log('[session] New session created, expires in 7 days');
    
    return sid;
    
  } catch (error) {
    // Fallback si falla localStorage
    console.error('[session] Error managing session:', error);
    return `${classToken || 'global'}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Renueva la expiración de una sesión (sliding window)
 * Llamar en cada interacción significativa del usuario
 * 
 * @param classToken - Token del grupo (opcional)
 */
export function renewSession(classToken?: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `celesta:sid:${classToken || '__global__'}`;
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return;
    
    const data: SessionData = JSON.parse(stored);
    const now = Date.now();
    
    // Solo renovar si aún no expiró
    if (now < data.expiresAt) {
      data.expiresAt = now + SESSION_DURATION_MS; // Extender 7 días más
      localStorage.setItem(key, JSON.stringify(data));
      console.log('[session] Session renewed');
    }
  } catch (error) {
    console.error('[session] Error renewing session:', error);
  }
}

/**
 * Invalida manualmente una sesión
 * 
 * @param classToken - Token del grupo (opcional)
 */
export function invalidateSession(classToken?: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `celesta:sid:${classToken || '__global__'}`;
  localStorage.removeItem(key);
  console.log('[session] Session invalidated');
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
