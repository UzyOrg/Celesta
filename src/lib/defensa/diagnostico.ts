import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DefensaError } from './errores';
import type { AudioSintetizado, Proveedores } from './providers/tipos';

/** Resultados operativos: nunca incluyen llaves, tokens, URLs firmadas ni respuestas del proveedor. */
export interface Comprobacion {
  nombre: string;
  estado: 'ok' | 'error' | 'simulado';
  detalle: string;
}

export function revisarConfiguracion(env: Record<string, string | undefined>): Comprobacion[] {
  const resultados: Comprobacion[] = [];
  const valor = (nombre: string) => env[nombre]?.trim() ?? '';
  const revisar = (nombre: string, valido: boolean, detalle: string) =>
    resultados.push({ nombre, estado: valido ? 'ok' : 'error', detalle: valido ? 'Configurada; valor oculto.' : detalle });
  const exigir = (nombre: string, minimo = 1) => revisar(nombre, valor(nombre).length >= minimo, `Falta o requiere al menos ${minimo} caracteres.`);
  const urlValida = (nombre: string) => {
    try {
      const url = new URL(valor(nombre));
      return ['http:', 'https:'].includes(url.protocol) && !url.hostname.endsWith('.example');
    } catch { return false; }
  };
  const almacen = valor('DEFENSA_ALMACEN') || 'supabase';
  const produccion = valor('NODE_ENV') === 'production';
  revisar('DEFENSA_ALMACEN', ['supabase', 'memoria'].includes(almacen) && !(produccion && almacen === 'memoria'), 'Usa supabase; memoria solo funciona en desarrollo.');
  exigir('DEFENSA_SIGNING_SECRET', 32);
  revisar('NEXT_PUBLIC_SITE_URL', urlValida('NEXT_PUBLIC_SITE_URL') || (!valor('NEXT_PUBLIC_SITE_URL') && urlValida('NEXT_PUBLIC_APP_URL')), 'Configura la dirección real del sitio o la URL local; .example es un marcador.');
  // El layout compartido necesita estas dos incluso con almacén en memoria.
  revisar('NEXT_PUBLIC_SUPABASE_URL', urlValida('NEXT_PUBLIC_SUPABASE_URL'), 'Falta una URL válida. Para la demo sin configuración usa npm run dev:defensa.');
  exigir('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (almacen === 'supabase') {
    exigir('SUPABASE_SERVICE_ROLE_KEY');
    exigir('CRON_SECRET', 16);
  }

  for (const [nombre, permitidos] of [
    ['DEFENSA_LLM_PROVIDER', ['openai', 'anthropic', 'mock']],
    ['DEFENSA_STT_PROVIDER', ['deepgram', 'assemblyai', 'mock']],
    ['DEFENSA_TTS_PROVIDER', ['elevenlabs', 'mock']],
  ] as const) {
    const elegido = valor(nombre) || 'mock';
    if (!(permitidos as readonly string[]).includes(elegido) || (produccion && elegido === 'mock')) {
      resultados.push({ nombre, estado: 'error', detalle: 'Proveedor inválido o simulado en producción.' });
    } else {
      resultados.push({ nombre, estado: elegido === 'mock' ? 'simulado' : 'ok', detalle: elegido === 'mock' ? 'Respuestas falsas; no verifica una cuenta real.' : 'Proveedor seleccionado.' });
    }
  }
  if (['openai', 'anthropic'].includes(valor('DEFENSA_LLM_PROVIDER'))) {
    exigir(valor('DEFENSA_LLM_PROVIDER') === 'openai' ? 'DEFENSA_OPENAI_API_KEY' : 'DEFENSA_ANTHROPIC_API_KEY');
    exigir('DEFENSA_LLM_MODEL');
  }
  if (valor('DEFENSA_STT_PROVIDER') === 'deepgram') exigir('DEFENSA_DEEPGRAM_API_KEY');
  if (valor('DEFENSA_STT_PROVIDER') === 'assemblyai') exigir('DEFENSA_ASSEMBLYAI_API_KEY');
  if (valor('DEFENSA_TTS_PROVIDER') === 'elevenlabs') {
    exigir('DEFENSA_ELEVENLABS_API_KEY');
    exigir('DEFENSA_ELEVENLABS_VOICE_ID');
  }
  return resultados;
}

async function comprobar(nombre: string, accion: () => Promise<void>): Promise<Comprobacion> {
  try {
    await accion();
    return { nombre, estado: 'ok', detalle: 'La llamada respondió y su resultado es válido.' };
  } catch (error) {
    return { nombre, estado: 'error', detalle: error instanceof DefensaError ? `${error.codigo} (HTTP ${error.status}). Consulta el código de proveedor en la consola.` : 'Respuesta inválida o conexión fallida. No se imprime el contenido del error.' };
  }
}

