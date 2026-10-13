import { marcaLargaConMes } from './fechas';
import type {
  CampoBorrador,
  MarcaDeTiempo,
  MensajeNueva,
  ObjetivoPropuesto,
  PasoNueva,
  RespuestaRapida,
} from './types';

/**
 * Guion de "Nueva actividad": la conversación con Celestea.
 *
 * Todo el modelo vive aquí como funciones puras, sin React, para que el
 * componente solo pinte. Es el mismo guion del diseño aprobado: seis preguntas,
 * respuestas rápidas, un estado de "pensando" y un borrador que se va llenando
 * campo por campo. Nada se guarda ni se envía: es una simulación.
 */

export const PASO_FINAL: PasoNueva = 6;

export const NOMBRE_DE_LA_ACTIVIDAD = 'Encuesta sobre hábitos de estudio';

export const CONSIGNA =
  'Diseña una encuesta breve sobre hábitos de estudio, aplícala a estudiantes universitarios y entrega un reporte con tu muestra, tus resultados y una conclusión.';

export const RUBRICA =
  '1. Justifica la elección del instrumento.\n2. Describe la muestra y cómo la obtuvo.\n3. Presenta los resultados con gráficas claras.\n4. Concluye reconociendo los límites del estudio.';

/** Objetivos que propone Celestea a partir de la rúbrica (el criterio 3 se deja fuera). */
export const OBJETIVOS_PROPUESTOS: readonly ObjetivoPropuesto[] = [
  { texto: 'Justifica por qué eligió una encuesta', criterio: 1 },
  { texto: 'Explica cómo definió su muestra', criterio: 2 },
  { texto: 'Reconoce los límites de su estudio', criterio: 4 },
];

const PREGUNTAS: readonly string[] = [
  'Armemos la actividad. ¿Qué vas a evaluar? Pega la consigna o súbela.',
  'Una encuesta sobre hábitos de estudio. ¿Para qué grupo es?',
  '¿Tienes rúbrica? Con ella saco los objetivos de la defensa.',
  'Propongo estos tres. Dejé fuera el criterio 3 (gráficas): se revisa mejor en el trabajo que en una defensa.',
  '¿Para cuándo la necesitas?',
  '¿Defensa corta o larga? La corta son unos 3 minutos.',
  'Listo. Revisa el borrador y crea el enlace cuando quieras.',
];

const TEXTOS_PENSANDO: readonly string[] = [
  'Leyendo tu consigna…',
  'Anotando el grupo…',
  'Leyendo tu rúbrica…',
  'Guardando objetivos…',
  'Poniendo la fecha…',
  'Armando el borrador…',
];

/** Respuestas rápidas de cada paso: botón, mensaje del profesor y valor que queda en el borrador. */
const RAPIDAS: readonly (readonly RespuestaRapida[])[] = [
  [
    { texto: 'Pegar la consigna', mensaje: CONSIGNA, valor: CONSIGNA },
    { texto: 'Subir archivo', mensaje: 'encuesta-consigna.pdf', valor: CONSIGNA },
  ],
  [
    { texto: '3B', mensaje: '3B', valor: '3B' },
    { texto: '3A', mensaje: '3A', valor: '3A' },
  ],
  [
    { texto: 'Pegar la rúbrica', mensaje: RUBRICA, valor: RUBRICA },
    { texto: 'Subir archivo', mensaje: 'rubrica-encuesta.docx', valor: RUBRICA },
    {
      texto: 'No tengo rúbrica',
      mensaje: 'No tengo rúbrica',
      valor: 'Sin rúbrica: objetivos sacados de la consigna',
    },
  ],
  [{ texto: 'Se ven bien', mensaje: 'Se ven bien', valor: '' }],
  [
    { texto: 'Este viernes 9, a las 23:59', mensaje: 'Este viernes 9, a las 23:59', valor: 'vie 9 oct, 23:59' },
    { texto: 'En una semana', mensaje: 'En una semana', valor: 'lun 12 oct, 23:59' },
    { texto: 'Otra fecha', mensaje: 'Otra fecha', valor: 'Por definir' },
  ],
  [
    { texto: 'Corta, unos 3 min', mensaje: 'Corta, unos 3 min', valor: 'Corta, unos 3 minutos' },
    { texto: 'Larga, unos 6 min', mensaje: 'Larga, unos 6 min', valor: 'Larga, unos 6 minutos' },
  ],
  [],
];

/* ------------------------------------------------------------------------ */
/* Estado                                                                   */
/* ------------------------------------------------------------------------ */

export interface Respuesta {
  /** Lo que se lee en la burbuja del profesor. */
  texto: string;
  /** Lo que queda en el borrador. */
  valor: string;
}

