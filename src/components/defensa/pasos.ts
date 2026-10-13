/**
 * Pasos del flujo del alumno.
 *
 * Son quince, en el orden de los diseños aprobados. El mismo orden sirve para
 * la barra de progreso, para el botón "Volver" y para abrir un paso directo
 * con `?paso=<id>`.
 */

export const PASOS_ALUMNO = [
  'inicio',
  'quien',
  'permisos',
  'voz',
  'trabajo',
  'archivo',
  'entregado',
  'hola',
  'respira',
  'pregunta',
  'silencio',
  'aclaracion',
  'revisar',
  'estres',
  'listo',
] as const;

export type PasoAlumnoId = (typeof PASOS_ALUMNO)[number];

export type ModoDeRespuesta = 'voz' | 'escrito';

export const PASO_INICIAL: PasoAlumnoId = 'inicio';

/** Otras formas razonables de escribir un paso en la dirección. */
const ALIAS: Readonly<Record<string, PasoAlumnoId>> = {
  main: 'inicio',
  empezar: 'inicio',
  'quien-eres': 'quien',
  quieneres: 'quien',
  'tu-archivo': 'archivo',
  tuarchivo: 'archivo',
  'es-este': 'archivo',
  'ya-cuenta': 'entregado',
  'di-hola': 'hola',
  dihola: 'hola',
  microfono: 'hola',
  'cuando-quieras': 'respira',
  'antes-de-empezar': 'respira',
  'sin-prisa': 'silencio',
  'no-te-entendi': 'aclaracion',
  revision: 'revisar',
  estres: 'estres',
  fin: 'listo',
};

export function esPasoAlumno(valor: string): valor is PasoAlumnoId {
  return (PASOS_ALUMNO as readonly string[]).includes(valor);
}

/**
 * Convierte lo que venga en `?paso=` en un paso válido.
 * Acepta el identificador, un número del 1 al 15 o un alias; si no entiende,
 * empieza por el principio.
 */
export function normalizarPaso(valor: string | readonly string[] | undefined): PasoAlumnoId {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  if (typeof crudo !== 'string') return PASO_INICIAL;
  const texto = crudo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (esPasoAlumno(texto)) return texto;
  if (/^\d{1,2}$/.test(texto)) {
    const porNumero = PASOS_ALUMNO[Number.parseInt(texto, 10) - 1];
    if (porNumero) return porNumero;
  }
  return ALIAS[texto] ?? PASO_INICIAL;
}

/** Interpreta un parámetro de dirección tipo "1" / "si" como verdadero. */
export function leerBandera(valor: string | readonly string[] | undefined): boolean {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return crudo === '1' || crudo === 'si' || crudo === 'true';
}

/** Interpreta `?modo=` : solo "escrito" cambia el valor de fábrica ("voz"). */
export function leerModo(valor: string | readonly string[] | undefined): ModoDeRespuesta {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return crudo === 'escrito' ? 'escrito' : 'voz';
}

/** Posición del paso, empezando en 0. */
export function indiceDePaso(paso: PasoAlumnoId): number {
  return PASOS_ALUMNO.indexOf(paso);
}

/** Avance de la barra superior (0 a 1) en los pasos que la muestran. */
const PROGRESO: Readonly<Partial<Record<PasoAlumnoId, number>>> = {
  quien: 0.28,
  permisos: 0.42,
  voz: 0.56,
  trabajo: 0.7,
  archivo: 0.76,
  entregado: 0.84,
  hola: 1,
};

export function progresoDePaso(paso: PasoAlumnoId): number | null {
  return PROGRESO[paso] ?? null;
}

/** Hacia dónde lleva "Volver" en los pasos de preparación. */
const ATRAS: Readonly<Partial<Record<PasoAlumnoId, PasoAlumnoId>>> = {
  quien: 'inicio',
  permisos: 'quien',
  voz: 'permisos',
  trabajo: 'voz',
  archivo: 'trabajo',
  hola: 'entregado',
};

export function pasoAtras(paso: PasoAlumnoId): PasoAlumnoId | null {
  return ATRAS[paso] ?? null;
}

