import type { NivelEvidencia } from '../celeste/types';
import type { PreguntaDefensa } from '../defensa/types';

/**
 * Contratos de datos del lado del profesor (revisión de defensas orales).
 *
 * Todo lo que ve la interfaz del profesor se describe aquí. Hoy lo llena
 * `mock.ts`; para conectar datos reales se reemplaza `consultas.ts` y estos
 * tipos se quedan igual. Nada de esto guarda calificaciones, porcentajes ni
 * puntajes de sospecha: la evidencia es ordinal y siempre se muestra con texto
 * o símbolo, nunca solo con color.
 */

/* ------------------------------------------------------------------------ */
/* Tiempo                                                                   */
/* ------------------------------------------------------------------------ */

/** Día corto tal como lo escribe el diseño: "vie 9", "sáb 10". */
export type DiaCorto = 'lun 5' | 'mar 6' | 'mié 7' | 'jue 8' | 'vie 9' | 'sáb 10';

/** Momento exacto del escenario, sin depender del reloj del navegador. */
export interface MarcaDeTiempo {
  dia: DiaCorto;
  /** Hora de 24 h con minutos, por ejemplo "21:05". */
  hora: string;
}

/* ------------------------------------------------------------------------ */
/* Profesora y actividades                                                  */
/* ------------------------------------------------------------------------ */

export interface Profesora {
  nombre: string;
  primerNombre: string;
  iniciales: string;
  rol: string;
}

/** Objetivo de aprendizaje que la defensa busca evidenciar. */
export interface Objetivo {
  id: 1 | 2 | 3;
  /** Texto completo, como se lee en el reporte. */
  texto: string;
  /** Versión corta para las gráficas del grupo. */
  corto: string;
  /** Cómo se nombra en una frase: "El de la muestra". */
  alias: string;
  /** El tema, para completar una frase con "explicaron ...": "su muestra". */
  tema: string;
}

/** Entrada del menú lateral que no es la actividad abierta. */
export interface ActividadMenu {
  id: string;
  nombre: string;
  /** "Grupo 3A, cierra el viernes 23". */
  detalle: string;
}

/** Actividad completa (lado profesor). */
export interface ActividadProfesor {
  /** Código de la actividad en la dirección: `/revision/<token>`. */
  token: string;
  nombre: string;
  /** Cómo se nombra en una frase: "La encuesta". */
  referencia: string;
  curso: string;
  grupo: string;
  cierre: MarcaDeTiempo;
  /** Texto de cierre ya redactado, por ejemplo "vie 9 oct, 23:59". */
  cierreCorto: string;
  objetivos: readonly Objetivo[];
  totalAlumnos: number;
}

/** Archivo comprimido que arma "Descarga todos los trabajos". */
export interface DescargaGrupo {
  archivo: string;
  megabytes: number;
}

/* ------------------------------------------------------------------------ */
/* Alumnos y evidencia                                                      */
/* ------------------------------------------------------------------------ */

/** `null` cuando no hay dato (defensa incompleta). */
export type EvidenciaObjetivo = NivelEvidencia | null;

export type EstadoAlumno = 'sin-entregar' | 'sin-defensa' | 'por-revisar' | 'revisado';

export interface Alumno {
  matricula: string;
  /** "Aguilar Ramos, Sofía", como llega del registro. */
  nombreRegistro: string;
  /** "Sofía Aguilar Ramos", como se lee en pantalla. */
  nombre: string;
  /** "Sofía". */
  primerNombre: string;
  /** "Sofía Aguilar": primer nombre y primer apellido, para frases cortas. */
  nombreCorto: string;
  iniciales: string;
  entrega: MarcaDeTiempo | null;
  defensa: MarcaDeTiempo | null;
  /** Un valor por objetivo, solo si defendió. */
  evidencia: readonly EvidenciaObjetivo[];
  partesParaOir: number;
  revisado: boolean;
  /** Entregó después del cierre. */
  entregaTardia: boolean;
  /** Defendió después del cierre. */
  defensaTardia: boolean;
  defensaIncompleta: boolean;
  subioOtraVersion: boolean;
  /** "3 min 40 s", si se conoce. */
  duracion: string | null;
  /** Lo que hizo al revisar su transcripción antes de entregar, si se conoce. */
  revisoSuTranscripcion: { hora: string; nota: string } | null;
  /** "Alumna" o "Alumno" para el rótulo de su tarjeta; sin dato, "Alumno". */
  tratamiento?: string;
}

/** Conteos del grupo, siempre calculados desde la lista de alumnos. */
export interface ResumenGrupo {
  total: number;
  sinEntregar: number;
  sinDefensa: number;
  porRevisar: number;
  revisados: number;
  /** porRevisar + revisados. */
  defendieron: number;
  /** total - sinEntregar. */
  entregaron: number;
  /** sinEntregar + sinDefensa. */
  faltan: number;
}

export interface ConteoObjetivo {
  objetivo: Objetivo;
  explico: number;
  enParte: number;
  noSalio: number;
  sinDato: number;
  /** El objetivo que más costó al grupo. */
  masCostoso: boolean;
}

/** Una fila de "Grupo por estado". */
export interface FilaGrupo {
  alumno: Alumno;
  /** Texto de estado debajo del nombre. */
  estado: string;
  etiquetas: readonly { texto: string; tipo: 'neutra' | 'oir' }[];
}

export interface SeccionGrupo {
  id: EstadoAlumno;
  nombre: string;
  filas: readonly FilaGrupo[];
}

