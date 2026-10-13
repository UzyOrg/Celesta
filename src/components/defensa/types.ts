/**
 * Contratos de datos del flujo del alumno.
 *
 * Todo lo que ve la pantalla del alumno se describe aquí. Hoy lo llena
 * `mock.ts`; para conectar datos reales se reemplaza `consultas.ts` y estos
 * tipos se quedan igual. Nada guarda notas, porcentajes ni sospechas: el
 * alumno solo ve su propia transcripción y lo que ya entregó.
 */

/** Una pregunta de la defensa tal como la hace Celestea. */
export interface PreguntaDefensa {
  id: 'p1' | 'p2' | 'p3';
  numero: 1 | 2 | 3;
  /** Lo que Celestea leyó en el trabajo (frase de contexto). */
  contexto: string;
  /** La pregunta en sí. Siempre se muestra escrita además de hablada. */
  pregunta: string;
}

/** Trabajo de ejemplo que "sube" el alumno en el prototipo (nada se sube de verdad). */
export interface TrabajoDeEjemplo {
  titulo: string;
  curso: string;
  archivo: string;
  paginas: number;
}

/** Línea de la transcripción que el alumno revisa antes de entregar. */
export interface LineaRevision {
  id: string;
  /** Minuto y segundo dentro de la respuesta, por ejemplo "00:14". */
  tiempo: string;
  /** Segmentos para poder subrayar la frase que se aclaró. */
  segmentos: readonly { texto: string; aclarado?: boolean }[];
  /** Si empieza ya marcada con "No lo dije así". */
  marcadaDeInicio?: boolean;
  /** Muestra la etiqueta "Aclarado". */
  aclarada?: boolean;
}

/** Una pregunta con su respuesta, hablada o escrita, lista para revisar. */
export interface BloqueRevision {
  pregunta: PreguntaDefensa;
  /** Respuesta hablada, línea por línea. */
  lineas?: readonly LineaRevision[];
  /** Respuesta escrita, si el alumno la dio por escrito. */
  porEscrito?: string;
}

/** La frase con un hueco que se pide completar cuando no se entendió una parte del audio. */
export interface AclaracionPuntual {
  antes: string;
  despues: string;
  /** Frase corta que el alumno diría o escribiría para llenar el hueco. */
  relleno: string;
}

/** Todo lo que el flujo del alumno necesita saber de la actividad que abrió. */
export interface ActividadAlumno {
  /** Código del enlace del grupo, ya limpio. */
  token: string;
  /** Nombre con el que la ve el alumno en su tarjeta de inicio. */
  nombre: string;
  curso: string;
  grupo: string;
  /** Fecha límite escrita para la tarjeta de inicio: "viernes 9". */
  cierreTarjeta: string;
  /** Datos con los que el prototipo llena "¿Quién eres?". */
  alumnoDemo: { nombre: string; matricula: string };
  trabajo: TrabajoDeEjemplo;
  /** Hora en que cuenta como entregado el trabajo: "21:05". */
  horaEntrega: string;
  /** Hora en que se entrega la defensa: "21:32". */
  horaDefensa: string;
  /** "9 de octubre", para el sello. */
  fechaSello: string;
  /** Frase accesible del sello. */
  sello: string;
  preguntas: readonly PreguntaDefensa[];
  revision: readonly BloqueRevision[];
  /** Segundos de silencio antes del aviso amable. Nunca corta la defensa. */
  segundosSilencio: number;
  aclaracion: AclaracionPuntual;
}
