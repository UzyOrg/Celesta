import 'server-only';
import { DefensaError } from '../errores';

/**
 * fetch con límite de tiempo y sin filtrar nada sensible.
 *
 * Un fallo de proveedor llega al cliente como un error nuestro, genérico; el
 * detalle (código HTTP y proveedor, nunca el cuerpo de la petición ni las
 * llaves) queda solo en el registro del servidor.
 */
export async function pedir(
  proveedor: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  try {
    const respuesta = await fetchFn(url, { ...init, signal: control.signal });
    if (!respuesta.ok) {
      console.error('defensa_proveedor_http', { proveedor, status: respuesta.status });
      throw new DefensaError('proveedor_fallo', 502);
    }
    return respuesta;
  } catch (error) {
    if (error instanceof DefensaError) throw error;
    const abortado = error instanceof Error && error.name === 'AbortError';
    console.error('defensa_proveedor_red', { proveedor, abortado });
    throw new DefensaError('proveedor_fallo', 502);
  } finally {
    clearTimeout(temporizador);
  }
}

export function exigirClave(clave: string | undefined): string {
  if (!clave) throw new DefensaError('no_configurado', 503);
  return clave;
}
