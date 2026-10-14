/** Reglas compartidas por la entrada del alumno y la API; sin dependencias de servidor. */
export const MAX_NOMBRE_CARACTERES = 120;

const SIN_CONTROL = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

export function limpiarNombre(nombre: string): string | null {
  const limpio = nombre.replace(SIN_CONTROL, ' ').replace(/\s+/g, ' ').trim();
  if (limpio.length < 2 || limpio.length > MAX_NOMBRE_CARACTERES) return null;
  return new RegExp('\\p{L}', 'u').test(limpio) ? limpio : null;
}

/** La matrícula se compara sin mayúsculas ni espacios. */
export function limpiarMatricula(matricula: string): string | null {
  const limpia = matricula.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9._-]{3,30}$/.test(limpia) ? limpia : null;
}