/** Usa los adaptadores reales, sin el fallback local que podría ocultar una llave inválida. */
export async function probarProveedores(proveedores: Proveedores, audio?: AudioSintetizado): Promise<Comprobacion[]> {
  const resultados: Comprobacion[] = [];
  const simulado = (nombre: string) => resultados.push({ nombre, estado: 'simulado', detalle: 'Omitido: proveedor mock, no se comprobó una llave real.' });
  if (proveedores.llm.id === 'mock') simulado('LLM');
  else {
    for (const tarea of ['plan', 'clasificar_turno'] as const) {
      resultados.push(await comprobar(`LLM ${tarea === 'plan' ? 'plan/reporte' : 'clasificador'}`, async () => {
        const r = await proveedores.llm.generarJson({
          tarea,
          system: 'Esta es una prueba técnica con datos ficticios. Devuelve el objeto solicitado.',
          mensajes: [{ rol: 'user', contenido: 'Devuelve estado igual a ok.' }],
          esquema: { nombre: 'comprobacion_conexion', json: { type: 'object', properties: { estado: { type: 'string', enum: ['ok'] } }, required: ['estado'], additionalProperties: false } },
          maxTokens: 1024,
          timeoutMs: 30_000,
        });
        if (!r.json || typeof r.json !== 'object' || Array.isArray(r.json) || (r.json as { estado?: unknown }).estado !== 'ok') throw new Error('salida_invalida');
      }));
    }
  }
  let muestra = audio;
  if (proveedores.tts.id === 'mock') simulado('Voz');
  else resultados.push(await comprobar('Voz', async () => {
    const sintetizado = await proveedores.tts.sintetizar('Esta es una prueba técnica de Celestea. Elegí una encuesta para comparar hábitos de estudio.', { timeoutMs: 30_000 });
    if (sintetizado.bytes.byteLength < 512) throw new Error('audio_vacio');
    muestra ??= sintetizado;
  }));

  if (proveedores.stt.id === 'mock') simulado('Transcripción');
  else if (!muestra) resultados.push({ nombre: 'Transcripción', estado: 'error', detalle: 'Hace falta voz real disponible o --audio con una grabación ficticia de prueba.' });
  else {
    const entrada = muestra;
    resultados.push(await comprobar('Transcripción', async () => {
      const r = await proveedores.stt.transcribir(entrada.bytes, entrada.mime, { idioma: 'es', timeoutMs: 45_000 });
      if (!r.texto.trim() || r.palabras.length === 0 || !r.palabras.every((p) =>
        p.texto.trim() && Number.isFinite(p.confianza) && p.confianza >= 0 && p.confianza <= 1 &&
        Number.isFinite(p.inicioMs) && p.inicioMs >= 0 && Number.isFinite(p.finMs) && p.finMs >= p.inicioMs
      )) throw new Error('sin_palabras_con_tiempos');
    }));
  }
  return resultados;
}

/**
 * Cada tabla con una columna que sí tiene en la migración: `defensa_perfiles` y
 * `defensa_audio_partes` no tienen `id`, y pedirlo daría 42703 aunque la tabla exista.
 */
export const COLUMNAS_POR_TABLA: Readonly<Record<string, string>> = {
  defensa_actividades: 'id',
  defensa_alumnos: 'id',
  defensa_consentimientos: 'id',
  defensa_perfiles: 'alumno_id',
  defensa_entregas: 'id',
  defensa_planes: 'id',
  defensa_defensas: 'id',
  defensa_turnos: 'id',
  defensa_audio_partes: 'turno_id,indice',
  defensa_reportes: 'id',
  defensa_toques_profesor: 'id',
  defensa_tiempos_revision: 'id',
  eventos_de_aprendizaje: 'client_event_id,actor_sid,student_session_id,student_alias,class_token,taller_id,paso_id,verbo,result,ts,client_ts',
};

/** Solo HEAD y metadatos de buckets: no descarga respuestas ni crea registros. */
export async function probarSupabase(db: SupabaseClient): Promise<Comprobacion[]> {
  const resultados: Comprobacion[] = [];
  for (const [tabla, columnas] of Object.entries(COLUMNAS_POR_TABLA)) {
    resultados.push(await comprobar(tabla, async () => {
      const { error } = await db.from(tabla).select(columnas, { head: true }).limit(0);
      if (error) {
        // Solo códigos conocidos; nunca el mensaje del proveedor ni los datos de filas.
        if (['PGRST205', '42P01', '42703', 'PGRST204'].includes(error.code)) throw new DefensaError('no_configurado', 503);
        throw new DefensaError('proveedor_fallo', 503);
      }
    }));
  }
  for (const bucket of ['defensa-trabajos', 'defensa-audio']) {
    resultados.push(await comprobar(bucket, async () => {
      const { data, error } = await db.storage.getBucket(bucket);
      if (error || !data || data.public) throw new DefensaError('no_configurado', 503);
    }));
  }
  return resultados;
}