/* ------------------------------------------------------------------------ */
/* Reporte de un alumno                                                     */
/* ------------------------------------------------------------------------ */

export type ModoRespuesta = 'voz' | 'escrito';

/** Fragmento de una línea del reporte. */
export interface FragmentoReporte {
  texto: string;
  /** "subrayado" para la frase que marcó el alumno, "recuadro" para la aclarada. */
  resalte?: 'subrayado' | 'recuadro';
}

export interface LineaReporte {
  /** "00:14". */
  tiempo: string;
  fragmentos: readonly FragmentoReporte[];
}

/** Audio original de una frase que el alumno marcó o aclaró. */
export interface ParteParaOir {
  id: 'marcada' | 'aclarada';
  /** Texto de la tarjeta, ya redactado. */
  descripcion: string;
  /** Nombre accesible del botón de reproducir. */
  etiquetaBoton: string;
  /** Duración de la reproducción simulada, en milisegundos. */
  milisegundos: number;
  /** "0:04". */
  duracion: string;
  /** Semilla de la forma de onda. */
  semilla: number;
}

export interface RespuestaReporte {
  modo: ModoRespuesta;
  /** Etiqueta visible del diseño ("Respuesta sólida" o "Respuesta vaga"). */
  calidad: string;
  lineas?: readonly LineaReporte[];
  textoEscrito?: string;
  parteParaOir?: ParteParaOir;
  /** Lo que faltó en la respuesta, si aplica. */
  faltante?: string;
  /** Lectura redactada de la respuesta, para cuando el profesor pregunta dónde dudó. */
  analisis?: string;
}

export interface BloqueReporte {
  objetivo: Objetivo;
  nivel: EvidenciaObjetivo;
  pregunta: PreguntaDefensa;
  /** `null` si este alumno no tiene transcripción de ejemplo. */
  respuesta: RespuestaReporte | null;
}

export interface ReporteAlumno {
  matricula: string;
  /** Hay transcripción completa de ejemplo para este alumno. */
  completo: boolean;
  /** Resumen redactado de la defensa, para cuando el profesor lo pide. */
  resumen?: string;
  bloques: readonly BloqueReporte[];
}

/** Datos para ir y venir entre reportes. */
export interface VecinoReporte {
  matricula: string;
  /** "Renata Velázquez Durán". */
  nombre: string;
  /** "Renata Velázquez": para el botón "Siguiente". */
  nombreCorto: string;
}

export interface ColaReporte {
  /** Posición del reporte dentro de los que esperan, empezando en 1. */
  posicion: number;
  total: number;
  anterior: VecinoReporte | null;
  siguiente: VecinoReporte | null;
}

export type CierreReporte = 'si' | 'parte' | 'no';

/* ------------------------------------------------------------------------ */
/* Paquetes de datos que entregan las consultas                             */
/* ------------------------------------------------------------------------ */

/** Todo lo que necesita la vista del grupo del profesor. */
export interface DatosGrupo {
  profesora: Profesora;
  actividad: ActividadProfesor;
  alumnos: readonly Alumno[];
  /**
   * El alumno que Celestea encuentra cuando se le pide "Muéstrame a Ana Torres".
   * Es un solo caso de ejemplo: una versión real buscaría por nombre en el grupo.
   */
  alumnoBuscado: Alumno;
  otrasActividades: readonly ActividadMenu[];
  descarga: DescargaGrupo;
}

/** Todo lo que necesita la vista del reporte de un alumno. */
export interface DatosReporte {
  grupo: DatosGrupo;
  alumno: Alumno;
  reporte: ReporteAlumno;
  /** `null` si el alumno no está entre los que esperan revisión. */
  cola: ColaReporte | null;
}

/* ------------------------------------------------------------------------ */
/* Inicio agéntico del profesor                                             */
/* ------------------------------------------------------------------------ */

/** Escenas a las que se llega pidiendo algo. */
export type EscenaConsulta = 'avance' | 'ana' | 'descarga' | 'lista' | 'objetivos';

/** Escenas que puede mostrar el inicio del profesor. */
export type EscenaProfesor = 'inicio' | 'pensando' | EscenaConsulta | 'otro';

/** Lo que se puede fijar en el inicio. */
export type ClaveFijable = 'avance' | 'ana' | 'objetivos';

export type DestinoIntencion =
  | { tipo: 'escena'; escena: EscenaConsulta }
  | { tipo: 'accion'; accion: 'nueva-actividad' }
  | { tipo: 'desconocida' };

/* ------------------------------------------------------------------------ */
/* Nueva actividad                                                          */
/* ------------------------------------------------------------------------ */

/** Pasos de la conversación: del 0 al 5 se pregunta, el 6 es "listo". */
export type PasoNueva = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RespuestaRapida {
  texto: string;
  /** Lo que aparece como mensaje del profesor. */
  mensaje: string;
  /** Lo que se guarda en el borrador. */
  valor: string;
}

export interface MensajeNueva {
  id: string;
  autor: 'celestea' | 'profesor';
  texto: string;
  /** Muestra la lista de objetivos con casillas. */
  conObjetivos?: boolean;
  /** Muestra los botones finales (Crear enlace, Editar a mano). */
  conAcciones?: boolean;
}

export interface CampoBorrador {
  id: string;
  nombre: string;
  /** Valor ya redactado, o `null` si todavía está pendiente. */
  valor: string | null;
  /** Se acaba de llenar y debe resaltarse un momento. */
  reciente: boolean;
}

export interface ObjetivoPropuesto {
  texto: string;
  /** Número del criterio de la rúbrica del que sale. */
  criterio: number;
}
