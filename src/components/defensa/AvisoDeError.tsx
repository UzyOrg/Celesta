import { AlertCircle } from 'lucide-react';
import styles from './AvisoDeError.module.css';

interface AvisoDeErrorProps {
  /** Frase en español, sin tecnicismos ni culpa. Nada si no hay nada que avisar. */
  mensaje: string | null | undefined;
}

/**
 * Una línea tranquila encima del botón principal cuando algo no salió. El mensaje
 * explica qué hacer; la región se anuncia a los lectores de pantalla.
 */
export function AvisoDeError({ mensaje }: AvisoDeErrorProps) {
  return (
    <div role="alert" aria-live="assertive" className={styles.region}>
      {mensaje ? (
        <p className={styles.aviso}>
          <AlertCircle size={16} strokeWidth={2} aria-hidden="true" className={styles.icono} />
          <span>{mensaje}</span>
        </p>
      ) : null}
    </div>
  );
}
