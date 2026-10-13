/**
 * Contrato entre el navegador y la API de las defensas (src/app/api/defensa/).
 *
 * Solo tipos: este archivo lo importan tanto las rutas del servidor como los
 * componentes del navegador, así que no contiene nada secreto. Lo que NO aparece
 * aquí es justo lo que nunca sale del servidor: el plan de preguntas, la evidencia
 * esperada, las anclas, los prompts y las clases con las que se decidió cada turno.
 */

export type ModoRespuestaCliente = 'voz' | 'escrito';

export type EstadoPlanCliente = 'sin_entrega' | 'generando' | 'listo' | 'no_corresponde' | 'error';

export type EstadoDefensaCliente = 'en_curso' | 'por_revisar' | 'entregada' | 'abandonada' | 'incompleta';

/** Códigos de error estables; el mensaje en español viene aparte y se puede mostrar tal cual. */
export type CodigoErrorApi =
  | 'no_configurado'
  | 'no_autorizado'
  | 'no_encontrado'
  | 'solicitud_invalida'
  | 'demasiado_grande'
  | 'demasiadas_solicitudes'
  | 'enlace_inactivo'
  | 'limite_envios'
  | 'formato_no_aceptado'
  | 'archivo_no_llego'
  | 'sin_texto'
  | 'trabajo_corto'
  | 'plan_no_listo'
  | 'sin_entrega'
  | 'estado_invalido'
  | 'partes_faltantes'
  | 'transcripcion_fallo'
  | 'consentimiento_requerido'
  | 'ocupado'
  | 'proveedor_fallo';

export interface ErrorApi {
  error: CodigoErrorApi;
  mensaje: string;
  detalle?: Record<string, unknown>;
}

// ── Estado de la sesión ─────────────────────────────────────────────────────

export interface EntregaCliente {
  id: string;
  version: number;
  tipo: 'archivo' | 'texto';
  nombre: string;
  paginas: number | null;
  palabras: number;
  /** Momento en que el trabajo llegó: cuenta como entregado desde aquí. */
  entregadaEn: string;
  tardia: boolean;
}

export interface PreguntaCliente {
  turnoId: string;
  /** Posición dentro de la defensa, empezando en 1. */
  numero: number;
  /** La frase de contexto ("Elegiste una encuesta en línea en vez de entrevistas."). */
  contexto: string;
  /** La pregunta en sí. Siempre se muestra escrita además de hablada. */
  pregunta: string;
  /** Enlace firmado que caduca; null si no hay audio (se lee igual). */
  audioUrl: string | null;
  repeticiones: number;
}

export interface AclaracionCliente {
  turnoId: string;
  numero: number;
  /** Lo que se oyó antes del hueco y lo que se oyó después. */
  antes: string;
  despues: string;
  /** Frase fija que dice la voz: "No te entendí una parte, está en tu pantalla". */
  vozUrl: string | null;
  /** Audio de la respuesta con el que se oye solo esa parte (de `desdeMs` a `hastaMs`). */
  audioUrl: string | null;
  desdeMs: number;
  hastaMs: number;
}

export interface SegmentoLineaCliente {
  texto: string;
  aclarado?: boolean;
  noEntendido?: boolean;
}

export interface LineaRevisionCliente {
  id: string;
  tiempo: string;
  segmentos: SegmentoLineaCliente[];
  aclarada: boolean;
  marcada: boolean;
}

export interface BloqueRevisionCliente {
  turnoId: string;
  numero: number;
  contexto: string;
  pregunta: string;
  modo: ModoRespuestaCliente;
  /** Respuesta hablada, línea por línea. */
  lineas?: LineaRevisionCliente[];
  /** Respuesta escrita. */
  porEscrito?: string;
}

export interface DefensaCliente {
  id: string;
  esEnsayo: boolean;
  estado: EstadoDefensaCliente;
  /** Cuántas preguntas ya se respondieron. */
  respondidas: number;
  /** Hay una pregunta esperando respuesta. */
  pregunta: PreguntaCliente | null;
  /** Hay una parte del audio por aclarar. */
  aclaracion: AclaracionCliente | null;
  /** La defensa terminó y el alumno puede revisar su transcripción. */
  revision: BloqueRevisionCliente[] | null;
  /** Momento en que se entregó la defensa. */
  entregadaEn: string | null;
  /** Ya contestó la pregunta de estrés de esta defensa. */
  estresRespondido: boolean;
}

