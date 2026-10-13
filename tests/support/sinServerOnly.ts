/**
 * Las pruebas importan módulos del servidor directo, sin pasar por Next.
 *
 * `server-only` está hecho para fallar fuera del servidor de Next (su exportación
 * por defecto lanza un error); aquí lo dejamos pasar. Importa este archivo
 * PRIMERO en cada prueba: las importaciones se ejecutan en orden.
 */
import Module from 'node:module';

type Cargador = (peticion: string, ...resto: unknown[]) => unknown;

const modulo = Module as unknown as { _load: Cargador };
const cargadorOriginal = modulo._load;

modulo._load = function cargarSinServerOnly(this: unknown, peticion: string, ...resto: unknown[]) {
  if (peticion === 'server-only') return {};
  return cargadorOriginal.call(this, peticion, ...resto);
};
