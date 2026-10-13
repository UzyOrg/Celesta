import 'server-only';
import { DefensaError } from '../errores';
import { exigirClave, pedir } from './http';
import type { AudioSintetizado, ProveedorTts } from './tipos';

/**
 * Voz de Celestea con ElevenLabs.
 *
 * Las preguntas se sintetizan UNA vez, al armar el plan, y se guardan en el
 * bucket de audio. Durante la defensa no se sintetiza nada: el navegador solo
 * reproduce un archivo ya hecho, así el costo y la latencia no dependen de
 * cuántas veces se repita una pregunta.
 */

export interface CredencialesTts {
  clave: () => string | undefined;
  voz: () => string | undefined;
  modelo: () => string;
  /** Pide a ElevenLabs que no conserve el texto (modo sin registro; depende del plan contratado). */
  sinRegistro?: () => boolean;
  fetchFn?: typeof fetch;
}

export function crearTtsElevenlabs(credenciales: CredencialesTts): ProveedorTts {
  return {
    id: 'elevenlabs',
    async sintetizar(texto: string, opciones: { timeoutMs: number }): Promise<AudioSintetizado> {
      const clave = exigirClave(credenciales.clave());
      const voz = credenciales.voz();
      if (!voz) throw new DefensaError('no_configurado', 503);

      const parametros = new URLSearchParams({ output_format: 'mp3_44100_64' });
      if (credenciales.sinRegistro?.()) parametros.set('enable_logging', 'false');

      const respuesta = await pedir(
        'elevenlabs',
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz)}?${parametros.toString()}`,
        {
          method: 'POST',
          headers: { 'xi-api-key': clave, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: texto, model_id: credenciales.modelo() }),
        },
        opciones.timeoutMs,
        credenciales.fetchFn,
      );
      const bytes = new Uint8Array(await respuesta.arrayBuffer());
      // Un mp3 de una frase pesa varios KB; algo menor es una respuesta vacía o un error disfrazado.
      if (bytes.byteLength < 512) {
        console.error('defensa_tts_vacio', { proveedor: 'elevenlabs', bytes: bytes.byteLength });
        throw new DefensaError('proveedor_fallo', 502);
      }
      return { bytes, mime: 'audio/mpeg', extension: 'mp3' };
    },
  };
}