/** Lo que se da por respondido cuando se abre un paso directo con `?paso=`. */
const RESPUESTAS_POR_DEFECTO: readonly Respuesta[] = [
  { texto: CONSIGNA, valor: CONSIGNA },
  { texto: '3B', valor: '3B' },
  { texto: RUBRICA, valor: RUBRICA },
  { texto: 'Se ven bien', valor: '' },
  { texto: 'Este viernes 9, a las 23:59', valor: 'vie 9 oct, 23:59' },
  { texto: 'Corta, unos 3 min', valor: 'Corta, unos 3 minutos' },
];

export interface EstadoNueva {
  paso: PasoNueva;
  /** Respuestas dadas en esta sesión; las que faltan usan las de ejemplo. */
  respuestas: Readonly<Partial<Record<number, Respuesta>>>;
  pensando: boolean;
  /** Paso que se está procesando mientras "piensa". */
  respondido: number;
  /** Índice + 1 del campo que se acaba de llenar, para resaltarlo. */
  reciente: number;
  activos: readonly [boolean, boolean, boolean];
  texto: string;
  escuchando: boolean;
}

export function estadoInicial(paso: PasoNueva): EstadoNueva {
  return {
    paso,
    respuestas: {},
    pensando: false,
    respondido: -1,
    reciente: -1,
    activos: [true, true, true],
    texto: '',
    escuchando: false,
  };
}

/** Lo que muestra la página: la conversación en un paso, o el enlace ya creado. */
export type VistaNueva = { tipo: 'conversacion'; paso: PasoNueva } | { tipo: 'enlace' };

/**
 * Convierte lo que venga en `?paso=` en un paso de la conversación o el enlace
 * listo. Sin parámetro (o con uno que no se entiende) empieza una actividad
 * nueva desde la primera pregunta; los demás valores abren la conversación ya
 * avanzada, con respuestas de ejemplo en los pasos anteriores.
 */
export function normalizarPasoNueva(valor: string | readonly string[] | undefined): VistaNueva {
  const crudo = typeof valor === 'string' ? valor : valor?.[0];
  if (typeof crudo !== 'string') return { tipo: 'conversacion', paso: 0 };
  const texto = crudo.trim().toLowerCase();
  if (texto === 'enlace') return { tipo: 'enlace' };
  if (texto === 'listo') return { tipo: 'conversacion', paso: 6 };
  const numero = Number.parseInt(texto, 10);
  if (Number.isInteger(numero) && numero >= 0 && numero <= 6) {
    return { tipo: 'conversacion', paso: numero as PasoNueva };
  }
  return { tipo: 'conversacion', paso: 0 };
}

function respuestaDe(estado: EstadoNueva, paso: number): Respuesta {
  return estado.respuestas[paso] ?? RESPUESTAS_POR_DEFECTO[paso] ?? { texto: '', valor: '' };
}

/** El paso ya fue contestado (o se está contestando en este momento). */
function contestado(estado: EstadoNueva, paso: number): boolean {
  return estado.paso > paso || (estado.pensando && estado.respondido === paso);
}

/* ------------------------------------------------------------------------ */
/* Lo que se pinta                                                          */
/* ------------------------------------------------------------------------ */

export function mensajesDe(estado: EstadoNueva): MensajeNueva[] {
  const mensajes: MensajeNueva[] = [];
  const ultimo = Math.min(estado.paso, PASO_FINAL);
  for (let paso = 0; paso <= ultimo; paso += 1) {
    mensajes.push({
      id: `celestea-${paso}`,
      autor: 'celestea',
      texto: PREGUNTAS[paso] ?? '',
      conObjetivos: paso === 3,
      conAcciones: paso === PASO_FINAL,
    });
    if (paso < PASO_FINAL && contestado(estado, paso)) {
      mensajes.push({
        id: `profesor-${paso}`,
        autor: 'profesor',
        texto: respuestaDe(estado, paso).texto,
      });
    }
  }
  return mensajes;
}

export function respuestasRapidasDe(paso: PasoNueva): readonly RespuestaRapida[] {
  return RAPIDAS[Math.min(paso, PASO_FINAL)] ?? [];
}

export function textoPensandoDe(estado: EstadoNueva): string {
  return TEXTOS_PENSANDO[estado.respondido] ?? 'Pensando…';
}

