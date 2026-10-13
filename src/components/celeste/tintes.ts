import type { TinteAvatar } from './types';

/**
 * Tintes de avatar de los diseños aprobados (Prof2-Inicio). El color sale de un
 * hash del nombre natural, así que la misma persona siempre tiene el mismo.
 */
const TINTES: readonly TinteAvatar[] = [
  { fondo: '#1B2A4A', tinta: '#A9D6FF' },
  { fondo: '#2A2147', tinta: '#C9B8FF' },
  { fondo: '#123330', tinta: '#8EE3D0' },
  { fondo: '#3A2E14', tinta: '#FFD98A' },
  { fondo: '#3A1F2C', tinta: '#FFB3CC' },
];

/** Tinte estable por nombre natural ("Ana Torres Ruiz"): el mismo nombre, el mismo color. */
export function tinteDeAvatar(nombre: string): TinteAvatar {
  let hash = 0;
  for (const caracter of nombre) {
    hash = (hash * 31 + caracter.charCodeAt(0)) % 9973;
  }
  return TINTES[hash % TINTES.length] as TinteAvatar;
}
