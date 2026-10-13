import type { ReactNode } from 'react';
import { AvatarCelestea } from '../celeste/AvatarCelestea';
import styles from './LineaDeCelestea.module.css';

interface LineaDeCelesteaProps {
  /** "pensando" muestra el símbolo girando y el texto de espera, anunciado con `role="status"`. */
  pensando?: boolean;
  children: ReactNode;
}

/**
 * Una línea de Celestea: su símbolo a la izquierda y lo que dice a la derecha.
 * Las respuestas con tarjeta empiezan siempre con una línea como esta, que
 * resume en una frase lo que la tarjeta muestra.
 */
export function LineaDeCelestea({ pensando = false, children }: LineaDeCelesteaProps) {
  if (pensando) {
    return (
      <div role="status" className={`${styles.linea} ${styles.pensando}`}>
        <AvatarCelestea tamano={32} pensando />
        <span className={styles.textoPensando}>{children}</span>
      </div>
    );
  }
  return (
    <div className={styles.linea}>
      <AvatarCelestea tamano={32} />
      <p className={styles.texto}>{children}</p>
    </div>
  );
}
