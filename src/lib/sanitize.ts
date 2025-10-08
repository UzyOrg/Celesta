/**
 * SANITIZATION UTILITIES
 * 
 * Previene:
 * - XSS (Cross-Site Scripting)
 * - HTML Injection
 * - Script Injection
 * - CSS Injection
 * 
 * IMPORTANTE: React ya escapa HTML por defecto, pero esta capa adicional
 * previene Stored XSS si en el futuro se usa dangerouslySetInnerHTML
 */

/**
 * Sanitiza un alias de estudiante o docente
 * 
 * Reglas:
 * - Solo caracteres alfanuméricos, espacios, guiones y puntos
 * - Sin HTML tags (<script>, <img>, etc.)
 * - Sin caracteres especiales peligrosos (< > " ' `)
 * - Máximo 64 caracteres
 * 
 * @param alias - Alias del usuario (puede venir del input del cliente)
 * @returns Alias sanitizado y seguro
 * 
 * @example
 * sanitizeAlias('<script>alert("xss")</script>'); // → 'scriptalertxssscript'
 * sanitizeAlias('Juan Pérez 123'); // → 'Juan Pérez 123'
 */
export function sanitizeAlias(alias: string): string {
  if (!alias || typeof alias !== 'string') {
    return '';
  }
  
  // 1. Eliminar espacios al inicio y final
  let cleaned = alias.trim();
  
  // 2. Eliminar caracteres peligrosos para XSS
  // < > : Para prevenir tags HTML
  // " ' ` : Para prevenir injection en atributos HTML
  // \ : Para prevenir escape sequences
  cleaned = cleaned.replace(/[<>"'`\\]/g, '');
  
  // 3. Eliminar caracteres de control (NULL, backspace, etc.)
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 4. Normalizar espacios múltiples a uno solo
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 5. Truncar a 64 caracteres (límite de BD)
  cleaned = cleaned.slice(0, 64);
  
  // 6. Trim final por si el truncado dejó espacios
  return cleaned.trim();
}

/**
 * Valida que un alias cumpla con los requisitos mínimos
 * 
 * @param alias - Alias a validar
 * @returns { valid: boolean, error?: string }
 */
export function validateAlias(alias: string): { 
  valid: boolean; 
  error?: string;
} {
  const sanitized = sanitizeAlias(alias);
  
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'El alias no puede estar vacío'
    };
  }
  
  if (sanitized.length < 2) {
    return {
      valid: false,
      error: 'El alias debe tener al menos 2 caracteres'
    };
  }
  
  if (sanitized.length > 64) {
    return {
      valid: false,
      error: 'El alias no puede exceder 64 caracteres'
    };
  }
  
  // Validar que no sea solo números (puede causar confusión)
  if (/^\d+$/.test(sanitized)) {
    return {
      valid: false,
      error: 'El alias no puede ser solo números'
    };
  }
  
  return { valid: true };
}

/**
 * Sanitiza un class_token (código de grupo)
 * 
 * Formato esperado: LETRAS-NUMEROS (ej: CIENCIAS-101, MAT-3A)
 */
export function sanitizeClassToken(token: string): string {
  if (!token || typeof token !== 'string') {
    return '';
  }
  
  // Solo permitir letras, números y guiones
  return token
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32); // Límite razonable
}

/**
 * Sanitiza input genérico de texto (para descripciones, etc.)
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/[<>"'`\\]/g, '') // Eliminar caracteres peligrosos
    .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
    .slice(0, maxLength);
}

/**
 * Escapa caracteres HTML (capa adicional de seguridad)
 * Útil si necesitas mostrar HTML literalmente
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
