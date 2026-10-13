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
