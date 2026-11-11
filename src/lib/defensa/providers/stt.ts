import 'server-only';
import { DefensaError } from '../errores';
import { exigirClave, pedir } from './http';
import type { OpcionesTranscripcion, PalabraTranscrita, ProveedorStt, Transcripcion } from './tipos';

/**
 * Adaptadores de transcripción: Deepgram y AssemblyAI.
 *
 * El requisito para elegir proveedor es que devuelva la confianza y el momento
 * de cada palabra: de ahí sale la aclaración puntual ("No te entendí esta
 * parte"). Un proveedor que solo dé texto corrido no cabe en esta interfaz.
 */

export interface CredencialesStt {
  clave: () => string | undefined;
  modelo: () => string | undefined;
  fetchFn?: typeof fetch;
  /** Pausa entre consultas de AssemblyAI; las pruebas la ponen en 0. */
  esperaSondeoMs?: number;
}

/** "audio/webm;codecs=opus" → "audio/webm": los dos proveedores detectan el códec solos. */
function mimeBase(mime: string): string {
  return (mime.split(';')[0] ?? 'application/octet-stream').trim().toLowerCase();
}

function numeroFinito(valor: unknown, porDefecto = 0): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : porDefecto;
}

function limitarConfianza(valor: unknown): number {
  return Math.min(1, Math.max(0, numeroFinito(valor, 0)));
}

interface PalabraDeepgram {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  confidence?: number;
}

interface RespuestaDeepgram {
  metadata?: { duration?: number };
  results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; words?: PalabraDeepgram[] }> }> };
}

export function crearSttDeepgram(credenciales: CredencialesStt): ProveedorStt {
  return {
    id: 'deepgram',
    async transcribir(audio: Uint8Array, mime: string, opciones: OpcionesTranscripcion): Promise<Transcripcion> {
      const clave = exigirClave(credenciales.clave());
      const modelo = credenciales.modelo() ?? 'nova-3';
      const parametros = new URLSearchParams({
        model: modelo,
        language: opciones.idioma,
        punctuate: 'true',
        smart_format: 'true',
        // Sin retención para mejorar modelos: ningún dato se usa para entrenar.
        mip_opt_out: 'true',
      });
      const respuesta = await pedir(
        'deepgram',
        `https://api.deepgram.com/v1/listen?${parametros.toString()}`,
        {
          method: 'POST',
          headers: { Authorization: `Token ${clave}`, 'Content-Type': mimeBase(mime) },
          body: audio as unknown as BodyInit,
        },
        opciones.timeoutMs,
        credenciales.fetchFn,
      );
      const datos = (await respuesta.json()) as RespuestaDeepgram;
      const alternativa = datos.results?.channels?.[0]?.alternatives?.[0];
      const palabras: PalabraTranscrita[] = (alternativa?.words ?? []).flatMap((p) => {
        const texto = (p.punctuated_word ?? p.word ?? '').trim();
        if (!texto) return [];
        return [
          {
            texto,
            inicioMs: Math.round(numeroFinito(p.start) * 1000),
            finMs: Math.round(numeroFinito(p.end) * 1000),
            confianza: limitarConfianza(p.confidence),
          },
        ];
      });
      return {
        texto: palabras.map((p) => p.texto).join(' '),
        palabras,
        duracionMs: Math.round(numeroFinito(datos.metadata?.duration) * 1000),
        proveedor: 'deepgram',
        modelo,
      };
    },
  };
}

interface PalabraAssemblyai {
  text?: string;
  start?: number;
  end?: number;
  confidence?: number;
}

interface TranscripcionAssemblyai {
  id?: string;
  status?: 'queued' | 'processing' | 'completed' | 'error';
  text?: string | null;
  words?: PalabraAssemblyai[] | null;
  audio_duration?: number | null;
}

const BASE_ASSEMBLYAI = 'https://api.assemblyai.com/v2';

export function crearSttAssemblyai(credenciales: CredencialesStt): ProveedorStt {
  const espera = credenciales.esperaSondeoMs ?? 1_000;
  return {
    id: 'assemblyai',
    async transcribir(audio: Uint8Array, mime: string, opciones: OpcionesTranscripcion): Promise<Transcripcion> {
      const clave = exigirClave(credenciales.clave());
      const modelo = credenciales.modelo();
      const limite = Date.now() + opciones.timeoutMs;
      const restante = () => Math.max(1_000, limite - Date.now());
      const encabezados = { authorization: clave };

      const subida = await pedir(
        'assemblyai',
        `${BASE_ASSEMBLYAI}/upload`,
        {
          method: 'POST',
          headers: { ...encabezados, 'Content-Type': 'application/octet-stream' },
          body: audio as unknown as BodyInit,
        },
        restante(),
        credenciales.fetchFn,
      );
      const { upload_url: urlAudio } = (await subida.json()) as { upload_url?: string };
      if (!urlAudio) throw new DefensaError('proveedor_fallo', 502);

      const creada = await pedir(
        'assemblyai',
        `${BASE_ASSEMBLYAI}/transcript`,
        {
          method: 'POST',
          headers: { ...encabezados, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_url: urlAudio,
            language_code: opciones.idioma,
            punctuate: true,
            format_text: true,
            ...(modelo ? { speech_model: modelo } : {}),
          }),
        },
        restante(),
        credenciales.fetchFn,
      );
      const { id } = (await creada.json()) as { id?: string };
      if (!id) throw new DefensaError('proveedor_fallo', 502);

      for (;;) {
        const consulta = await pedir(
          'assemblyai',
          `${BASE_ASSEMBLYAI}/transcript/${encodeURIComponent(id)}`,
          { method: 'GET', headers: encabezados },
          restante(),
          credenciales.fetchFn,
        );
        const datos = (await consulta.json()) as TranscripcionAssemblyai;
        if (datos.status === 'error') {
          console.error('defensa_stt_error', { proveedor: 'assemblyai' });
          throw new DefensaError('proveedor_fallo', 502);
        }
        if (datos.status === 'completed') {
          const palabras: PalabraTranscrita[] = (datos.words ?? []).flatMap((p) => {
            const texto = (p.text ?? '').trim();
            if (!texto) return [];
            return [
              {
                texto,
                inicioMs: Math.round(numeroFinito(p.start)),
                finMs: Math.round(numeroFinito(p.end)),
                confianza: limitarConfianza(p.confidence),
              },
            ];
          });
          return {
            texto: palabras.map((p) => p.texto).join(' '),
            palabras,
            duracionMs: Math.round(numeroFinito(datos.audio_duration) * 1000),
            proveedor: 'assemblyai',
            modelo: modelo ?? 'predeterminado',
          };
        }
        if (Date.now() >= limite) {
          console.error('defensa_stt_tiempo', { proveedor: 'assemblyai' });
          throw new DefensaError('proveedor_fallo', 502);
        }
        await new Promise((resolver) => setTimeout(resolver, espera));
      }
    },
  };
}

