import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ErrorApi } from '../../components/defensa/contrato';
import type { ActividadRow } from './almacen/tipos';
import { DefensaError, noAutorizado, solicitudInvalida } from './errores';
import { leerPortador } from './firmas';
import { checkRateLimit, getClientIp } from '../rate-limit';
import { readBoundedJson, RequestBodyTooLargeError } from '../server/boundedJson';
import { autenticarAlumno, autenticarProfesor, type SesionAlumno } from './servicios/acceso';
import { contextoDeSolicitud, type Ctx } from './servicios/contexto';

/**
 * Lo común de las rutas de /api/defensa:
 *  - respuestas de error uniformes, con un código estable y una frase en español;
 *  - sesión del alumno y acceso del profesor leídos del encabezado Authorization;
 *  - límites de uso por IP y por persona;
 *  - lectura acotada del cuerpo (JSON o bytes), sin cargar nunca más de lo permitido.
 *
 * Todas las rutas son del servidor (nodejs), nunca se guardan en caché y no llevan
 * cookies: el portador va en el encabezado, así otra página no puede usarlo sin que
 * el navegador lo envíe a propósito.
 */

const SIN_CACHE = { 'Cache-Control': 'no-store' } as const;

export function responder<T>(cuerpo: T, status = 200): NextResponse {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export function sinContenido(): NextResponse {
  return new NextResponse(null, { status: 204, headers: SIN_CACHE });
}

export function responderError(error: unknown): NextResponse {
  if (error instanceof DefensaError) {
    const cuerpo: ErrorApi = { error: error.codigo, mensaje: error.message, ...(error.detalle ? { detalle: error.detalle } : {}) };
    return NextResponse.json(cuerpo, { status: error.status, headers: SIN_CACHE });
  }
  if (error instanceof RequestBodyTooLargeError) {
    return responderError(new DefensaError('demasiado_grande', 413));
  }
  // Un error nuestro: se registra solo su tipo, nunca el mensaje (podría llevar datos de un alumno).
  console.error('defensa_api_error', { nombre: error instanceof Error ? error.name : 'desconocido' });
  return responderError(new DefensaError('proveedor_fallo', 500));
}

/** Envuelve una ruta: los errores salen siempre con la misma forma. */
export async function atender(accion: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await accion();
  } catch (error) {
    return responderError(error);
  }
}

// ── Límites de uso ──────────────────────────────────────────────────────────

/**
 * Cuenta una solicitud contra un límite y lanza "demasiadas solicitudes" si se pasa.
 * El contador vive en la memoria de cada instancia: frena abusos sencillos, no es un
 * sistema de cuotas. Un salón comparte una sola IP, por eso los límites por IP son
 * generosos y el límite fino es por persona.
 */
export function limitar(clave: string, limite: number, ventanaMs = 60_000): void {
  if (!checkRateLimit(`defensa:${clave}`, limite, ventanaMs).allowed) {
    throw new DefensaError('demasiadas_solicitudes', 429);
  }
}

export function limitarPorIp(request: Request, ruta: string, limite: number, ventanaMs = 60_000): void {
  limitar(`${ruta}:ip:${getClientIp(request)}`, limite, ventanaMs);
}

// ── Quién llama ─────────────────────────────────────────────────────────────

export async function conSesionAlumno(request: Request): Promise<{ ctx: Ctx; sesion: SesionAlumno }> {
  const ctx = contextoDeSolicitud();
  const sesion = await autenticarAlumno(ctx, leerPortador(request));
  return { ctx, sesion };
}

export async function conAccesoProfesor(request: Request): Promise<{ ctx: Ctx; actividad: ActividadRow }> {
  const ctx = contextoDeSolicitud();
  const actividad = await autenticarProfesor(ctx, leerPortador(request));
  return { ctx, actividad };
}

// ── Cuerpos ─────────────────────────────────────────────────────────────────

export const MAX_JSON_BYTES = 64 * 1024;

/** Lee un JSON de tamaño acotado y lo valida; cualquier cosa fuera de la forma es una solicitud inválida. */
export async function leerJson<S extends z.ZodTypeAny>(request: Request, esquema: S, maxBytes = MAX_JSON_BYTES): Promise<z.infer<S>> {
  let crudo: unknown;
  try {
    crudo = await readBoundedJson(request, maxBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) throw error;
    throw solicitudInvalida();
  }
  const resultado = esquema.safeParse(crudo);
  if (!resultado.success) throw solicitudInvalida();
  return resultado.data;
}

/** Lee bytes sin pasarse del tope: si el cuerpo es más grande se corta la lectura. */
export async function leerBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > maxBytes) throw new DefensaError('demasiado_grande', 413);
  if (!request.body) return new Uint8Array(0);

  const lector = request.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await lector.cancel().catch(() => undefined);
      throw new DefensaError('demasiado_grande', 413);
    }
    trozos.push(value);
  }
  const bytes = new Uint8Array(total);
  let desplazamiento = 0;
  for (const trozo of trozos) {
    bytes.set(trozo, desplazamiento);
    desplazamiento += trozo.byteLength;
  }
  return bytes;
}

/** Un entero de la dirección (por ejemplo `?i=3`); fuera de rango es una solicitud inválida. */
export function enteroDeLaDireccion(request: Request, nombre: string, minimo: number, maximo: number, porDefecto?: number): number {
  const crudo = new URL(request.url).searchParams.get(nombre);
  if (crudo === null) {
    if (porDefecto !== undefined) return porDefecto;
    throw solicitudInvalida();
  }
  const valor = Number(crudo);
  if (!/^\d{1,6}$/.test(crudo) || !Number.isInteger(valor) || valor < minimo || valor > maximo) throw solicitudInvalida();
  return valor;
}

/** Los parámetros dinámicos de una ruta: un id de verdad (uuid), nada más. */
export function idDeLaRuta(valor: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) throw new DefensaError('no_encontrado', 404);
  return valor.toLowerCase();
}

export { noAutorizado };
