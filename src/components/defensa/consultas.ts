import 'server-only';
import { contextoDeSolicitud } from '@/lib/defensa/servicios/contexto';
import { limpiarTokenGrupo } from '@/lib/defensa/servicios/acceso';
import { LIMITES } from '@/lib/defensa/config';
import { marcaDeFecha, diaLargo } from '@/components/revision/fechas';
import type { ActividadAlumno } from './types';

/**
 * Consultas del flujo del alumno (servidor).
 *
 * `obtenerActividadPorToken` es lo único que la página lee antes de mostrar nada:
 * lo demás (la entrega, la defensa, la transcripción) llega por la API con la
 * sesión del alumno, así que esta consulta no devuelve nada que dependa de una
 * persona. Un código que no existe responde "no encontrado", igual que un
 * enlace que nunca se creó.
 */
export async function obtenerActividadPorToken(token: string): Promise<ActividadAlumno | null> {
  const codigo = limpiarTokenGrupo(decodificar(token));
  if (!codigo) return null;
  const actividad = await contextoDeSolicitud().repo.actividadPorTokenGrupo(codigo);
  if (!actividad) return null;
  return {
    token: actividad.tokenGrupo,
    nombre: actividad.nombre,
    curso: actividad.curso,
    grupo: actividad.grupo,
    cierreTarjeta: diaLargo(marcaDeFecha(new Date(actividad.fechaLimite)).dia),
    segundosSilencio: LIMITES.segundosSilencio,
    enlaceActivo: actividad.enlaceActivo,
  };
}

function decodificar(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    // Un token con % suelto simplemente no existe.
    return '';
  }
}
