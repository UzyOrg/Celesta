'use client';

import { useId } from 'react';
import { retraso } from './variablesCss';
import animaciones from './animaciones.module.css';
import styles from './Interruptor.module.css';

interface InterruptorProps {
  /** Lo que la persona acepta o confirma. Es el nombre accesible del interruptor. */
  etiqueta: string;
  marcado: boolean;
  alCambiar: (marcado: boolean) => void;
  /** Retraso de entrada (en segundos) para escalonar varias filas. */
  entrada?: number;
  className?: string;
}

/**
 * Fila con un interruptor de 52 x 32 px (toda la fila es el área táctil).
 * Es un `<input type="checkbox" role="switch">` real: se maneja con Espacio, lo
 * anuncia el lector de pantalla y el foco se ve sobre la pista.
 */
export function Interruptor({ etiqueta, marcado, alCambiar, entrada = 0, className }: InterruptorProps) {
  const id = useId();
  const clases = [styles.fila, animaciones.entra, className ?? ''].filter(Boolean).join(' ');

  return (
    <label className={clases} htmlFor={id} style={retraso(entrada, 0.5)}>
      <input
        id={id}
        className={styles.entrada}
        type="checkbox"
        role="switch"
        checked={marcado}
        onChange={(evento) => alCambiar(evento.target.checked)}
      />
      <span className={styles.texto}>{etiqueta}</span>
      <span className={styles.pista} aria-hidden="true">
        <span className={styles.bolita} />
      </span>
    </label>
  );
}
