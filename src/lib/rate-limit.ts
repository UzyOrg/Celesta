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
 * - Para producción escalable, considerar Redis
 */

interface RateLimitBucket {
  count: number;
  reset: number; // Timestamp de cuando resetea el contador
}

// Almacenamiento en memoria de los contadores
const rateLimitMap = new Map<string, RateLimitBucket>();

// Limpieza periódica de buckets expirados (prevenir memory leak)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(rateLimitMap.entries());
    for (const [key, bucket] of entries) {
      if (now > bucket.reset) {
        rateLimitMap.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[rate-limit] Cleaned ${cleaned} expired buckets`);
    }
  }, 2 * 60 * 1000); // Cada 2 minutos
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
  const bucket = rateLimitMap.get(key);
  
  // Si no existe bucket o ya expiró, crear uno nuevo
  if (!bucket || now > bucket.reset) {
    const newBucket: RateLimitBucket = {
      count: 1,
      reset: now + windowMs
    };
    rateLimitMap.set(key, newBucket);
    
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: newBucket.reset
    };
  }
  
  // Si ya alcanzó el límite
  if (bucket.count >= limit) {
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
    remaining: limit - bucket.count,
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
