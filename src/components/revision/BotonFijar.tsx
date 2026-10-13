import { Pin } from 'lucide-react';
import styles from './BotonFijar.module.css';

interface BotonFijarProps {
  fijado: boolean;
  alAlternar: () => void;
}

/**
 * "Fijar en inicio" / "Fijado en inicio". Fijar deja la respuesta de Celestea
 * como una tarjeta en el inicio ("Fijado por ti"); volver a pulsar la quita.
 */
export function BotonFijar({ fijado, alAlternar }: BotonFijarProps) {
  return (
    <button
      type="button"
      aria-pressed={fijado}
      className={fijado ? `${styles.boton} ${styles.fijado}` : styles.boton}
      onClick={alAlternar}
    >
      <Pin size={15} strokeWidth={2} aria-hidden="true" />
      {fijado ? 'Fijado en inicio' : 'Fijar en inicio'}
    </button>
  );
}
