import type {
  CodigoErrorApi,
  ErrorApi,
  EstadoSesionCliente,
  PeticionAclarar,
  PeticionResponder,
  PeticionSesion,
  RespuestaDefensa,
  RespuestaEntregaArchivo,
  RespuestaEntregaTexto,
  RespuestaSesion,
  EntregaCliente,
  EstadoPlanCliente,
} from './contrato';

/**
 * Cliente de la API de las defensas, para el navegador.
 *
 * Pensado para un celular barato con datos móviles: cada llamada tiene límite de
 * tiempo, un fallo de red es un error con nombre (`sin_red`) y no una excepción
 * suelta, y lo que se puede repetir sin riesgo (subir una parte de audio, pedir el
 * estado) se reintenta con espera creciente.
 */

export type CodigoErrorCliente = CodigoErrorApi | 'sin_red' | 'tiempo_agotado' | 'respuesta_invalida';

export class ErrorDeApi extends Error {
  readonly codigo: CodigoErrorCliente;
  readonly status: number;
  readonly detalle?: Record<string, unknown>;

  constructor(codigo: CodigoErrorCliente, mensaje: string, status = 0, detalle?: Record<string, unknown>) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.codigo = codigo;
    this.status = status;
    this.detalle = detalle;
  }

  /** Falló la conexión (o tardó demasiado): reintentar tiene sentido. */
  get esDeRed(): boolean {
    return this.codigo === 'sin_red' || this.codigo === 'tiempo_agotado';
  }
}

const MENSAJE_SIN_RED = 'Parece que no hay conexión. Lo que ya hiciste está guardado; inténtalo otra vez en un momento.';

interface OpcionesLlamada {
  metodo?: 'GET' | 'POST' | 'PUT';
  sesion?: string | null;
  cuerpo?: unknown;
  bytes?: Blob | ArrayBuffer | Uint8Array;
  timeoutMs?: number;
}

const BASE = '/api/defensa';

async function llamar<T>(ruta: string, opciones: OpcionesLlamada = {}): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), opciones.timeoutMs ?? 20_000);
  const encabezados: Record<string, string> = {};
  if (opciones.sesion) encabezados.Authorization = `Bearer ${opciones.sesion}`;
  let body: BodyInit | undefined;
  if (opciones.cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json';
    body = JSON.stringify(opciones.cuerpo);
  } else if (opciones.bytes !== undefined) {
    encabezados['Content-Type'] = 'application/octet-stream';
    body = opciones.bytes as BodyInit;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: opciones.metodo ?? (body !== undefined ? 'POST' : 'GET'),
      headers: encabezados,
      body,
      signal: control.signal,
      cache: 'no-store',
    });
  } catch (error) {
    const agotado = error instanceof DOMException && error.name === 'AbortError';
    throw new ErrorDeApi(agotado ? 'tiempo_agotado' : 'sin_red', MENSAJE_SIN_RED);
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.status === 204) return undefined as T;
  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    if (respuesta.ok) throw new ErrorDeApi('respuesta_invalida', 'Algo salió raro de nuestro lado. Inténtalo otra vez.', respuesta.status);
  }
  if (!respuesta.ok) {
    const error = cuerpo as Partial<ErrorApi> | null;
    throw new ErrorDeApi(
      (error?.error as CodigoErrorCliente | undefined) ?? 'proveedor_fallo',
      error?.mensaje ?? 'Algo falló de nuestro lado. Inténtalo otra vez.',
      respuesta.status,
      error?.detalle,
    );
  }
  return cuerpo as T;
}

/** Repite una operación segura mientras falle por la red, con espera creciente (1 s, 2 s, 4 s...). */
export async function conReintentos<T>(
  operacion: () => Promise<T>,
  opciones: { intentos?: number; esperaMs?: number; espera?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const intentos = opciones.intentos ?? 4;
  const espera = opciones.espera ?? ((ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms)));
  let ultimo: unknown;
  for (let i = 0; i < intentos; i += 1) {
    try {
      return await operacion();
    } catch (error) {
      ultimo = error;
      if (!(error instanceof ErrorDeApi) || !error.esDeRed || i === intentos - 1) throw error;
      await espera((opciones.esperaMs ?? 1_000) * 2 ** i);
    }
  }
  throw ultimo;
}

