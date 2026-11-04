import type { DatosGrupo } from '../types';

/**
 * Punto de extensión de la barra de Celestea en el inicio del profesor.
 *
 * Una extensión agrega una acción que Celestea puede ofrecer (por ejemplo
 * `crear_actividad`) sin tocar `InicioAgentico`, el servicio del asistente ni su
 * validador:
 *
 *   1. Crea `extensiones/<tuExtension>.ts` y exporta un `ExtensionDeBarra`.
 *   2. Agrégala a `EXTENSIONES_DE_BARRA` aquí abajo (una línea).
 *
 * Qué pasa entonces:
 *   - En el navegador, si lo que escribe el profesor coincide con `reglas`, se
 *     llama a `ejecutar` directamente, sin preguntarle al modelo.
 *   - En el servidor, si `disponible(grupo)` es verdadero, `descripcionParaModelo`
 *     entra al catálogo como una acción; el modelo puede elegirla con
 *     `{ tipo: 'accion', props: { id } }` y el navegador llama a `ejecutar`.
 *   - `ejecutar` solo corre por un pedido del profesor; si la acción cambia algo
 *     (crear, borrar, enviar), debe pedir su confirmación con un toque.
 *
 * Este módulo lo importan el servidor y el navegador: sin `server-only` ni
 * `'use client'`, y sin importar nada que solo exista en uno de los dos.
 */

export interface ContextoDeExtension {
  /** Enlace del profesor, para armar direcciones como `/revision/<token>/nueva`. */
  token: string;
  /** `false` en el escenario de ejemplo. */
  conectado: boolean;
  irA: (ruta: string) => void;
  avisar: (mensaje: string) => void;
}

export interface ExtensionDeBarra {
  /** Estable y corto, en minúsculas con guion bajo: `crear_actividad`. */
  id: string;
  /** Respaldo local, sobre el texto sin acentos y en minúsculas. */
  reglas: RegExp;
  /** Una línea para el modelo: cuándo elegir esta acción. Sin datos de alumnos. */
  descripcionParaModelo: string;
  /** Si se ofrece con este grupo (por ejemplo, solo con datos reales). */
  disponible: (grupo: DatosGrupo) => boolean;
  ejecutar: (ctx: ContextoDeExtension) => void;
}

export const EXTENSIONES_DE_BARRA: readonly ExtensionDeBarra[] = [];

/** Las extensiones que se ofrecen con este grupo. */
export function extensionesDisponibles(grupo: DatosGrupo): ExtensionDeBarra[] {
  return EXTENSIONES_DE_BARRA.filter((extension) => extension.disponible(grupo));
}

/** La primera extensión cuyas reglas coinciden con el texto ya normalizado. */
export function extensionPorReglas(textoNormalizado: string, grupo: DatosGrupo): ExtensionDeBarra | null {
  return extensionesDisponibles(grupo).find((extension) => extension.reglas.test(textoNormalizado)) ?? null;
}

export function extensionPorId(id: string, grupo: DatosGrupo): ExtensionDeBarra | null {
  return extensionesDisponibles(grupo).find((extension) => extension.id === id) ?? null;
}