export interface EstadoSesionCliente {
  alumno: { nombre: string; matricula: string; modo: ModoRespuestaCliente | null };
  entrega: EntregaCliente | null;
  plan: EstadoPlanCliente;
  /** La defensa real (la más reciente de la última entrega). */
  defensa: DefensaCliente | null;
  /** El ensayo privado en curso, si lo hay. */
  ensayo: DefensaCliente | null;
}

// ── Peticiones y respuestas ─────────────────────────────────────────────────

export interface PeticionSesion {
  token: string;
  nombre: string;
  matricula: string;
  /** Las tres confirmaciones de la pantalla "Tres sí y seguimos". */
  consentimientos: { avisoPrivacidad: boolean; transferenciaInternacional: boolean; mayorDeEdad: boolean };
  modo: ModoRespuestaCliente;
}

export interface RespuestaSesion {
  sesion: string;
  expiraEn: number;
  estado: EstadoSesionCliente;
}

export type PeticionEntrega =
  | { tipo: 'archivo'; nombre: string; bytes: number; mime: string }
  | { tipo: 'texto'; texto: string };

export interface RespuestaEntregaArchivo {
  entregaId: string;
  /** Subida directa al bucket; null si hay que subir el archivo por la API. */
  subida: { url: string; expiraEn: number } | null;
  /** Tope de tamaño para subir por la API cuando la subida directa no está disponible. */
  maxBytesPorApi: number;
}

export interface RespuestaEntregaTexto {
  entrega: EntregaCliente;
}

export interface PeticionResponder {
  modo: ModoRespuestaCliente;
  /** Respuesta escrita. */
  texto?: string;
  /** Número de la grabación (0 a 99); cada vez que se vuelve a grabar sube uno, así partes viejas nunca se mezclan. */
  intento?: number;
  /** Cuántas partes de audio subió (índices 0 a total-1). */
  totalPartes?: number;
  /** Tipo del audio grabado, por ejemplo "audio/webm;codecs=opus". */
  mime?: string;
  /** Cuánto duró la grabación, medido en el navegador. */
  duracionMs?: number;
  silencios?: number;
  repeticiones?: number;
}

export interface PeticionAclarar {
  modo: ModoRespuestaCliente;
  texto?: string;
  intento?: number;
  totalPartes?: number;
  mime?: string;
  duracionMs?: number;
}

export interface PeticionEntregarDefensa {
  /** Líneas marcadas con "No lo dije así". */
  marcas: Array<{ turnoId: string; linea: string }>;
}

export interface ResumenPracticaCliente {
  objetivoId: string;
  texto: string;
  resultado: 'explico' | 'dudo';
}

export interface RespuestaDefensa {
  defensa: DefensaCliente;
  /** Solo al terminar un ensayo: qué explicó bien y dónde dudó. Nunca lo ve el profesor. */
  resumenPractica?: ResumenPracticaCliente[];
}

// ── Lado del profesor ───────────────────────────────────────────────────────

export type ValorToqueCliente = 'si' | 'parte' | 'no' | 'no_se';

export interface PeticionToque {
  defensaId: string;
  tipo: 'antes' | 'despues';
  valor: ValorToqueCliente;
}

export interface PeticionTiempoRevision {
  defensaId: string;
  /** Si no se manda, se abre una medición nueva y se devuelve su id. */
  aperturaId?: string;
  activoMs: number;
}

export interface PeticionAudioParte {
  defensaId: string;
  turnoId: string;
}

export interface RespuestaAudioParte {
  url: string;
}

export interface PeticionDescarga {
  alcance: 'todos' | 'uno';
  /** Para `uno`: la entrega que se baja. */
  entregaId?: string;
}

export interface RespuestaDescarga {
  url: string;
  nombre: string;
  cantidad: number;
  /** Cuántos alumnos no entregaron y por eso no están. */
  sinEntregar: number;
}