interface PalabraElevenlabs {
  text?: string;
  start?: number | null;
  end?: number | null;
  type?: string;
  logprob?: number | null;
}

interface RespuestaElevenlabs {
  text?: string;
  words?: PalabraElevenlabs[] | null;
  audio_duration_secs?: number | null;
}

/** Extensión para el nombre del archivo; ElevenLabs detecta el formato por el contenido. */
function extensionDeAudio(mime: string): string {
  const base = mimeBase(mime);
  if (base.includes('webm')) return 'webm';
  if (base.includes('mp4') || base.includes('m4a') || base.includes('aac')) return 'm4a';
  if (base.includes('ogg')) return 'ogg';
  if (base.includes('wav')) return 'wav';
  if (base.includes('mpeg') || base.includes('mp3')) return 'mp3';
  return 'audio';
}

export interface CredencialesSttElevenlabs extends CredencialesStt {
  /** Modo sin registro (`enable_logging=false`): solo lo permiten los planes enterprise. */
  sinRegistro?: () => boolean;
}

/**
 * Scribe v2 por lotes (no el de tiempo real): se sube la grabación completa y vuelve el texto con
 * el momento y el `logprob` de cada palabra. La confianza es la probabilidad, `exp(logprob)`.
 *
 * Es otra escala que la de Deepgram o AssemblyAI: el umbral de DEFENSA_UMBRAL_CONFIANZA hay que
 * calibrarlo con audio real de este proveedor antes de fijarlo.
 */
export function crearSttElevenlabs(credenciales: CredencialesSttElevenlabs): ProveedorStt {
  return {
    id: 'elevenlabs',
    async transcribir(audio: Uint8Array, mime: string, opciones: OpcionesTranscripcion): Promise<Transcripcion> {
      const clave = exigirClave(credenciales.clave());
      const modelo = credenciales.modelo() ?? 'scribe_v2';
      const formulario = new FormData();
      formulario.append('model_id', modelo);
      // "es-419" → "es": el servicio acepta el código de idioma sin región.
      formulario.append('language_code', (opciones.idioma.split('-')[0] ?? 'es').toLowerCase());
      formulario.append('timestamps_granularity', 'word');
      // Sin "(risas)" ni otros sonidos entre las palabras: solo lo que dijo la persona.
      formulario.append('tag_audio_events', 'false');
      formulario.append('diarize', 'false');
      formulario.append('file', new Blob([audio as unknown as BlobPart], { type: mimeBase(mime) }), `respuesta.${extensionDeAudio(mime)}`);

      const parametros = credenciales.sinRegistro?.() ? '?enable_logging=false' : '';
      const respuesta = await pedir(
        'elevenlabs',
        `https://api.elevenlabs.io/v1/speech-to-text${parametros}`,
        { method: 'POST', headers: { 'xi-api-key': clave }, body: formulario },
        opciones.timeoutMs,
        credenciales.fetchFn,
      );
      const datos = (await respuesta.json()) as RespuestaElevenlabs;
      const palabras: PalabraTranscrita[] = (datos.words ?? []).flatMap((p) => {
        // Solo palabras: los espacios y los sonidos de fondo no son parte de la respuesta.
        if (p.type !== undefined && p.type !== 'word') return [];
        const texto = (p.text ?? '').trim();
        if (!texto) return [];
        return [
          {
            texto,
            inicioMs: Math.round(numeroFinito(p.start) * 1000),
            finMs: Math.round(numeroFinito(p.end) * 1000),
            // Sin logprob se da por segura: es mejor no pedir aclaraciones que pedirlas por todo.
            confianza: typeof p.logprob === 'number' && Number.isFinite(p.logprob) ? limitarConfianza(Math.exp(p.logprob)) : 1,
          },
        ];
      });
      const ultima = palabras[palabras.length - 1];
      return {
        texto: palabras.map((p) => p.texto).join(' '),
        palabras,
        duracionMs: Math.round(numeroFinito(datos.audio_duration_secs) * 1000) || (ultima ? ultima.finMs : 0),
        proveedor: 'elevenlabs',
        modelo,
      };
    },
  };
}
