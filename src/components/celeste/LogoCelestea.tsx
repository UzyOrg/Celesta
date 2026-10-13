import styles from './LogoCelestea.module.css';

interface LogoCelesteaProps {
  /** Lado del cuadrado del símbolo, en px. */
  tamano?: number;
  /** Escribe "celestea" junto al símbolo. */
  conNombre?: boolean;
  /** Gira el símbolo (estado "pensando"). */
  girando?: boolean;
  className?: string;
}

/**
 * Símbolo de Celestea: un planeta con su anillo y una luna dorada.
 * Es SVG propio (el sistema solo permite SVG a mano para el logo y el
 * personaje) y es decorativo: el nombre, cuando se muestra, va en texto.
 */
export function LogoCelestea({ tamano = 28, conNombre = false, girando = false, className }: LogoCelesteaProps) {
  // En tamaños pequeños los trazos se engrosan para que el anillo no se pierda.
  const pequeno = tamano < 26;
  const grosor = pequeno ? 1.6 : 1.2;
  const luna = pequeno ? 2.2 : 1.9;

  const simbolo = (
    <svg
      className={girando ? `${styles.simbolo} ${styles.girando}` : styles.simbolo}
      width={tamano}
      height={tamano}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        className={styles.anilloFondo}
        cx="14"
        cy="14"
        rx="12.5"
        ry="5.6"
        transform="rotate(-16 14 14)"
        fill="none"
        strokeWidth={grosor}
      />
      <circle className={styles.planeta} cx="14" cy="14" r="6.5" />
      <path
        className={styles.anilloFrente}
        d="M1.5 14 A12.5 5.6 0 0 0 26.5 14"
        transform="rotate(-16 14 14)"
        fill="none"
        strokeWidth={grosor}
      />
      <circle className={styles.luna} cx="23.6" cy="8.3" r={luna} />
    </svg>
  );

  if (!conNombre) {
    return className ? <span className={`${styles.solo} ${className}`}>{simbolo}</span> : simbolo;
  }

  return (
    <span className={className ? `${styles.marca} ${className}` : styles.marca}>
      {simbolo}
      <span className={styles.nombre}>celestea</span>
    </span>
  );
}
