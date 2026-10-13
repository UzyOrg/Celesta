/**
 * Tipos compartidos por las dos superficies (alumno y profesor).
 *
 * Aquí solo vive lo que los componentes de `celeste/` necesitan conocer; los
 * contratos de datos de cada superficie están en `defensa/types.ts` y
 * `revision/types.ts`.
 */

/**
 * Escala ordinal de evidencia: lo que un alumno logró explicar de un objetivo.
 * Nunca es un número ni un porcentaje, y siempre se muestra con texto o símbolo
 * además del color.
 */
export type NivelEvidencia = 'explico' | 'en-parte' | 'no-salio';

/** Colores de un avatar de iniciales: fondo oscuro y letra clara del mismo tinte. */
export interface TinteAvatar {
  fondo: string;
  tinta: string;
}
