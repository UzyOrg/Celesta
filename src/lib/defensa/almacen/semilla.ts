import 'server-only';
import type { EstadoMemoria } from './memoria';
import type { ActividadRow } from './tipos';

/**
 * Actividad de demostración del almacén en memoria (solo desarrollo y pruebas).
 *
 * Con DEFENSA_ALMACEN=memoria arranca ya creada, con las palabras del prototipo, para
 * poder recorrer la interfaz completa sin base de datos ni llaves:
 *
 *   alumno    /defensa/demo-celestea
 *   profesor  el enlace firmado que se imprime en la consola del servidor al arrancar
 *
 * Su id es fijo para que una prueba pueda firmar el acceso del profesor con el secreto
 * de prueba. En producción este archivo no se usa: el almacén en memoria no existe allí.
 */

export const ACTIVIDAD_DEMO_ID = '00000000-0000-4000-8000-000000000d3a';
export const TOKEN_GRUPO_DEMO = 'demo-celestea';

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export function sembrarActividadDemo(estado: EstadoMemoria, ahora: Date = new Date()): ActividadRow {
  const existente = estado.actividades.get(ACTIVIDAD_DEMO_ID);
  if (existente) return existente;

  // Vence dentro de una semana a las 23:59 (hora de México), para que la demostración no quede tardía.
  const limite = new Date(ahora.getTime() + SIETE_DIAS_MS);
  limite.setUTCHours(5, 59, 0, 0);

  const fila: ActividadRow = {
    id: ACTIVIDAD_DEMO_ID,
    tokenGrupo: TOKEN_GRUPO_DEMO,
    nombre: 'Encuesta sobre hábitos de estudio',
    curso: 'Metodología de la investigación',
    grupo: '3B',
    profesorNombre: 'Laura Méndez',
    profesorRef: 'demo',
    consigna:
      'Diseña y aplica una encuesta sobre hábitos de estudio en tu facultad. En tu reporte justifica el método que elegiste, explica cómo definiste tu muestra y reconoce los límites de tu estudio.',
    rubrica: null,
    ejemplosDocente: null,
    contextoCurso: 'Metodología de la investigación, tercer semestre.',
    registro: 'tu',
    objetivos: [
      { id: 'O1', text: 'Justifica por qué eligió una encuesta', corto: 'Justifica el método', alias: 'El del método', tema: 'su método' },
      { id: 'O2', text: 'Explica cómo definió su muestra', corto: 'Explica su muestra', alias: 'El de la muestra', tema: 'su muestra' },
      { id: 'O3', text: 'Reconoce los límites de su estudio', corto: 'Reconoce límites', alias: 'El de los límites', tema: 'los límites de su estudio' },
    ],
    duracion: 'corta',
    fechaLimite: limite.toISOString(),
    limiteEnvios: 500,
    enviosUsados: 0,
    enlaceActivo: true,
    accesoVersion: 1,
    cohorteCerradaEn: null,
    creadaEn: ahora.toISOString(),
    actualizadaEn: ahora.toISOString(),
  };
  estado.actividades.set(fila.id, fila);
  return fila;
}
