import type {
  ErrorApi,
  PeticionAudioParte,
  PeticionDescarga,
  PeticionTiempoRevision,
  PeticionToque,
  RespuestaAudioParte,
  RespuestaDescarga,
} from '../defensa/contrato';
import type { EventoAsistente, PeticionAsistente, RespuestaAsistente } from './catalogo';
import type { TrabajoParaLeer } from './types';

/**
 * Llamadas del profesor a la API de las defensas, desde el navegador.
 *
 * El enlace firmado de la dirección (`/revision/<enlace>`) va como portador: sin cookies
 * y sin nada guardado en el navegador. Los avisos que no deben estorbar (los dos toques,
 * el tiempo de revisión) usan `keepalive` para que salgan aunque la persona cambie de
 * página justo después.
 */

export class ErrorDelProfesor extends Error {
  readonly status: number;

  constructor(mensaje: string, status = 0) {
    super(mensaje);
    this.name = 'ErrorDelProfesor';
    this.status = status;
  }
}

const SIN_RED = 'No hay conexión. Inténtalo otra vez en un momento.';

async function post<T>(ruta: string, enlace: string, cuerpo: unknown, opciones: { keepalive?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), opciones.timeoutMs ?? 20_000);
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api/defensa${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${enlace}` },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
      cache: 'no-store',
      keepalive: opciones.keepalive === true,
    });
  } catch {
    throw new ErrorDelProfesor(SIN_RED);
  } finally {
    clearTimeout(temporizador);
  }
  if (respuesta.status === 204) return undefined as T;
  let datos: unknown = null;
  try {
    datos = await respuesta.json();
  } catch {
    if (respuesta.ok) throw new ErrorDelProfesor('Algo salió raro de nuestro lado. Inténtalo otra vez.', respuesta.status);
  }
  if (!respuesta.ok) {
    const error = datos as Partial<ErrorApi> | null;
    throw new ErrorDelProfesor(error?.mensaje ?? 'Algo falló de nuestro lado. Inténtalo otra vez.', respuesta.status);
  }
  return datos as T;
}

export const apiProfesor = {
  /** "¿Domina el tema?" (antes del reporte) y "¿coincide con lo que piensas?" (al cerrarlo). */
  toque: (enlace: string, peticion: PeticionToque) => post<void>('/revision/toque', enlace, peticion, { keepalive: true }),
  /** Tiempo activo con el reporte abierto; el primer aviso (sin `aperturaId`) abre la medición. */
  tiempo: (enlace: string, peticion: PeticionTiempoRevision, keepalive = false) =>
    post<{ aperturaId: string }>('/revision/tiempo', enlace, peticion, { keepalive }),
  /** Enlace que caduca para oír el audio original de una respuesta. */
  audio: (enlace: string, peticion: PeticionAudioParte) => post<RespuestaAudioParte>('/revision/audio', enlace, peticion),
  /** Enlace que caduca para bajar un trabajo, o el zip con el último de cada alumno. */
  descarga: (enlace: string, peticion: PeticionDescarga) =>
    post<RespuestaDescarga>('/descargas', enlace, peticion, { timeoutMs: 58_000 }),
  /** El texto del trabajo de un alumno, para leerlo junto a su reporte. */
  trabajo: (enlace: string, entregaId: string) => post<TrabajoParaLeer>('/revision/trabajo', enlace, { entregaId }),
  asistente: preguntarAlAsistente,
  dictado: transcribirDictado,
};

/**
 * Le pide algo a Celestea. La respuesta llega en NDJSON: cada paso se pasa a `alPaso` en
 * cuanto llega y al final se resuelve con la respuesta ya verificada en el servidor.
 */
async function preguntarAlAsistente(
  enlace: string,
  peticion: PeticionAsistente,
  alPaso: (texto: string) => void,
): Promise<RespuestaAsistente> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 25_000);
  let respuesta: Response;
  try {
    respuesta = await fetch('/api/defensa/asistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${enlace}` },
      body: JSON.stringify(peticion),
      signal: control.signal,
      cache: 'no-store',
    });
  } catch {
    clearTimeout(temporizador);
    throw new ErrorDelProfesor(SIN_RED);
  }
  try {
    if (!respuesta.ok || !respuesta.body) {
      const error = (await respuesta.json().catch(() => null)) as Partial<ErrorApi> | null;
      throw new ErrorDelProfesor(error?.mensaje ?? 'Algo falló de nuestro lado. Inténtalo otra vez.', respuesta.status);
    }
    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let pendiente = '';
    for (;;) {
      const { done, value } = await lector.read();
      pendiente += decodificador.decode(value ?? new Uint8Array(), { stream: !done });
      const lineas = pendiente.split('\n');
      pendiente = done ? '' : (lineas.pop() ?? '');
      for (const linea of lineas) {
        if (!linea.trim()) continue;
        const evento = JSON.parse(linea) as EventoAsistente;
        if (evento.tipo === 'paso') alPaso(evento.texto);
        else if (evento.tipo === 'respuesta') return evento.respuesta;
        else throw new ErrorDelProfesor(evento.mensaje, 500);
      }
      if (done) break;
    }
    throw new ErrorDelProfesor('La respuesta llegó incompleta. Inténtalo otra vez.');
  } catch (error) {
    if (error instanceof ErrorDelProfesor) throw error;
    throw new ErrorDelProfesor(SIN_RED);
  } finally {
    clearTimeout(temporizador);
  }
}

/** Manda lo que dictó el profesor y devuelve el texto, para que lo revise antes de enviarlo. */
async function transcribirDictado(enlace: string, audio: Blob): Promise<{ texto: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/api/defensa/asistente/dictado', {
      method: 'POST',
      headers: { 'Content-Type': audio.type || 'audio/webm', Authorization: `Bearer ${enlace}` },
      body: audio,
      cache: 'no-store',
    });
  } catch {
    throw new ErrorDelProfesor(SIN_RED);
  }
  const datos = (await respuesta.json().catch(() => null)) as ({ texto?: string } & Partial<ErrorApi>) | null;
  if (!respuesta.ok || typeof datos?.texto !== 'string') {
    throw new ErrorDelProfesor(datos?.mensaje ?? 'No pude entender el audio. Inténtalo otra vez o escribe.', respuesta.status);
  }
  return { texto: datos.texto };
}

/** Empieza la descarga de un enlace firmado, sin salir de la página. */
export function bajarArchivo(url: string, nombre: string): void {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = 'noopener';
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}