export interface ContextoDeNavegacion {
  modo: ModoDeRespuesta;
  /** Ensayo privado: nadie lo ve y no se entrega. */
  ensayo: boolean;
}

/**
 * Paso siguiente al pulsar el botón principal.
 * - Quien escribe se salta la prueba de micrófono.
 * - Tanto en el ensayo como en la defensa, al terminar la revisión sigue la pregunta de estrés.
 * - "Silencio" es un estado de la pregunta: al terminar, ambos siguen igual.
 */
export function pasoSiguiente(paso: PasoAlumnoId, contexto: ContextoDeNavegacion): PasoAlumnoId | null {
  switch (paso) {
    case 'entregado':
      return contexto.modo === 'voz' ? 'hola' : 'respira';
    case 'pregunta':
    case 'silencio':
      return 'aclaracion';
    case 'revisar':
      // Tras el ensayo también se pregunta por el estrés: se mide después de la práctica y de la defensa.
      return 'estres';
    case 'listo':
      return null;
    default: {
      const indice = indiceDePaso(paso);
      return PASOS_ALUMNO[indice + 1] ?? null;
    }
  }
}

/** Cómo se llama cada paso, para el título de la ventana y los lectores de pantalla. */
export const TITULO_DE_PASO: Readonly<Record<PasoAlumnoId, string>> = {
  inicio: 'Hola',
  quien: '¿Quién eres?',
  permisos: 'Tres sí y seguimos',
  voz: '¿Hablas o escribes?',
  trabajo: 'Sube tu trabajo',
  archivo: '¿Es este?',
  entregado: 'Ya cuenta',
  hola: 'Di «hola»',
  respira: 'Cuando quieras',
  pregunta: 'Pregunta 1',
  silencio: 'Pregunta 1, sin prisa',
  aclaracion: 'Pregunta 2',
  revisar: 'Revisa tu transcripción',
  estres: 'Más o menos estrés que un examen escrito',
  listo: 'Listo',
};

/* ------------------------------------------------------------------------ */
/* Qué pasos se pueden mostrar                                              */
/* ------------------------------------------------------------------------ */

/** Lo que hay hasta ahora; decide a qué pantalla se puede llegar (por la dirección, "atrás" o al recargar). */
export interface ContextoDeAlcance {
  haySesion: boolean;
  hayEntrega: boolean;
  /** La defensa o el ensayo que está en pantalla, si lo hay. */
  actual: {
    estado: 'en_curso' | 'por_revisar' | 'entregada' | 'abandonada' | 'incompleta';
    hayPregunta: boolean;
    hayAclaracion: boolean;
    hayRevision: boolean;
    esEnsayo: boolean;
  } | null;
  /** La defensa de verdad ya se entregó. */
  defensaEntregada: boolean;
}

/**
 * Un paso solo se muestra si existe lo que ese paso necesita: no hay "pregunta" sin una
 * pregunta ni "revisar" sin una defensa terminada. Así una dirección compartida, un
 * regreso del navegador o una recarga nunca dejan una pantalla vacía.
 */
export function pasoAlcanzable(paso: PasoAlumnoId, c: ContextoDeAlcance): boolean {
  switch (paso) {
    case 'inicio':
    case 'quien':
    case 'permisos':
      return true;
    case 'voz':
    case 'trabajo':
      return c.haySesion;
    case 'archivo':
    case 'entregado':
    case 'hola':
    case 'respira':
      return c.haySesion && c.hayEntrega;
    case 'pregunta':
    case 'silencio':
      return c.actual?.estado === 'en_curso' && c.actual.hayPregunta;
    case 'aclaracion':
      return c.actual?.estado === 'en_curso' && c.actual.hayAclaracion;
    case 'revisar':
      return c.actual?.estado === 'por_revisar' && c.actual.hayRevision;
    case 'estres':
      return c.actual?.estado === 'entregada';
    case 'listo':
      return c.defensaEntregada;
    default:
      return false;
  }
}

/** A dónde mandar a quien pide un paso al que todavía no puede llegar. */
export function pasoDeRespaldo(c: ContextoDeAlcance): PasoAlumnoId {
  if (!c.haySesion) return 'inicio';
  if (!c.hayEntrega) return 'trabajo';
  return 'respira';
}
