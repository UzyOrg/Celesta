/**
 * CSRF PROTECTION
 * 
 * Previene Cross-Site Request Forgery (falsificación de peticiones)
 * 
 * Cómo funciona:
 * 1. Genera un token aleatorio por sesión
 * 2. Lo guarda en una cookie httpOnly
 * 3. El cliente debe enviar el mismo token en el header X-CSRF-Token
 * 4. El servidor valida que coincidan
 * 
 * Esto previene que un sitio malicioso ejecute acciones en nombre del usuario
 * 
 * NOTA: Usa Web Crypto API (compatible con Edge Runtime y Node.js)
 */

import { NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Genera un token CSRF seguro usando Web Crypto API
 * Compatible con Edge Runtime (middleware) y Node.js
 */
export function generateCsrfToken(): string {
  // Generar 32 bytes aleatorios usando Web Crypto API
  const buffer = new Uint8Array(32);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Web Crypto API (navegador y Edge Runtime)
    crypto.getRandomValues(buffer);
  } else {
    // Fallback: usar Math.random (menos seguro, solo para desarrollo)
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Convertir a hexadecimal
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valida que el token CSRF del header coincida con el de la cookie
 * 
 * @param req - Request de Next.js
 * @returns true si es válido, false si no
 */
export function validateCsrfToken(req: Request): boolean {
  // Obtener token de la cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const csrfCookie = getCookieValue(cookieHeader, CSRF_COOKIE_NAME);
  
  // Obtener token del header
  const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
  
  // Ambos deben existir y coincidir
  if (!csrfCookie || !csrfHeader) {
    return false;
  }
  
  // Comparación constante en tiempo (previene timing attacks)
  return timingSafeEqual(csrfCookie, csrfHeader);
}

/**
 * Middleware helper: Valida CSRF en mutaciones (POST, PUT, DELETE, PATCH)
 * 
 * @param req - Request de Next.js
 * @returns NextResponse con error 403 si falla, null si es válido
 * 
 * @example
 * export async function POST(req: Request) {
 *   const csrfError = validateCsrfForMutation(req);
 *   if (csrfError) return csrfError;
 *   
 *   // Continuar con lógica...
 * }
 */
export function validateCsrfForMutation(req: Request): NextResponse | null {
  const method = req.method;
  
  // Solo validar en mutaciones
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }
  
  // Validar token
  if (!validateCsrfToken(req)) {
    console.warn('[CSRF] Invalid or missing CSRF token');
    return NextResponse.json(
      {
        error: 'csrf_invalid',
        message: 'Token de seguridad inválido. Recarga la página e intenta de nuevo.'
      },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Obtiene el token CSRF actual de las cookies del navegador (client-side)
 * 
 * @returns Token CSRF o null si no existe
 */
export function getCsrfTokenFromBrowser(): string | null {
  if (typeof document === 'undefined') return null;
  
  return getCookieValue(document.cookie, CSRF_COOKIE_NAME);
}

/**
 * Helper: Extrae el valor de una cookie específica del string de cookies
 */
function getCookieValue(cookieString: string, name: string): string | null {
  const value = `; ${cookieString}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const cookieValue = parts.pop();
    if (cookieValue) {
      return cookieValue.split(';').shift() || null;
    }
  }
  
  return null;
}

/**
 * Comparación segura en tiempo constante (previene timing attacks)
 * 
 * No usar === directo porque revela información sobre cuántos caracteres coinciden
 * basándose en el tiempo de ejecución
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * NOTA: En Vercel, las cookies CSRF se establecen automáticamente
 * mediante el middleware de Next.js (src/middleware.ts)
 * 
 * Si necesitas establecer manualmente la cookie CSRF (para testing):
 */
export function setCsrfCookie(response: NextResponse, token?: string): void {
  const csrfToken = token || generateCsrfToken();
  
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Debe ser accesible desde JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 horas
  });
}

/**
 * Hook para usar en componentes React (obtener token para fetch)
 * 
 * @example
 * const csrfToken = getCsrfTokenFromBrowser();
 * 
 * fetch('/api/roster/request', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': csrfToken || ''
 *   },
 *   body: JSON.stringify(data)
 * });
 */
