import { variablesCss } from './variablesCss';
import styles from './BarrasDeVoz.module.css';

export type PresetBarras = 'hola' | 'pregunta' | 'opcion' | 'silencio';

interface BarrasDeVozProps {
  preset: PresetBarras;
  className?: string;
}

/** [segundos por ciclo, retraso en segundos, opacidad] de cada barra. */
type Barra = readonly [number, number, number];

const HOLA: readonly Barra[] = [
  [1.2, -0.4, 0.5],
  [0.9, -0.1, 0.6],
  [1.1, -0.7, 0.7],
  [0.8, -0.3, 0.8],
  [1, -0.9, 1],
  [1.3, -0.2, 1],
  [0.85, -0.6, 1],
  [1.15, -0.5, 1],
  [0.95, -0.8, 1],
  [1.25, -0.15, 1],
  [1.05, -0.45, 1],
  [0.9, -0.75, 1],
  [1.2, -0.35, 1],
  [0.8, -0.65, 0.8],
  [1.1, -0.25, 0.7],
  [1, -0.55, 0.6],
  [1.3, -0.85, 0.5],
];

const PREGUNTA: readonly Barra[] = [
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
  hola: { barras: HOLA, clase: styles.alta ?? '' },
  pregunta: { barras: PREGUNTA, clase: styles.alta ?? '' },
  opcion: { barras: OPCION, clase: styles.media ?? '' },
  silencio: { barras: SILENCIO, clase: styles.quieta ?? '' },
};

/**
 * Barras de voz decorativas (nunca transmiten información, por eso están
 * ocultas a los lectores de pantalla). Con movimiento reducido quedan como una
 * forma de onda fija, con alturas distintas, en lugar de animarse.
 */
export function BarrasDeVoz({ preset, className }: BarrasDeVozProps) {
  const { barras, clase } = PRESETS[preset];
  const clases = [styles.barras, clase, className ?? ''].filter(Boolean).join(' ');

  return (
    <span className={clases} aria-hidden="true">
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
          })}
        />
      ))}
    </span>
  );
}
