import type { DestinoIntencion, EscenaConsulta, EscenaProfesor } from './types';

/**
 * Enrutador de intenciones del compositor de Celestea (simulado).
 *
 * Es pequeño, tipado y local a propósito: recibe lo que el profesor escribe o
 * dicta y lo lleva a UNA de las ramas ya escritas de la interfaz (avance,
 * alumno, descarga, lista, objetivos o crear actividad). Nunca inventa una
 * respuesta nueva: el modelo de lenguaje, cuando exista, solo podrá CLASIFICAR
 * hacia estas ramas, no generar la interfaz.
 *
 * Para conectar un clasificador de servidor más adelante, `interpretarPeticion`
 * es el único punto a cambiar: debe devolver siempre una de `RAMAS_PERMITIDAS`
 * (cualquier otra salida se descarta) y, si falla, conviene volver a estas
 * reglas locales.
 */

/** Las únicas ramas a las que cualquier clasificador puede dirigir. */
export const RAMAS_PERMITIDAS = ['avance', 'ana', 'descarga', 'lista', 'objetivos'] as const;

/** `true` si el valor es una escena que se puede pedir (también valida `?escena=`). */
export function esEscenaConsulta(valor: unknown): valor is EscenaConsulta {
  return typeof valor === 'string' && (RAMAS_PERMITIDAS as readonly string[]).includes(valor);
}

/**
 * Lee `?escena=` de la dirección: `inicio` (o nada) abre el inicio y una escena
 * válida abre esa respuesta. `alumno` se acepta como otro nombre de `ana`.
 */
export function leerEscenaInicial(valor: string | string[] | undefined): 'inicio' | EscenaConsulta {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  const limpio = typeof crudo === 'string' ? crudo.trim().toLowerCase() : '';
  if (limpio === 'alumno') return 'ana';
  return esEscenaConsulta(limpio) ? limpio : 'inicio';
}

/** Minúsculas y sin acentos. */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

interface Regla {
  nombre: string;
  destino: DestinoIntencion;
  expresion: RegExp;
}

/**
 * El orden importa: gana la primera que coincide. Las más específicas van
 * antes ("descarga todos los trabajos" también dice "todos", pero gana descarga).
 * Son las mismas reglas del diseño aprobado.
 */
const REGLAS: readonly Regla[] = [
  {
    nombre: 'nueva-actividad',
    destino: { tipo: 'accion', accion: 'nueva-actividad' },
    expresion:
      /\bnueva actividad\b|\b(crear|crea|armar|arma|hacer|haz|preparar|prepara)( una| otra| la)?( nueva)? (actividad|tarea|defensa)\b/,
  },
  { nombre: 'alumno', destino: { tipo: 'escena', escena: 'ana' }, expresion: /\bana\b|torres/ },
  {
    nombre: 'descarga',
    destino: { tipo: 'escena', escena: 'descarga' },
    expresion: /descarg|bajar|baja |zip|archivos/,
  },
  {
    nombre: 'objetivos',
    destino: { tipo: 'escena', escena: 'objetivos' },
    expresion: /objetiv|costo|cost|dificil|mostro/,
  },
  {
    nombre: 'lista',
    destino: { tipo: 'escena', escena: 'lista' },
    expresion: /todos|lista|alumnos|grupo/,
  },
  {
    nombre: 'avance',
    destino: { tipo: 'escena', escena: 'avance' },
    expresion: /defend|avance|cuant|falta|entreg|quien/,
  },
];

export interface Intencion {
  destino: DestinoIntencion;
  /** Nombre de la regla que coincidió (útil en pruebas); `null` si ninguna. */
  regla: string | null;
}

const DESCONOCIDA: Intencion = { destino: { tipo: 'desconocida' }, regla: null };

/** Qué quiere el profesor, según las reglas locales. */
export function interpretarPeticion(texto: string): Intencion {
  const limpio = normalizarTexto(texto);
  if (!limpio.trim()) return DESCONOCIDA;
  const regla = REGLAS.find((candidata) => candidata.expresion.test(limpio));
  return regla ? { destino: regla.destino, regla: regla.nombre } : DESCONOCIDA;
}

/* ------------------------------------------------------------------------ */
/* Texto de apoyo del compositor                                            */
/* ------------------------------------------------------------------------ */

/** Lo que dice la burbuja del profesor al llegar directo a una escena. */
export const PETICION_POR_ESCENA: Readonly<Record<EscenaConsulta, string>> = {
  avance: '¿Cuántos defendieron?',
  ana: 'Muéstrame a Ana Torres',
  descarga: 'Descarga todos los trabajos',
  lista: 'Muéstrame a todos',
  objetivos: '¿Qué objetivo le costó más?',
};

/** Qué sugerir después de cada escena. */
export const SUGERENCIAS_POR_ESCENA: Readonly<Record<EscenaProfesor, readonly string[]>> = {
  inicio: [
    '¿Cuántos defendieron?',
    '¿Qué objetivo le costó más?',
    'Muéstrame a Ana Torres',
    'Descarga todos los trabajos',
  ],
  avance: ['Muéstrame a todos', 'Descarga todos los trabajos'],
  ana: ['¿Qué objetivo le costó más?', 'Muéstrame a todos'],
  descarga: ['¿Cuántos defendieron?', 'Muéstrame a todos'],
  lista: ['¿Cuántos defendieron?', 'Muéstrame a Ana Torres'],
  objetivos: ['Muéstrame a Ana Torres', 'Muéstrame a todos'],
  otro: ['¿Cuántos defendieron?', 'Muéstrame a todos'],
  pensando: [],
};

/** Texto mientras "piensa", según lo que se pidió. */
export function textoPensando(destino: EscenaConsulta | 'otro' | null, defendieron: number): string {
  switch (destino) {
    case 'avance':
      return 'Contando entregas y defensas…';
    case 'ana':
      return 'Buscando a Ana…';
    case 'descarga':
      return 'Juntando los trabajos…';
    case 'lista':
      return 'Ordenando el grupo por estado…';
    case 'objetivos':
      return `Leyendo los ${defendieron} reportes…`;
    default:
      return 'Pensando…';
  }
}

/** Lo que responde Celestea cuando no sabe hacer lo que se le pidió. */
export const RESPUESTA_DESCONOCIDA =
  'Eso todavía no lo sé hacer. Puedo mostrarte el avance, a un alumno, la lista por estado o lo que le costó al grupo, y descargar trabajos.';

/* ------------------------------------------------------------------------ */
/* Compositor del reporte                                                   */
/* ------------------------------------------------------------------------ */

export type RamaReporte = 'duda' | 'resumen' | 'compara' | 'otro';

/**
 * Mini enrutador de las preguntas sobre una defensa concreta. Igual que el
 * principal: solo elige entre respuestas ya redactadas.
 */
export function clasificarPreguntaReporte(texto: string): RamaReporte {
  const limpio = normalizarTexto(texto);
  if (/dud|cost|dificil|falt/.test(limpio)) return 'duda';
  if (/resum|linea|corto/.test(limpio)) return 'resumen';
  if (/compar|grupo|demas|otros/.test(limpio)) return 'compara';
  return 'otro';
}

export const SUGERENCIAS_REPORTE: readonly string[] = [
  '¿Dónde dudó?',
  'Resume su defensa',
  'Compárala con el grupo',
];
