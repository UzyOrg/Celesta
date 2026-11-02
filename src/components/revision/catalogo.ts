import type { NivelEvidencia } from '../celeste/types';
import type { ConteoObjetivo, EvidenciaObjetivo, ModoRespuesta } from './types';

/**
 * Catálogo cerrado de tarjetas con las que Celestea le responde al profesor
 * (propuesta, fase 1: hoy solo lo usan las maquetas de `/revision/demo?escena=asistente`).
 *
 * Cada tipo trae props ya armados por el servidor con datos del grupo del enlace.
 * El modelo de lenguaje, cuando exista, solo elegirá el tipo y sus argumentos
 * (un filtro, un objetivo, un alias); nunca escribe estos props ni la interfaz.
 * Los límites de abajo son los mismos que validará el servidor.
 */

export const LIMITES_TARJETAS = {
  /** Tarjetas por respuesta. */
  porRespuesta: 3,
  /** Filas de una lista filtrada; si hay más se ofrece la lista completa. */
  filasLista: 40,
  /** Nombres por nivel en el detalle de un objetivo. */
  nombresPorNivel: 12,
  /** Citas por tarjeta. */
  citas: 5,
  /** Palabras de una cita (las mismas que verifica el reporte). */
  palabrasCita: 60,
  /** Caracteres de un texto corto dentro de una fila. */
  detalle: 70,
  /** Días en el ritmo de entregas. */
  dias: 14,
} as const;

/** Los filtros que puede pedir una lista; ningún otro existe. */
export type FiltroLista =
  | 'sin-entregar'
  | 'sin-defensa'
  | 'por-revisar'
  | 'revisado'
  | 'tarde'
  | 'incompleta'
  | 'otra-version'
  | 'partes-para-oir'
  | 'nivel-en-objetivo';

/** Lo mínimo para nombrar a alguien en una tarjeta. */
export interface PersonaEnTarjeta {
  matricula: string;
  nombre: string;
  iniciales: string;
}

export interface FilaLista extends PersonaEnTarjeta {
  /** "Entregó el sábado 10 a la 01:12". */
  detalle: string;
  etiquetas: readonly { texto: string; tipo: 'neutra' | 'oir' }[];
  /** Lo que se puede hacer con esa persona desde la fila. */
  accion: 'abrir' | 'ver' | 'bajar' | null;
}

export interface PropsTarjetaLista {
  /** Título ya redactado por el servidor a partir del filtro: "Entregaron o defendieron tarde". */
  titulo: string;
  filas: readonly FilaLista[];
  /** Cuántos cumplen el filtro (puede ser más que las filas). */
  total: number;
  /** Frase para cuando nadie cumple el filtro. */
  vacio: string;
}

export interface GrupoPorNivel {
  nivel: NivelEvidencia | null;
  personas: readonly PersonaEnTarjeta[];
  total: number;
}

export interface PropsTarjetaObjetivo {
  conteo: ConteoObjetivo;
  defendieron: number;
  porNivel: readonly GrupoPorNivel[];
}

export interface CitaParaProfesor extends PersonaEnTarjeta {
  /** Subcadena exacta de la transcripción, ya verificada por `reporte.ts`. */
  texto: string;
  nivel: EvidenciaObjetivo;
  modo: ModoRespuesta;
  /** "00:41" en voz; `null` por escrito. */
  tiempo: string | null;
}

export interface PropsTarjetaCitas {
  titulo: string;
  objetivo: { id: 1 | 2 | 3; texto: string };
  citas: readonly CitaParaProfesor[];
  /** Cuántas citas verificadas hay en total para ese objetivo. */
  total: number;
}

export interface PropsTarjetaPendientes {
  porRevisar: number;
  /** De los que esperan revisión, cuántos traen algo para oír. */
  conPartesParaOir: number;
  reportesPreparando: number;
  reportesConError: number;
  /** El audio se borra a los 7 días: cuántos reportes por revisar lo pierden pronto y cuándo. */
  audioPorBorrar: { reportes: number; dia: string } | null;
  enlace: { activo: boolean; enviosUsados: number; limiteEnvios: number };
}

export interface DiaDeRitmo {
  /** "vie 9". */
  dia: string;
  entregas: number;
  defensas: number;
  esCierre: boolean;
}

export interface PropsTarjetaRitmo {
  dias: readonly DiaDeRitmo[];
  tarde: { entregas: number; defensas: number };
  /** Duración típica (mediana) de una defensa, "3 min 40 s"; nunca la de una persona. */
  duracionTipica: string | null;
}

export interface PropsTarjetaEnlace {
  activo: boolean;
  enviosUsados: number;
  limiteEnvios: number;
}

/** Categorías de lo que Celestea no hace; cada una tiene su frase fija. */
export type MotivoRechazo = 'calificar' | 'comparar-personas' | 'sospecha' | 'privado' | 'otro-grupo' | 'fuera-de-alcance';

/** Lo que Celestea contesta al decir que no: amable, sin sermón y con lo que sí puede hacer. */
export const FRASE_DE_RECHAZO: Readonly<Record<MotivoRechazo, string>> = {
  calificar: 'No pongo calificaciones ni puntos: eso lo decides tú. Sí puedo mostrarte qué explicó en cada objetivo.',
  'comparar-personas':
    'No ordeno a nadie de mejor a peor. Puedo mostrarte quiénes explicaron cada objetivo solo en parte, para que decidas a quién leer primero.',
  sospecha:
    'No busco quién copió ni tengo señales de sospecha. Lo que sí tengo es cómo explicó cada quien su trabajo; puedes leerlo en su reporte.',
  privado:
    'Eso queda entre Celestea y cada alumno, como su ensayo o cómo se sintió: no lo muestro. Sí puedo mostrarte lo que explicó en su defensa.',
  'otro-grupo': 'Solo veo el grupo de este enlace. Para otro grupo, ábrelo con su propio enlace.',
  'fuera-de-alcance':
    'Eso no lo sé hacer. Puedo mostrarte el avance, a una persona, listas del grupo, lo que costó cada objetivo, frases de las defensas o lo que te falta.',
};
