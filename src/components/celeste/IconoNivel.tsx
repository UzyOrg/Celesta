import type { NivelEvidencia } from './types';
import styles from './IconoNivel.module.css';

interface IconoNivelProps {
  nivel: NivelEvidencia;
  /** Lado en px. */
  tamano?: number;
  className?: string;
}

/** Texto visible que acompaña siempre al símbolo: el color por sí solo nunca basta. */
export const ETIQUETA_NIVEL: Readonly<Record<NivelEvidencia, string>> = {
  explico: 'Lo explicó',
  'en-parte': 'En parte',
  'no-salio': 'No salió',
};

/**
 * Símbolo de la escala ordinal de evidencia: círculo lleno, medio círculo, aro vacío.
 * Es decorativo; el nombre del nivel va siempre en texto al lado.
 */
export function IconoNivel({ nivel, tamano = 12, className }: IconoNivelProps) {
  return (
    <svg
      className={className ? `${styles.icono} ${className}` : styles.icono}
      width={tamano}
      height={tamano}
      viewBox="0 0 14 14"
      aria-hidden="true"
      focusable="false"
    >
      {nivel === 'explico' ? <circle className={styles.explico} cx="7" cy="7" r="6" /> : null}
      {nivel === 'en-parte' ? (
        <>
          <circle className={styles.parteAro} cx="7" cy="7" r="5.2" fill="none" strokeWidth="1.6" />
          <path className={styles.parteMitad} d="M7 1.8 A5.2 5.2 0 0 0 7 12.2 Z" />
        </>
      ) : null}
      {nivel === 'no-salio' ? <circle className={styles.noSalio} cx="7" cy="7" r="5.2" fill="none" strokeWidth="1.8" /> : null}
    </svg>
  );
}
