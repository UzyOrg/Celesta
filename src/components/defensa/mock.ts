import type { PreguntaDefensa } from './types';

/**
 * Datos de ejemplo que todavía usa la vista previa de diseño del profesor
 * (`/revision/demo`, solo fuera de producción; ver `revision/consultas.ts`).
 *
 * El flujo del alumno ya no lee nada de aquí: su actividad, su entrega y sus
 * preguntas salen del servidor (ver `consultas.ts` y `clienteApi.ts`).
 */

/** Enlace de la vista previa del profesor. */
export const TOKEN_DEMO = 'demo';
export const TOKENS_CONOCIDOS: readonly string[] = [TOKEN_DEMO, '3b-encuesta'];

export const PREGUNTAS: readonly PreguntaDefensa[] = [
  {
    id: 'p1',
    numero: 1,
    contexto: 'Elegiste una encuesta en línea en vez de entrevistas.',
    pregunta: '¿Por qué tomaste esa decisión?',
  },
  {
    id: 'p2',
    numero: 2,
    contexto: 'Encuestaste solo a estudiantes de tu facultad.',
    pregunta: '¿Cómo decidiste cuántas personas incluir?',
  },
  {
    id: 'p3',
    numero: 3,
    contexto: 'Tu estudio se hizo en dos semanas.',
    pregunta: 'Si lo repitieras, ¿qué cambiarías primero?',
  },
];
