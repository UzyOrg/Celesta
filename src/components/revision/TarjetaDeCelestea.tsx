import type { ReactNode } from 'react';
import { BotonFijar } from './BotonFijar';
import styles from './TarjetaDeCelestea.module.css';

interface TarjetaDeCelesteaProps {
  /** Nombre accesible de la tarjeta. */
  etiqueta: string;
  /** Título de la cabecera. Sin título no hay cabecera (descarga y lista). */
  titulo?: string;
  /** Si la tarjeta se puede fijar en el inicio, su estado y cómo cambiarlo. */
  fijable?: { fijado: boolean; alAlternar: () => void };
  /** Recorta lo que se salga de las esquinas (la lista por estado). */
  recortar?: boolean;
  /** Cuerpo con relleno y separación propios (la tarjeta de descarga). */
  conRelleno?: boolean;
  children: ReactNode;
}

/**
 * Tarjeta con la que Celestea responde: aparece debajo de su frase, sangrada a
 * la altura del texto. Cuando tiene cabecera, ahí vive el botón de fijar.
 */
export function TarjetaDeCelestea({
  etiqueta,
  titulo,
  fijable,
  recortar = false,
  conRelleno = false,
  children,
}: TarjetaDeCelesteaProps) {
  const clases = [styles.tarjeta, recortar ? styles.recortar : '', conRelleno ? styles.conRelleno : '']
    .filter(Boolean)
    .join(' ');
  return (
    <article aria-label={etiqueta} className={clases}>
      {titulo ? (
        <header className={styles.cabecera}>
          <span className={styles.titulo}>{titulo}</span>
          {fijable ? <BotonFijar fijado={fijable.fijado} alAlternar={fijable.alAlternar} /> : null}
        </header>
      ) : null}
      {children}
    </article>
  );
}
