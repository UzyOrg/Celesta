'use client';

import { useEffect, useRef } from 'react';
import { variablesCss } from './variablesCss';
import styles from './BarrasDeVoz.module.css';

/**
 * - `voz`: siguen la voz real del micrófono (con `fuente`); sin voz respiran en reposo.
 * - `opcion` y `silencio`: decorativas, con su movimiento fijo.
 */
export type PresetBarras = 'voz' | 'opcion' | 'silencio';

/** Un cuadro de la voz: altura de 0 a 1 de cada barra y si ahora mismo hay voz. */
export type AlCuadroDeVoz = (alturas: readonly number[], hayVoz: boolean) => void;

/** Lo que mide el micrófono, visto desde las barras (en el flujo del alumno es `MedidorDeVoz`). */
export interface FuenteDeVoz {
  /** Empieza a recibir cuadros para `cantidad` barras; devuelve cómo dejar de recibirlos. */
  escuchar: (cantidad: number, alCuadro: AlCuadroDeVoz) => () => void;
}

interface BarrasDeVozProps {
  preset: PresetBarras;
  /** Solo con `voz`: de dónde sale la voz. `null` = no hay a quién oír ahora; quedan en reposo. */
  fuente?: FuenteDeVoz | null;
  className?: string;
}

/** [segundos por ciclo, retraso en segundos, opacidad] de cada barra. */
type Barra = readonly [number, number, number];

/** Dieciocho barras que se apagan hacia las orillas. Con `voz` el ciclo solo da la forma fija. */
const VOZ: readonly Barra[] = [
  [1.2, -0.4, 0.4],
  [0.9, -0.1, 0.55],
  [1.1, -0.7, 0.7],
  [0.8, -0.3, 0.85],
  [1, -0.9, 1],
  [1.3, -0.2, 1],
  [0.85, -0.6, 1],
  [1.15, -0.5, 1],
  [0.95, -0.8, 1],
  [1.25, -0.15, 1],
  [1.05, -0.45, 1],
  [0.9, -0.75, 1],
  [1.2, -0.35, 1],
  [0.8, -0.65, 1],
  [1.1, -0.25, 0.85],
  [1, -0.55, 0.7],
  [1.3, -0.85, 0.55],
  [0.95, -0.05, 0.4],
];

const OPCION: readonly Barra[] = [
  [1, -0.1, 1],
  [1.2, -0.5, 1],
  [0.9, -0.3, 1],
  [1.1, -0.8, 1],
  [1.3, -0.2, 1],
  [1, -0.6, 1],
  [1.15, -0.4, 1],
  [0.95, -0.9, 1],
  [1.25, -0.7, 1],
];

/** Quince barras casi quietas, desfasadas 0,2 s: "sigo aquí, sin prisa". */
const SILENCIO: readonly Barra[] = Array.from({ length: 15 }, (_, indice): Barra => [3, -0.2 * indice, 1]);

const PRESETS: Readonly<Record<PresetBarras, { barras: readonly Barra[]; clase: string }>> = {
  voz: { barras: VOZ, clase: `${styles.alta ?? ''} ${styles.vivas ?? ''}` },
  opcion: { barras: OPCION, clase: styles.media ?? '' },
  silencio: { barras: SILENCIO, clase: styles.quieta ?? '' },
};

/** Altura de una barra en reposo (fracción de la más alta): una línea corta, no un hueco. */
const REPOSO = 0.12;
/** Por debajo de este cambio no vale la pena escribir en el estilo. */
const CAMBIO_MINIMO = 0.004;

/**
 * Barras de voz. Nunca transmiten información (el estado va en texto, "Te escucho"), por
 * eso están ocultas a los lectores de pantalla.
 *
 * Con `voz` siguen el micrófono: cada cuadro escribe `--nivel-0` … `--nivel-17` en el
 * contenedor desde una ref (nada de estado de React por cuadro) y cada barra lo usa en
 * `transform: scaleY`. Sin voz respiran muy suave. Con movimiento reducido no se escribe
 * nada por cuadro: hay dos formas fijas, en reposo y con voz (`data-voz`).
 */
export function BarrasDeVoz({ preset, fuente = null, className }: BarrasDeVozProps) {
  const { barras, clase } = PRESETS[preset];
  const clases = [styles.barras, clase, className ?? ''].filter(Boolean).join(' ');
  const contenedor = useRef<HTMLSpanElement>(null);
  const vivas = preset === 'voz';

  useEffect(() => {
    const elemento = contenedor.current;
    if (!vivas || !fuente || !elemento) return undefined;
    const reducido = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const escritas: number[] = [];
    let conVoz = false;

    const dejar = fuente.escuchar(barras.length, (alturas, hayVoz) => {
      if (hayVoz !== conVoz) {
        conVoz = hayVoz;
        if (hayVoz) elemento.setAttribute('data-voz', '');
        else elemento.removeAttribute('data-voz');
      }
      if (reducido?.matches) return;
      for (let i = 0; i < alturas.length; i += 1) {
        const escala = REPOSO + (1 - REPOSO) * (alturas[i] ?? 0);
        if (Math.abs(escala - (escritas[i] ?? REPOSO)) < CAMBIO_MINIMO) continue;
        escritas[i] = escala;
        elemento.style.setProperty(`--nivel-${i}`, escala.toFixed(3));
      }
    });

    return () => {
      dejar();
      elemento.removeAttribute('data-voz');
      for (let i = 0; i < escritas.length; i += 1) elemento.style.removeProperty(`--nivel-${i}`);
    };
  }, [vivas, fuente, barras.length]);

  return (
    <span ref={contenedor} className={clases} data-barras={preset} aria-hidden="true">
      {barras.map(([duracion, desfase, opacidad], indice) => (
        <span
          // El orden de las barras es fijo: el índice es una clave estable.
          key={indice}
          className={styles.barra}
          style={variablesCss({
            '--dur': `${duracion}s`,
            '--desfase': `${desfase}s`,
            '--opacidad': opacidad,
            // Altura de la forma fija: las barras más rápidas se ven más cortas.
            '--fija': (0.3 + ((duracion - 0.8) / 0.5) * 0.65).toFixed(2),
            // Con voz: la altura que escribe cada cuadro y, en reposo, una respiración que sale del centro.
            '--n': vivas ? `var(--nivel-${indice}, ${REPOSO})` : undefined,
            '--respira': vivas ? `${(-0.18 * Math.floor(Math.abs(indice - (barras.length - 1) / 2))).toFixed(2)}s` : undefined,
          })}
        />
      ))}
    </span>
  );
}
