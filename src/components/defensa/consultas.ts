import { ACTIVIDAD_ALUMNO_DEMO, TOKENS_CONOCIDOS } from './mock';
import type { ActividadAlumno } from './types';

/**
 * Consultas del flujo del alumno.
 *
 * ESTE ES EL PUNTO DE CONEXIÓN con datos reales. Hoy la función responde con el
 * escenario de `mock.ts`; para conectar un servidor se reemplaza su cuerpo por
 * un `fetch` o una consulta a base de datos, sin tocar la página ni los
 * componentes. Es asíncrona a propósito para que el cambio no altere la firma.
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
 * Busca la actividad que corresponde al enlace del grupo (`/defensa/<token>`).
 *
 * En el prototipo solo existe el token `demo` (y `3b-encuesta`, el que muestra
 * el diseño del enlace). Cualquier otro devuelve `null` y la página responde
 * con "no encontrado", como lo haría el servidor con un enlace desactivado.
 */
export async function obtenerActividadPorToken(token: string): Promise<ActividadAlumno | null> {
  const limpio = limpiarToken(token);
  if (!TOKENS_CONOCIDOS.includes(limpio)) return null;
  return { ...ACTIVIDAD_ALUMNO_DEMO, token: limpio };
}
