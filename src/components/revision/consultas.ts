import 'server-only';
import { cache } from 'react';
import { esProduccion } from '@/lib/defensa/config';
import { DefensaError } from '@/lib/defensa/errores';
import { autenticarProfesor } from '@/lib/defensa/servicios/acceso';
import { contextoDeSolicitud } from '@/lib/defensa/servicios/contexto';
import { datosDelGrupo, datosDelReporte } from '@/lib/defensa/servicios/profesor';
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
 * Consultas del lado del profesor (servidor).
 *
 * El enlace de la dirección (`/revision/<enlace>`) es el enlace firmado que se le entregó al
 * profesor: se verifica la firma, que no haya caducado y que no se haya cambiado la versión
 * de acceso de la actividad (ver `autenticarProfesor`). Un enlace que no sirve responde
 * "no encontrado", igual que uno que nunca existió.
 *
 * Solo fuera de producción, los códigos `demo` y `3b-encuesta` abren el escenario de ejemplo
 * de `mock.ts`, para revisar el diseño sin base de datos. En producción nunca se sirve.
 */

/** El enlace tal como llegó, sin tocar mayúsculas: la firma las distingue. */
function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor).trim();
  } catch {
    // Un valor con % suelto simplemente no existe.
    return '';
  }
}

/** Un código de ejemplo razonable: minúsculas, letras, números y guiones. */
function limpiarCodigoDeEjemplo(valor: string): string {
  return valor
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function esDeEjemplo(token: string): string | null {
  if (esProduccion()) return null;
  const limpio = limpiarCodigoDeEjemplo(decodificar(token));
  return TOKENS_CONOCIDOS.includes(limpio) ? limpio : null;
}

/** Verifica el enlace del profesor. `null` si no sirve; los demás fallos siguen siendo fallos. */
async function accesoDelProfesor(token: string) {
  const enlace = decodificar(token);
  if (!enlace || enlace.length > 800) return null;
  const ctx = contextoDeSolicitud();
  try {
    const actividad = await autenticarProfesor(ctx, enlace);
    return { ctx, actividad, enlace };
  } catch (error) {
    if (error instanceof DefensaError && error.codigo === 'no_autorizado') return null;
    throw error;
  }
}

/**
 * Datos del grupo del profesor: actividad, alumnos y menú. Con datos reales sale de la base
 * de datos; si el enlace no sirve devuelve `null` y la página responde "no encontrado".
 * Se memoriza por solicitud: `generateMetadata` y la página la llaman con el mismo enlace.
 */
export const obtenerGrupoPorToken = cache(async (token: string): Promise<DatosGrupo | null> => {
  const ejemplo = esDeEjemplo(token);
  if (ejemplo) {
    return {
      profesora: PROFESORA,
      actividad: { ...ACTIVIDAD_PROFESOR, token: ejemplo },
      alumnos: ALUMNOS,
      alumnoBuscado: ALUMNO_BUSCADO,
      otrasActividades: OTRAS_ACTIVIDADES,
      descarga: DESCARGA_DEMO,
    };
  }
  const acceso = await accesoDelProfesor(token);
  if (!acceso) return null;
  return datosDelGrupo(acceso.ctx, acceso.actividad, acceso.enlace);
});

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
 * Reporte de un alumno por matrícula, o `null` si no existe en el grupo o no tiene defensa
 * que revisar. En el escenario de ejemplo solo Ana (20231457) trae transcripción completa.
 */
export const obtenerReporte = cache(async (token: string, alumnoId: string): Promise<DatosReporte | null> => {
  const matricula = decodificar(alumnoId);
  if (esDeEjemplo(token)) {
    const grupo = await obtenerGrupoPorToken(token);
    if (!grupo) return null;
    const alumno = grupo.alumnos.find((candidato) => candidato.matricula === matricula);
    if (!alumno || !alumno.defensa) return null;
    const reporte =
      alumno.matricula === MATRICULA_DEMO ? REPORTE_ANA : reporteReducido(alumno, OBJETIVOS, PREGUNTAS);
    return { grupo, alumno, reporte, cola: colaDeRevision(grupo.alumnos, alumno.matricula) };
  }
  const acceso = await accesoDelProfesor(token);
  if (!acceso || !matricula) return null;
  return datosDelReporte(acceso.ctx, acceso.actividad, acceso.enlace, matricula);
});
