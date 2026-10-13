import 'server-only';
import type { PeticionSesion } from '../../../components/defensa/contrato';
import type { ActividadRow, AlumnoRow, Dispositivo } from '../almacen/tipos';
import { AVISO_PRIVACIDAD_VERSION, LIMITES } from '../config';
import { DefensaError, noAutorizado } from '../errores';
import { emitirAccesoProfesor, emitirSesionAlumno, verificarToken } from '../firmas';
import type { Ctx } from './contexto';

/**
 * Quién es quién. El alumno entra con el enlace del grupo, su nombre y su
 * matrícula, y recibe una sesión firmada que caduca. El profesor entra con un
 * enlace firmado por actividad. Ninguna de las dos cosas se guarda en cookies:
 * van en el encabezado Authorization (alumno) o en la dirección (profesor), así
 * que otra página no puede usarlas sin que el navegador las envíe a propósito.
 */

export interface SesionAlumno {
  alumno: AlumnoRow;
  actividad: ActividadRow;
}

/** El código del enlace de grupo: minúsculas, números y guiones. Cualquier otra cosa no existe. */
export function limpiarTokenGrupo(token: string): string | null {
  const limpio = token.trim().toLowerCase();
  return /^[a-z0-9-]{8,48}$/.test(limpio) ? limpio : null;
}

const SIN_CONTROL = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

export function limpiarNombre(nombre: string): string | null {
  const limpio = nombre.replace(SIN_CONTROL, ' ').replace(/\s+/g, ' ').trim();
  if (limpio.length < 2 || limpio.length > LIMITES.nombreCaracteres) return null;
  return new RegExp('\\p{L}', 'u').test(limpio) ? limpio : null;
}

/** La matrícula se compara sin mayúsculas ni espacios: "a01 234" y "A01234" son la misma. */
export function limpiarMatricula(matricula: string): string | null {
  const limpia = matricula.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9._-]{3,30}$/.test(limpia) ? limpia : null;
}

/** Android, iOS o escritorio según el navegador; solo sirve para comparar el piloto por dispositivo. */
export function dispositivoDe(agente: string | null): Dispositivo {
  if (!agente) return 'otro';
  if (/android/i.test(agente)) return 'android';
  if (/iphone|ipad|ipod/i.test(agente)) return 'ios';
  if (/windows|macintosh|linux|cros/i.test(agente)) return 'escritorio';
  return 'otro';
}

export interface ResultadoSesion {
  sesion: string;
  expiraEn: number;
  alumno: AlumnoRow;
  actividad: ActividadRow;
  nuevo: boolean;
}

export async function iniciarSesion(
  ctx: Ctx,
  peticion: PeticionSesion,
  agente: string | null,
): Promise<ResultadoSesion> {
  const tokenGrupo = limpiarTokenGrupo(peticion.token);
  const nombre = limpiarNombre(peticion.nombre);
  const matricula = limpiarMatricula(peticion.matricula);
  if (!tokenGrupo || !nombre || !matricula) throw new DefensaError('solicitud_invalida', 400);

  const c = peticion.consentimientos;
  if (!c.avisoPrivacidad || !c.transferenciaInternacional || !c.mayorDeEdad) {
    throw new DefensaError('consentimiento_requerido', 400);
  }

  const actividad = await ctx.repo.actividadPorTokenGrupo(tokenGrupo);
  if (!actividad) throw new DefensaError('no_encontrado', 404);

  // Con el enlace desactivado nadie nuevo entra; quien ya estaba defendiendo puede volver a terminar.
  if (!actividad.enlaceActivo && !(await ctx.repo.alumnoPorMatricula(actividad.id, matricula))) {
    throw new DefensaError('enlace_inactivo', 403);
  }

  const ahora = ctx.ahora().toISOString();
  const dispositivo = dispositivoDe(agente);
  const { alumno, nuevo } = await ctx.repo.upsertAlumno({
    actividadId: actividad.id,
    matricula,
    nombre,
    modo: peticion.modo,
    dispositivo,
    ahora,
  });
  await ctx.repo.guardarConsentimientos(
    alumno.id,
    [
      { tipo: 'aviso_privacidad', aceptado: true, versionAviso: AVISO_PRIVACIDAD_VERSION },
      { tipo: 'transferencia_internacional', aceptado: true, versionAviso: AVISO_PRIVACIDAD_VERSION },
      { tipo: 'mayor_de_edad', aceptado: true, versionAviso: AVISO_PRIVACIDAD_VERSION },
    ],
    ahora,
  );

  const { token, expiraEn } = emitirSesionAlumno(alumno.id, actividad.id, ctx.ahora().getTime());
  await ctx.eventos.emitir({
    verbo: 'inicio_taller',
    evento: 'sesion',
    pasoId: 'entrada',
    actividadId: actividad.id,
    actorId: alumno.id,
    clave: `${alumno.id}:${ahora}`,
    medidas: { nuevo, dispositivo, modo: peticion.modo },
  });
  return { sesion: token, expiraEn, alumno, actividad, nuevo };
}

/** Resuelve la sesión del alumno a partir del portador. Un token bueno de un alumno que ya no existe no sirve. */
export async function autenticarAlumno(ctx: Ctx, token: string): Promise<SesionAlumno> {
  const verificado = verificarToken(token, 'a', ctx.ahora().getTime());
  if (!verificado.ok) throw noAutorizado();
  const [alumno, actividad] = await Promise.all([
    ctx.repo.alumnoPorId(verificado.claims.al),
    ctx.repo.actividadPorId(verificado.claims.ac),
  ]);
  if (!alumno || !actividad || alumno.actividadId !== actividad.id) throw noAutorizado();
  return { alumno, actividad };
}

/** Resuelve el acceso del profesor. Subir `acceso_version` en la base invalida los enlaces anteriores. */
export async function autenticarProfesor(ctx: Ctx, token: string): Promise<ActividadRow> {
  const verificado = verificarToken(token, 'r', ctx.ahora().getTime());
  if (!verificado.ok) throw noAutorizado();
  const actividad = await ctx.repo.actividadPorId(verificado.claims.ac);
  if (!actividad || actividad.accesoVersion !== verificado.claims.v) throw noAutorizado();
  return actividad;
}

/** Emite un enlace nuevo del profesor para una actividad (lo usa el script de alta y la rotación). */
export function enlaceDeProfesor(actividad: ActividadRow, ahora: Date, duracionMs?: number): { token: string; expiraEn: number } {
  return emitirAccesoProfesor(actividad.id, actividad.accesoVersion, { ahora: ahora.getTime(), duracionMs });
}
