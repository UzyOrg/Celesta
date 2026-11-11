import 'server-only';

/**
 * Contratos de los proveedores externos. El resto del código solo conoce estas
 * interfaces; qué proveedor hay detrás se elige con una variable de entorno
 * (ver providers/index.ts) y se puede cambiar sin tocar los servicios.
 *
 * Ninguna llave viaja fuera de las variables de entorno, y ningún nombre ni
 * matrícula de alumno se envía a un proveedor: solo el trabajo, las respuestas
 * y el audio.
 */

// ── Modelo de lenguaje ──────────────────────────────────────────────────────

export type TareaLlm = 'plan' | 'clasificar_turno' | 'reporte';

export interface MensajeLlm {
  rol: 'user' | 'assistant';
  contenido: string;
}

export interface SolicitudJson {
  tarea: TareaLlm;
  system: string;
  mensajes: readonly MensajeLlm[];
  /** JSON Schema de la salida; el proveedor la pide estructurada. */
  esquema: { nombre: string; json: Record<string, unknown> };
  /** Si no se indica, el proveedor usa el modelo configurado para la tarea. */
  modelo?: string;
  maxTokens: number;
  timeoutMs: number;
}

export interface RespuestaJson {
  /** JSON ya parseado; el llamador lo valida con su propio esquema. */
  json: unknown;
  proveedor: string;
  modelo: string;
}

export interface ProveedorLlm {
  readonly id: string;
  generarJson(solicitud: SolicitudJson): Promise<RespuestaJson>;
}

// ── Transcripción ───────────────────────────────────────────────────────────

/** Una palabra con su confianza y su momento: lo que hace posible la aclaración puntual. */
export interface PalabraTranscrita {
  texto: string;
  inicioMs: number;
  finMs: number;
  /** De 0 a 1. */
  confianza: number;
  /** La puso el alumno al aclarar; no viene del transcriptor. */
  aclarada?: boolean;
  /** Se aclaró y aun así no se entendió; el reporte no la usa en contra. */
  noEntendida?: boolean;
}

export interface Transcripcion {
  texto: string;
  palabras: PalabraTranscrita[];
  duracionMs: number;
  proveedor: string;
  modelo: string;
}

export interface OpcionesTranscripcion {
  idioma: string;
  timeoutMs: number;
}

export interface ProveedorStt {
  readonly id: string;
  /** Debe devolver confianza y tiempo por palabra; un proveedor que no lo haga no sirve. */
  transcribir(audio: Uint8Array, mime: string, opciones: OpcionesTranscripcion): Promise<Transcripcion>;
}

// ── Voz ─────────────────────────────────────────────────────────────────────

export interface AudioSintetizado {
  bytes: Uint8Array;
  mime: string;
  extension: 'mp3' | 'wav';
}

export interface ProveedorTts {
  readonly id: string;
  /**
   * Identifica la voz y el modelo en uso (por ejemplo "elevenlabs|<voz>|<modelo>"). El banco de frases
   * fijas la usa para no servir un audio hecho con otra voz si se cambia la configuración.
   */
  identidad?(): string;
  sintetizar(texto: string, opciones: { timeoutMs: number }): Promise<AudioSintetizado>;
}

export interface Proveedores {
  llm: ProveedorLlm;
  stt: ProveedorStt;
  tts: ProveedorTts;
}
