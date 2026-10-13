import type { CSSProperties } from 'react';

/** Variables CSS personalizadas (`--retraso`, `--o`...) permitidas en `style`. */
export type VariablesCss = Readonly<Record<`--${string}`, string | number | undefined>>;

/**
 * React tipa `style` solo con propiedades CSS conocidas. Esta función permite
 * pasar variables personalizadas (como el retraso escalonado de una entrada)
 * sin recurrir a `as` en cada uso.
 */
export function variablesCss(variables: VariablesCss, extra?: CSSProperties): CSSProperties {
  return { ...extra, ...(variables as CSSProperties) };
}

/** Retraso escalonado para las entradas: `retraso(0.15)` -> "--retraso: 0.15s". */
export function retraso(segundos: number, duracion?: number): CSSProperties {
  return variablesCss({
    '--retraso': `${segundos}s`,
    '--duracion': duracion === undefined ? undefined : `${duracion}s`,
  });
}