export const api = {
  iniciarSesion: (peticion: PeticionSesion) => llamar<RespuestaSesion>('/sesion', { cuerpo: peticion }),
  estado: (sesion: string) => llamar<EstadoSesionCliente>('/estado', { sesion, timeoutMs: 15_000 }),

  entregaArchivo: (sesion: string, archivo: { nombre: string; bytes: number; mime: string }) =>
    llamar<RespuestaEntregaArchivo>('/entrega', { sesion, cuerpo: { tipo: 'archivo', ...archivo } }),
  entregaTexto: (sesion: string, texto: string) =>
    llamar<RespuestaEntregaTexto>('/entrega', { sesion, cuerpo: { tipo: 'texto', texto }, timeoutMs: 40_000 }),
  subirArchivoPorApi: (sesion: string, entregaId: string, archivo: Blob) =>
    llamar<void>(`/entrega/${entregaId}/archivo`, { sesion, metodo: 'PUT', bytes: archivo, timeoutMs: 90_000 }),
  confirmarEntrega: (sesion: string, entregaId: string) =>
    llamar<RespuestaEntregaTexto>(`/entrega/${entregaId}/confirmar`, { sesion, metodo: 'POST', cuerpo: {}, timeoutMs: 45_000 }),
  plan: (sesion: string) => llamar<{ plan: EstadoPlanCliente }>('/plan', { sesion, metodo: 'POST', cuerpo: {} }),

  iniciarDefensa: (sesion: string, ensayo: boolean) => llamar<RespuestaDefensa>('/defensas', { sesion, cuerpo: { ensayo } }),
  subirParte: (sesion: string, turnoId: string, intento: number, parte: number, bytes: Blob) =>
    llamar<void>(`/turnos/${turnoId}/audio?i=${parte}&intento=${intento}`, { sesion, metodo: 'PUT', bytes, timeoutMs: 30_000 }),
  responder: (sesion: string, turnoId: string, peticion: PeticionResponder) =>
    llamar<RespuestaDefensa>(`/turnos/${turnoId}/responder`, { sesion, cuerpo: peticion, timeoutMs: 55_000 }),
  aclarar: (sesion: string, turnoId: string, peticion: PeticionAclarar) =>
    llamar<RespuestaDefensa>(`/turnos/${turnoId}/aclarar`, { sesion, cuerpo: peticion, timeoutMs: 55_000 }),
  marcar: (sesion: string, turnoId: string, tipo: 'repeticion' | 'silencio') =>
    llamar<void>(`/turnos/${turnoId}/marca`, { sesion, cuerpo: { tipo } }),
  entregarDefensa: (sesion: string, defensaId: string, marcas: Array<{ turnoId: string; linea: string }>) =>
    llamar<RespuestaDefensa>(`/defensas/${defensaId}/entregar`, { sesion, cuerpo: { marcas } }),
  estres: (sesion: string, defensaId: string, nivel: number) =>
    llamar<void>(`/defensas/${defensaId}/estres`, { sesion, cuerpo: { nivel } }),
  salir: (sesion: string, defensaId: string) => llamar<void>(`/defensas/${defensaId}/salir`, { sesion, cuerpo: {} }),
};

/**
 * Sube el archivo directo al bucket con el enlace firmado que dio el servidor. Devuelve
 * `false` si no se pudo (red, bloqueo del navegador, enlace vencido) para que se use el
 * respaldo por la API, que acepta hasta 4 MB.
 */
export async function subirDirectoAlBucket(subida: { url: string }, archivo: Blob): Promise<boolean> {
  try {
    const formulario = new FormData();
    formulario.append('cacheControl', '3600');
    // Supabase Storage espera el archivo en un campo sin nombre (así lo hace supabase-js).
    formulario.append('', archivo);
    const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const respuesta = await fetch(subida.url, {
      method: 'PUT',
      body: formulario,
      headers: { 'x-upsert': 'false', ...(llave ? { apikey: llave, Authorization: `Bearer ${llave}` } : {}) },
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}

export type { EntregaCliente };
