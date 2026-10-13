/**
 * Contratos de datos del flujo del alumno.
 *
 * Lo que la pantalla del alumno sabe de la actividad viene de `consultas.ts`
 * (servidor); todo lo demás —su entrega, la pregunta en curso, su transcripción—
 * llega por la API (ver `contrato.ts`). Nada guarda notas, porcentajes ni
 * sospechas: el alumno solo ve su propia transcripción y lo que ya entregó.
 */

/** Una pregunta de la defensa tal como la hace Celestea. */
export interface PreguntaDefensa {
  id: string;
  numero: number;
  /** Lo que Celestea leyó en el trabajo (frase de contexto). */
  contexto: string;
  /** La pregunta en sí. Siempre se muestra escrita además de hablada. */
  pregunta: string;
}

/** El trabajo que la persona entregó, tal como se le muestra en "¿Es este?". */
export interface TrabajoEntregado {
  titulo: string;
  curso: string;
  archivo: string;
  /** "12 páginas" o "840 palabras". */
  detalle: string;
}

/** Línea de la transcripción que el alumno revisa antes de entregar. */
export interface LineaRevision {
  id: string;
  /** Minuto y segundo dentro de la respuesta, por ejemplo "00:14". */
  tiempo: string;
  /** Segmentos para poder subrayar la frase que se aclaró. */
  segmentos: readonly { texto: string; aclarado?: boolean; noEntendido?: boolean }[];
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
}

/** Lo que la tarjeta de inicio y el flujo necesitan saber de la actividad del enlace. */
export interface ActividadAlumno {
  /** Código del enlace del grupo, ya limpio. */
  token: string;
  /** Nombre con el que la ve el alumno en su tarjeta de inicio. */
  nombre: string;
  curso: string;
  grupo: string;
  /** Fecha límite escrita para la tarjeta de inicio: "viernes 9". */
  cierreTarjeta: string;
  /** Segundos de silencio antes del aviso amable. Nunca corta la defensa. */
  segundosSilencio: number;
  /** El enlace sigue dejando entrar; si no, solo retoma quien ya estaba dentro. */
  enlaceActivo: boolean;
}
