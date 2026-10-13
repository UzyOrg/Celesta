import type {
  ErrorApi,
  PeticionAudioParte,
  PeticionDescarga,
  PeticionTiempoRevision,
  PeticionToque,
  RespuestaAudioParte,
  RespuestaDescarga,
} from '../defensa/contrato';

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
};

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
