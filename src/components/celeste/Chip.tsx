import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export type TonoChip =
  /** Etiqueta neutra de un dato ("Tarde", "Incompleta"). */
  | 'neutro'
  /** Etiqueta neutra y más apagada ("Voz", "Por escrito"). */
  | 'tenue'
  /** Algo para oír: dorado suave. */
  | 'oir'
  /** Lo que merece atención dentro de una lista: dorado con peso. */
  | 'destacado'
  /** Solo borde ("Respuesta sólida"). */
  | 'contorno'
  /** Un número pequeño al lado de un título. */
  | 'conteo'
  /** Resultado de evidencia: acompaña siempre a su símbolo y su texto. */
  | 'explico'
  | 'en-parte'
  | 'no-salio';

/** Altura en px: 22 para datos, 24 para etiquetas de bloque y 28 para el resultado de evidencia. */
export type AlturaChip = 22 | 24 | 28;

interface ChipProps {
  tono?: TonoChip;
  tamano?: AlturaChip;
  /** Icono decorativo (lucide-react o `IconoNivel`); el texto siempre acompaña. */
  icono?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Etiqueta pequeña en forma de pastilla. No es interactiva: sirve para decir un
 * estado o un dato ("Voz", "2 partes para oír", "Lo explicó") siempre con texto.
 */
export function Chip({ tono = 'neutro', tamano = 22, icono, className, children }: ChipProps) {
  const clases = [styles.chip, styles[`alto-${tamano}`] ?? '', styles[`tono-${tono}`] ?? '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={clases}>
      {icono ? <span className={styles.icono}>{icono}</span> : null}
      {children}
    </span>
  );
}
