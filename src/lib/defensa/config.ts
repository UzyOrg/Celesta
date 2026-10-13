import 'server-only';

/**
 * Límites y variables de entorno de las defensas orales.
 *
 * Todo lo que se puede ajustar en el piloto vive aquí: los números van como
 * constantes con nombre y las variables se leen en cada llamada, para que las
 * pruebas puedan cambiarlas sin reiniciar nada.
 */

/** Versión del aviso de privacidad que aceptó el alumno. Súbela al cambiar el texto. */
export const AVISO_PRIVACIDAD_VERSION = '2026-10-v1';

export const LIMITES = {
  /** Tamaño máximo del archivo original. Se sube directo al bucket, no por la API. */
  archivoBytes: 20 * 1024 * 1024,
  /** Tope del respaldo por la API cuando la subida directa falla (límite de Vercel: 4.5 MB). */
  archivoPorApiBytes: 4 * 1024 * 1024,
  textoPegadoCaracteres: 150_000,
  /** Páginas que se leen de un PDF; más allá se ignora (el resto del trabajo cuenta igual). */
  paginasPdf: 150,
  /** Entradas que se aceptan dentro de un .docx antes de abrirlo (zip bomb). */
  entradasDocx: 3_000,
  /** Suma de los tamaños declarados dentro de un .docx una vez descomprimido. */
  docxDescomprimidoBytes: 80 * 1024 * 1024,
  /** Tiempo máximo para extraer el texto de un archivo. */
  extraccionMs: 20_000,
  /** Cada parte de audio pesa unos 20 KB (4 s de Opus); el tope deja margen. */
  parteAudioBytes: 512 * 1024,
  audioRespuestaBytes: 9 * 1024 * 1024,
  /** Respuesta por escrito. */
  respuestaCaracteres: 4_000,
  aclaracionCaracteres: 400,
  nombreCaracteres: 120,
  /** Duración de cada parte que corta el MediaRecorder. */
  parteAudioMs: 4_000,
  /** Cuánto dura una sesión del alumno y el acceso del profesor. */
  sesionAlumnoMs: 48 * 60 * 60 * 1000,
  accesoProfesorMs: 180 * 24 * 60 * 60 * 1000,
  /** Vigencia de los enlaces firmados de descarga, de audio y de subida. */
  enlaceDescargaSegundos: 10 * 60,
  enlaceAudioSegundos: 30 * 60,
  enlaceSubidaSegundos: 2 * 60 * 60,
  /** El audio se borra a los 7 días. */
  audioRetencionMs: 7 * 24 * 60 * 60 * 1000,
  /** Una defensa en curso sin actividad por tanto tiempo se cierra como incompleta. */
  inactividadMs: 24 * 60 * 60 * 1000,
  /** Una entrega que nunca llegó al bucket se limpia pasado este tiempo. */
  entregaPendienteMs: 3 * 60 * 60 * 1000,
  /** Segundos de silencio antes del aviso amable (no corta nada). */
  segundosSilencio: 30,
} as const;

/** Presupuesto de tiempo y tope de turnos por duración de la actividad. */
export const PRESUPUESTO_DEFENSA = {
  corta: { presupuestoMs: 3 * 60_000, maxTurnos: 6 },
  larga: { presupuestoMs: 6 * 60_000, maxTurnos: 9 },
} as const;

export type ProveedorLlm = 'openai' | 'anthropic' | 'mock';
export type ProveedorStt = 'deepgram' | 'assemblyai' | 'mock';
export type ProveedorTts = 'elevenlabs' | 'mock';
export type TipoAlmacen = 'supabase' | 'memoria';

function texto(nombre: string): string | undefined {
  const valor = process.env[nombre];
  return valor && valor.trim().length > 0 ? valor.trim() : undefined;
}

function numero(nombre: string, porDefecto: number, minimo: number, maximo: number): number {
  const crudo = texto(nombre);
  if (crudo === undefined) return porDefecto;
  const valor = Number(crudo);
  if (!Number.isFinite(valor)) return porDefecto;
  return Math.min(maximo, Math.max(minimo, valor));
}

function elegir<T extends string>(nombre: string, permitidos: readonly T[], porDefecto: T): T {
  const valor = texto(nombre);
  return valor && (permitidos as readonly string[]).includes(valor) ? (valor as T) : porDefecto;
}

export function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** El almacén en memoria solo existe fuera de producción: nada de lo guardado sobrevive. */
export function tipoDeAlmacen(): TipoAlmacen {
  const pedido = elegir<TipoAlmacen>('DEFENSA_ALMACEN', ['supabase', 'memoria'], 'supabase');
  return pedido === 'memoria' && !esProduccion() ? 'memoria' : 'supabase';
}

export const config = {
  secretoFirma: () => texto('DEFENSA_SIGNING_SECRET'),
  secretoCron: () => texto('CRON_SECRET'),
  urlSitio: () => texto('NEXT_PUBLIC_SITE_URL') ?? texto('NEXT_PUBLIC_APP_URL'),
  supabaseUrl: () => texto('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseServicio: () => texto('SUPABASE_SERVICE_ROLE_KEY'),

  proveedorLlm: () => elegir<ProveedorLlm>('DEFENSA_LLM_PROVIDER', ['openai', 'anthropic', 'mock'], 'mock'),
  modeloPlan: () => texto('DEFENSA_LLM_MODEL'),
  modeloClasificador: () => texto('DEFENSA_LLM_MODEL_CLASIFICADOR') ?? texto('DEFENSA_LLM_MODEL'),
  claveOpenai: () => texto('DEFENSA_OPENAI_API_KEY'),
  claveAnthropic: () => texto('DEFENSA_ANTHROPIC_API_KEY'),

  proveedorStt: () => elegir<ProveedorStt>('DEFENSA_STT_PROVIDER', ['deepgram', 'assemblyai', 'mock'], 'mock'),
  modeloStt: () => texto('DEFENSA_STT_MODEL'),
  idiomaStt: () => texto('DEFENSA_STT_IDIOMA') ?? 'es',
  claveDeepgram: () => texto('DEFENSA_DEEPGRAM_API_KEY'),
  claveAssemblyai: () => texto('DEFENSA_ASSEMBLYAI_API_KEY'),
  /** Palabras con confianza menor a esto entran como posible hueco de aclaración. */
  umbralConfianza: () => numero('DEFENSA_UMBRAL_CONFIANZA', 0.55, 0.1, 0.95),

  proveedorTts: () => elegir<ProveedorTts>('DEFENSA_TTS_PROVIDER', ['elevenlabs', 'mock'], 'mock'),
  claveElevenlabs: () => texto('DEFENSA_ELEVENLABS_API_KEY'),
  vozElevenlabs: () => texto('DEFENSA_ELEVENLABS_VOICE_ID'),
  modeloElevenlabs: () => texto('DEFENSA_ELEVENLABS_MODEL') ?? 'eleven_multilingual_v2',

  /** Si está en "1", /defensa y /revision salen a producción aunque no estén abiertas en el código. */
  defensaPublica: () => texto('DEFENSA_PUBLICA') === '1',
} as const;
