import 'server-only';

/**
 * Etiquetas de los prompts.
 *
 * Todo lo que escribe un alumno entra a un prompt dentro de una etiqueta, como
 * dato. Para que un texto no pueda abrir ni cerrar esas etiquetas (ni escribir
 * otras que parezcan del sistema), antes de insertarlo se cambia el "<" de
 * cualquier etiqueta conocida por "‹". Es la misma técnica de questionPlan.ts.
 */
export function neutralizarEtiquetas(texto: string, etiquetas: readonly string[]): string {
  const patron = new RegExp(`<\\s*(/?)\\s*(${etiquetas.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  return texto.replace(patron, '‹$1$2');
}

/** Quita caracteres de control (salvo salto de línea y tabulador) y recorta. */
export function limpiarTexto(texto: string, maximo: number): string {
  return texto
    .replace(new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g'), '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maximo);
}

export function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}
