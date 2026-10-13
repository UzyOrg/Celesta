import { PREGUNTAS, TOKENS_CONOCIDOS } from '../defensa/mock';
import type { PreguntaDefensa } from '../defensa/types';
import { colaDeRevision } from './derivados';
import {
  ACTIVIDAD_PROFESOR,
  ALUMNO_BUSCADO,
  ALUMNOS,
  DESCARGA_DEMO,
  MATRICULA_DEMO,
  OBJETIVOS,
  OTRAS_ACTIVIDADES,
  PROFESORA,
  REPORTE_ANA,
} from './mock';
import type { Alumno, BloqueReporte, DatosGrupo, DatosReporte, Objetivo, ReporteAlumno } from './types';

/**
 * Consultas del lado del profesor.
 *
 * ESTE ES EL PUNTO DE CONEXIÓN con datos reales. Hoy cada función responde con
 * el escenario de `mock.ts`; para conectar un servidor se reemplaza el cuerpo
 * de estas funciones por un `fetch` o una consulta a base de datos, sin tocar
 * ninguna página ni componente. Todas son asíncronas a propósito, para que el
 * cambio no altere las firmas.
 *
 * Una versión real también comprobaría aquí que la sesión pertenece al dueño
 * de la actividad: el token por sí solo no autoriza nada.
 */

/** Un token razonable: minúsculas, letras, números y guiones. */
function limpiarToken(token: string): string {
  let texto = token;
  try {
    texto = decodeURIComponent(token);
  } catch {
    // Un token con % suelto se usa tal cual y simplemente no existirá.
  }
  return texto
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Datos del grupo de la profesora para la actividad `token`: actividad,
 * alumnos y menú. En el prototipo solo existen `demo` y `3b-encuesta`; otro
 * token devuelve `null` y la página responde "no encontrado".
 */
export async function obtenerGrupoPorToken(token: string): Promise<DatosGrupo | null> {
  const limpio = limpiarToken(token);
  if (!TOKENS_CONOCIDOS.includes(limpio)) return null;
  return {
    profesora: PROFESORA,
    actividad: { ...ACTIVIDAD_PROFESOR, token: limpio },
    alumnos: ALUMNOS,
    alumnoBuscado: ALUMNO_BUSCADO,
    otrasActividades: OTRAS_ACTIVIDADES,
    descarga: DESCARGA_DEMO,
  };
}

/** Reporte con las tres preguntas sin respuesta para quien no tiene transcripción de ejemplo. */
function reporteReducido(
  alumno: Alumno,
  objetivos: readonly Objetivo[],
  preguntas: readonly PreguntaDefensa[],
): ReporteAlumno {
  const bloques: BloqueReporte[] = objetivos.flatMap((objetivo, indice) => {
    const pregunta = preguntas[indice];
    if (!pregunta) return [];
    return [{ objetivo, nivel: alumno.evidencia[indice] ?? null, pregunta, respuesta: null }];
  });
  return { matricula: alumno.matricula, completo: false, bloques };
}

/**
 * Reporte de un alumno por matrícula, o `null` si no existe en el grupo o no
 * tiene defensa que revisar. Solo Ana (20231457) trae transcripción completa
 * en el prototipo; los demás muestran su evidencia y las preguntas.
 */
export async function obtenerReporte(token: string, alumnoId: string): Promise<DatosReporte | null> {
  const grupo = await obtenerGrupoPorToken(token);
  if (!grupo) return null;
  const matricula = alumnoId.trim();
  const alumno = grupo.alumnos.find((candidato) => candidato.matricula === matricula);
  if (!alumno || !alumno.defensa) return null;
  const reporte =
    alumno.matricula === MATRICULA_DEMO
      ? REPORTE_ANA
      : reporteReducido(alumno, OBJETIVOS, PREGUNTAS);
  return { grupo, alumno, reporte, cola: colaDeRevision(grupo.alumnos, alumno.matricula) };
}