function recortar(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 2)}…` : texto;
}

export function camposDe(estado: EstadoNueva): CampoBorrador[] {
  const consigna = respuestaDe(estado, 0).valor;
  const rubrica = respuestaDe(estado, 2).valor;
  const objetivos = OBJETIVOS_PROPUESTOS.filter((_, indice) => estado.activos[indice])
    .map((objetivo, indice) => `${indice + 1}. ${objetivo.texto}`)
    .join('\n');

  const definicion: readonly (readonly [string, string, number, string])[] = [
    ['nombre', 'Nombre', 0, NOMBRE_DE_LA_ACTIVIDAD],
    ['consigna', 'Consigna', 0, recortar(consigna, 110)],
    ['grupo', 'Grupo', 1, respuestaDe(estado, 1).valor],
    ['rubrica', 'Rúbrica', 2, rubrica.includes('\n') ? '4 criterios' : rubrica],
    ['objetivos', 'Objetivos', 3, objetivos || 'Ninguno'],
    ['cierre', 'Cierra', 4, respuestaDe(estado, 4).valor],
    ['defensa', 'Defensa', 5, respuestaDe(estado, 5).valor],
  ];

  return definicion.map(([id, nombre, paso, valor]) => {
    const lleno = estado.paso > paso;
    return {
      id,
      nombre,
      valor: lleno ? valor : null,
      reciente: lleno && estado.reciente === paso + 1,
    };
  });
}

export interface AvanceBorrador {
  llenos: number;
  total: number;
  /** De 0 a 1, para la barra del borrador. */
  fraccion: number;
  /** "4 de 7". */
  texto: string;
}

export function avanceDe(campos: readonly CampoBorrador[]): AvanceBorrador {
  const llenos = campos.filter((campo) => campo.valor !== null).length;
  return {
    llenos,
    total: campos.length,
    fraccion: campos.length === 0 ? 0 : llenos / campos.length,
    texto: `${llenos} de ${campos.length}`,
  };
}

/** Se puede crear el enlace cuando termina la conversación y queda al menos un objetivo. */
export function puedeCrearEnlace(estado: EstadoNueva): boolean {
  return estado.paso >= PASO_FINAL && estado.activos.some(Boolean);
}

/* ------------------------------------------------------------------------ */
/* Transiciones                                                             */
/* ------------------------------------------------------------------------ */

export type AccionNueva =
  | { tipo: 'escribir'; texto: string }
  | { tipo: 'responder'; mensaje: string; valor?: string }
  | { tipo: 'avanzar' }
  | { tipo: 'alternar-objetivo'; indice: number }
  | { tipo: 'escuchar'; activo: boolean };

export function reducirNueva(estado: EstadoNueva, accion: AccionNueva): EstadoNueva {
  switch (accion.tipo) {
    case 'escribir':
      return { ...estado, texto: accion.texto };
    case 'responder': {
      if (estado.paso >= PASO_FINAL || estado.pensando) return estado;
      const limpio = accion.mensaje.trim();
      if (!limpio) return estado;
      return {
        ...estado,
        texto: '',
        pensando: true,
        respondido: estado.paso,
        respuestas: { ...estado.respuestas, [estado.paso]: { texto: limpio, valor: accion.valor ?? limpio } },
      };
    }
    case 'avanzar': {
      if (!estado.pensando) return estado;
      const siguiente = Math.min(PASO_FINAL, estado.paso + 1) as PasoNueva;
      return { ...estado, pensando: false, paso: siguiente, reciente: siguiente };
    }
    case 'alternar-objetivo': {
      const activos: [boolean, boolean, boolean] = [estado.activos[0], estado.activos[1], estado.activos[2]];
      activos[accion.indice] = !activos[accion.indice];
      return { ...estado, activos };
    }
    case 'escuchar':
      return { ...estado, escuchando: accion.activo };
    default:
      return estado;
  }
}

/* ------------------------------------------------------------------------ */
/* Mensaje y enlace para compartir                                          */
/* ------------------------------------------------------------------------ */

/**
 * Código de la actividad que arma la conversación de ejemplo ("Encuesta ...",
 * grupo 3B). Es el que se ve en el enlace listo y el que abre "Ver como alumno".
 */
export const TOKEN_DE_LA_NUEVA = '3b-encuesta';

/** Dominio corto que muestra el diseño. En el prototipo la ruta real es `/defensa/<token>`. */
export const DOMINIO_DEL_ENLACE = 'celestea.mx';

/** "celestea.mx/d/3b-encuesta". */
export function direccionDelEnlace(token: string): string {
  return `${DOMINIO_DEL_ENLACE}/d/${token}`;
}

export interface MensajeDelGrupo {
  antes: string;
  despues: string;
  /** El mensaje completo en texto plano, listo para copiar o enviar. */
  plano: string;
}

/** Mensaje de ejemplo para el grupo, con el enlace al centro. */
export function mensajeParaElGrupo(direccion: string, cierre: MarcaDeTiempo): MensajeDelGrupo {
  const antes = `Suban su encuesta y hagan su defensa oral aquí antes del ${marcaLargaConMes(cierre)}: `;
  const despues = '. Son unos 3 minutos y, si lo prefieren, pueden contestar por escrito.';
  return { antes, despues, plano: `${antes}${direccion}${despues}` };
}

/** Enlace de WhatsApp con el mensaje ya escrito (se abre en otra pestaña, lo decide la persona). */
export function enlaceDeWhatsApp(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}
