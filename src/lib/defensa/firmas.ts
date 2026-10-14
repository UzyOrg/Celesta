import 'server-only';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { config, LIMITES } from './config';
import { DefensaError, noAutorizado } from './errores';

/**
 * Enlaces firmados de las defensas orales.
 *
 * Son de portador (quien lo tiene, entra) y caducan. Llevan una firma HMAC-SHA256
 * con un secreto del servidor y el propósito dentro de lo firmado, así que una
 * sesión de alumno nunca sirve como acceso de profesor ni al revés.
 *
 *  - Sesión del alumno: se emite al entrar con nombre y matrícula. Va en el
 *    encabezado Authorization, nunca en la dirección.
 *  - Acceso del profesor: es el propio enlace /revision/<token>. Lleva la versión
 *    de acceso de la actividad: subirla en la base invalida todos los emitidos.
 */

export interface ClaimsAlumno {
  p: 'a';
  /** Id del alumno. */
  al: string;
  /** Id de la actividad. */
  ac: string;
  iat: number;
  exp: number;
}

export interface ClaimsProfesor {
  p: 'r';
  /** Id de la actividad. */
  ac: string;
  /** Versión de acceso de la actividad al emitir el enlace. */
  v: number;
  iat: number;
  exp: number;
}

export type ClaimsDefensa = ClaimsAlumno | ClaimsProfesor;

export type ResultadoVerificacion<T extends ClaimsDefensa> =
  | { ok: true; claims: T }
  | { ok: false; razon: 'malformado' | 'firma' | 'proposito' | 'caducado' };

const MIN_SECRETO = 32;

export function exigirSecretoFirma(): string {
  const valor = config.secretoFirma();
  if (!valor || valor.length < MIN_SECRETO) {
    console.error('defensa_configuracion', { variable: 'DEFENSA_SIGNING_SECRET', minimoCaracteres: MIN_SECRETO });
    throw new DefensaError('no_configurado', 503);
  }
  return valor;
}

function firmaDe(clave: string, proposito: string, carga: string): string {
  return createHmac('sha256', clave).update(`celestea.defensa.v1.${proposito}.${carga}`).digest('base64url');
}

function codificar(claims: ClaimsDefensa): string {
  return Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function esTexto(valor: unknown, maximo: number): valor is string {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= maximo;
}

function leerClaims(carga: string): ClaimsDefensa | null {
  try {
    const crudo: unknown = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8'));
    if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return null;
    const c = crudo as Record<string, unknown>;
    if (!esNumero(c.iat) || !esNumero(c.exp) || c.exp <= c.iat) return null;
    if (c.p === 'a' && esTexto(c.al, 64) && esTexto(c.ac, 64)) {
      return { p: 'a', al: c.al, ac: c.ac, iat: c.iat, exp: c.exp };
    }
    if (c.p === 'r' && esTexto(c.ac, 64) && esNumero(c.v) && Number.isInteger(c.v) && c.v > 0) {
      return { p: 'r', ac: c.ac, v: c.v, iat: c.iat, exp: c.exp };
    }
    return null;
  } catch {
    return null;
  }
}

export function firmarToken(claims: ClaimsDefensa, clave: string = exigirSecretoFirma()): string {
  if (clave.length < MIN_SECRETO) throw new DefensaError('no_configurado', 503);
  const carga = codificar(claims);
  return `${carga}.${firmaDe(clave, claims.p, carga)}`;
}

export function verificarToken<P extends ClaimsDefensa['p']>(
  token: string,
  proposito: P,
  ahora: number = Date.now(),
  clave: string = exigirSecretoFirma(),
): ResultadoVerificacion<Extract<ClaimsDefensa, { p: P }>> {
  if (token.length > 1_024) return { ok: false, razon: 'malformado' };
  const partes = token.split('.');
  const [carga, recibida] = partes;
  if (partes.length !== 2 || !carga || !recibida) return { ok: false, razon: 'malformado' };

  const esperada = Buffer.from(firmaDe(clave, proposito, carga));
  const entregada = Buffer.from(recibida);
  if (esperada.length !== entregada.length || !timingSafeEqual(esperada, entregada)) {
    return { ok: false, razon: 'firma' };
  }

  const claims = leerClaims(carga);
  if (!claims) return { ok: false, razon: 'malformado' };
  if (claims.p !== proposito) return { ok: false, razon: 'proposito' };
  if (ahora >= claims.exp) return { ok: false, razon: 'caducado' };
  return { ok: true, claims: claims as Extract<ClaimsDefensa, { p: P }> };
}

export function emitirSesionAlumno(
  alumnoId: string,
  actividadId: string,
  ahora: number = Date.now(),
): { token: string; expiraEn: number } {
  const exp = ahora + LIMITES.sesionAlumnoMs;
  return { token: firmarToken({ p: 'a', al: alumnoId, ac: actividadId, iat: ahora, exp }), expiraEn: exp };
}

export function emitirAccesoProfesor(
  actividadId: string,
  versionAcceso: number,
  opciones: { ahora?: number; duracionMs?: number } = {},
): { token: string; expiraEn: number } {
  const ahora = opciones.ahora ?? Date.now();
  const exp = ahora + (opciones.duracionMs ?? LIMITES.accesoProfesorMs);
  return { token: firmarToken({ p: 'r', ac: actividadId, v: versionAcceso, iat: ahora, exp }), expiraEn: exp };
}

/** Saca el portador del encabezado Authorization; un encabezado ausente o raro es "no autorizado". */
export function leerPortador(request: Request): string {
  const encabezado = request.headers.get('authorization') ?? '';
  const coincidencia = /^Bearer\s+([A-Za-z0-9._-]{16,1024})$/.exec(encabezado.trim());
  if (!coincidencia?.[1]) throw noAutorizado();
  return coincidencia[1];
}

/** Código del enlace de grupo: 14 caracteres sin ambiguos (70 bits). */
export function generarTokenGrupo(): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 14; i += 1) token += alfabeto[randomInt(alfabeto.length)];
  return token;
}

/** Semilla guardada de una defensa: entera, positiva y de 31 bits. */
export function generarSemilla(): number {
  return (randomBytes(4).readUInt32BE(0) & 0x7fffffff) || 1;
}
