import type { ModoDeRespuesta, PasoAlumnoId } from './pasos';

/** Cómo debe quedar el historial del navegador al cambiar de paso. */
export type ModoDeHistorial = 'empujar' | 'reemplazar' | 'ninguno';

/**
 * Dirección de la pantalla con el paso (y las banderas) escritos en la consulta:
 * `?paso=<id>`, `&ensayo=1` y `&modo=escrito`. Así cualquier paso se puede abrir
 * o compartir directo, y el botón "atrás" del navegador regresa un paso.
 */
export function construirUrl(
  actual: Location,
  paso: PasoAlumnoId,
  ensayo: boolean,
  modo: ModoDeRespuesta,
): string {
  const parametros = new URLSearchParams(actual.search);
  parametros.set('paso', paso);
  if (ensayo) parametros.set('ensayo', '1');
  else parametros.delete('ensayo');
  if (modo === 'escrito') parametros.set('modo', 'escrito');
  else parametros.delete('modo');
  return `${actual.pathname}?${parametros.toString()}${actual.hash}`;
}
