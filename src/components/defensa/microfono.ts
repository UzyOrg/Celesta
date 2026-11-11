/**
 * Micrófono del alumno: pedirlo, soltarlo y decidir si se oye bien (el volumen lo mide `medidorDeVoz.ts`).
 *
 * Solo se pide después de un toque (lo exige iOS y es lo correcto), solo en /defensa
 * (el encabezado Permissions-Policy lo cierra en el resto del sitio), y nunca se pide
 * cámara. Si algo falla —permiso negado, sin micrófono, navegador viejo— el alumno
 * sigue por escrito, sin tener que explicar por qué.
 */

export type MotivoSinMicrofono = 'denegado' | 'no_hay' | 'no_soportado' | 'inseguro' | 'ocupado';

export class ErrorDeMicrofono extends Error {
  readonly motivo: MotivoSinMicrofono;

  constructor(motivo: MotivoSinMicrofono) {
    super(motivo);
    this.name = 'ErrorDeMicrofono';
    this.motivo = motivo;
  }
}

export function microfonoSoportado(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

/**
 * Qué decirle a la persona cuando el micrófono no abre. Siempre dice qué hacer y que puede escribir:
 * "no pude usar el micrófono" a secas no deja saber si es un permiso, un cable o el navegador.
 */
export function mensajeDeMicrofono(motivo: MotivoSinMicrofono): string {
  switch (motivo) {
    case 'denegado':
      return 'El navegador tiene bloqueado el micrófono para esta página. Toca el candado junto a la dirección, permite el micrófono y vuelve a intentar. Mientras, puedes escribir.';
    case 'no_hay':
      return 'No encontramos un micrófono en este dispositivo. Puedes escribir tu respuesta.';
    case 'ocupado':
      return 'Otra aplicación está usando el micrófono. Ciérrala y vuelve a intentar, o escribe tu respuesta.';
    case 'inseguro':
      return 'El micrófono solo funciona en una dirección segura (https, o localhost en tu computadora). Puedes escribir tu respuesta.';
    default:
      return 'Este navegador no deja usar el micrófono aquí. Prueba con Chrome o Safari, o escribe tu respuesta.';
  }
}

export async function pedirMicrofono(): Promise<MediaStream> {
  // Fuera de https (o localhost) el navegador ni siquiera ofrece el micrófono: no hay ventana de permiso.
  if (typeof window !== 'undefined' && window.isSecureContext === false) throw new ErrorDeMicrofono('inseguro');
  if (!microfonoSoportado()) throw new ErrorDeMicrofono('no_soportado');
  try {
    return await navigator.mediaDevices.getUserMedia({
      // Solo audio. Voz sola, un canal: pesa menos y se transcribe igual de bien.
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
  } catch (error) {
    const nombre = error instanceof DOMException ? error.name : '';
    if (nombre === 'NotAllowedError' || nombre === 'SecurityError') throw new ErrorDeMicrofono('denegado');
    if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') throw new ErrorDeMicrofono('no_hay');
    throw new ErrorDeMicrofono('ocupado');
  }
}

export function soltarMicrofono(stream: MediaStream | null): void {
  stream?.getTracks().forEach((pista) => pista.stop());
}

// El volumen se mide en `medidorDeVoz.ts`: un solo AudioContext para la prueba, "Sin prisa" y las barras.

// ── La prueba de micrófono ──────────────────────────────────────────────────

export type ResultadoPrueba = 'bien' | 'poco_volumen' | 'ruido';

/** Volumen a partir del cual se considera que hay voz, y ruido de fondo que ya molesta. */
export const UMBRAL_VOZ = 0.02;
export const UMBRAL_RUIDO = 0.06;
const MUESTRAS_MINIMAS_DE_VOZ = 3;

/**
 * Qué se concluye con lo medido hasta ahora (una muestra cada 100 ms, ver `MedidorDeVoz.escucharNivel`):
 *  - ruido: el fondo, incluso entre palabras, ya es fuerte;
 *  - poco volumen: casi no se oyó voz;
 *  - bien: se oyó voz clara sin mucho fondo.
 */
export function evaluarPrueba(niveles: readonly number[]): ResultadoPrueba {
  if (niveles.length === 0) return 'poco_volumen';
  const ordenados = niveles.slice().sort((a, b) => a - b);
  const fondo = ordenados[Math.floor(ordenados.length * 0.2)] ?? 0;
  const conVoz = niveles.filter((nivel) => nivel >= UMBRAL_VOZ).length;
  if (fondo >= UMBRAL_RUIDO) return 'ruido';
  if (conVoz < MUESTRAS_MINIMAS_DE_VOZ) return 'poco_volumen';
  return 'bien';
}
