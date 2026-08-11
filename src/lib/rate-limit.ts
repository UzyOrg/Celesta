/**
 * RATE LIMITER - Simple In-Memory Rate Limiting
 * 
 * Previene:
 * - DoS (Denial of Service) attacks
 * - Spam de solicitudes
 * - Enumeración de recursos
 * - Abuso de API
 * 
 * Funcionamiento:
 * - Usa un Map en memoria (se resetea al reiniciar el servidor)
 * - La limpieza es oportunista y el número de buckets está acotado. Un
 *   `setInterval` a nivel de módulo se duplicaba con hot reload y podía mantener
 *   vivo un proceso de pruebas.
 * - Para producción multi-instancia, considerar un almacén compartido.
 */

interface RateLimitBucket {
  count: number;
  reset: number; // Timestamp de cuando resetea el contador
}

// Almacenamiento en memoria de los contadores
const rateLimitMap = new Map<string, RateLimitBucket>();
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;
let nextCleanupAt = 0;

function cleanupRateLimits(now: number, force = false): void {
  if (!force && now < nextCleanupAt && rateLimitMap.size < MAX_RATE_LIMIT_BUCKETS) return;

  for (const [key, bucket] of Array.from(rateLimitMap.entries())) {
    if (now > bucket.reset) rateLimitMap.delete(key);
  }
  nextCleanupAt = now + CLEANUP_INTERVAL_MS;

  // A hostile stream of never-before-seen keys must not grow the process
  // forever during the cleanup window. Map preserves insertion order, so the
  // first key is the oldest bucket.
  while (rateLimitMap.size >= MAX_RATE_LIMIT_BUCKETS) {
    const oldestKey = rateLimitMap.keys().next().value as string | undefined;
    if (!oldestKey) break;
    rateLimitMap.delete(oldestKey);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica si una clave ha excedido el rate limit
 * 
 * @param key - Identificador único (ej: "roster:request:192.168.1.1")
 * @param limit - Número máximo de requests permitidos
 * @param windowMs - Ventana de tiempo en milisegundos (default: 60 segundos)
 * @returns Objeto con allowed, remaining y resetAt
 * 
 * @example
 * const { allowed } = checkRateLimit(`roster:${ip}`, 5, 60_000);
 * if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  cleanupRateLimits(now);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
  const safeWindowMs = Number.isFinite(windowMs) && windowMs > 0
    ? Math.floor(windowMs)
    : 60_000;
  const bucket = rateLimitMap.get(key);
  
  // Si no existe bucket o ya expiró, crear uno nuevo
  if (!bucket || now > bucket.reset) {
    const newBucket: RateLimitBucket = {
      count: 1,
      reset: now + safeWindowMs
    };
    rateLimitMap.set(key, newBucket);
    
    return {
      allowed: true,
      remaining: safeLimit - 1,
      resetAt: newBucket.reset
    };
  }
  
  // Si ya alcanzó el límite
  if (bucket.count >= safeLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.reset
    };
  }
  
  // Incrementar contador
  bucket.count += 1;
  rateLimitMap.set(key, bucket);
  
  return {
    allowed: true,
    remaining: safeLimit - bucket.count,
    resetAt: bucket.reset
  };
}

/**
 * Obtiene la IP del cliente desde los headers de Vercel
 */
export function getClientIp(req: Request): string {
  // Vercel provides x-forwarded-for header
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback a x-real-ip
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback para desarrollo local
  return 'local';
}

/**
 * Resetea manualmente un bucket (útil para testing)
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

/**
 * Obtiene estadísticas de rate limiting (útil para debugging)
 */
export function getRateLimitStats(): {
  totalBuckets: number;
  activeBuckets: number;
} {
  const now = Date.now();
  cleanupRateLimits(now, true);
  let active = 0;
  
  const buckets = Array.from(rateLimitMap.values());
  for (const bucket of buckets) {
    if (now <= bucket.reset) {
      active++;
    }
  }
  
  return {
    totalBuckets: rateLimitMap.size,
    activeBuckets: active
  };
}
