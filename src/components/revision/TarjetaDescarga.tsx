import { Archive, Check, Download } from 'lucide-react';
import { Pildora } from './Pildora';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import type { DescargaGrupo } from './types';
import styles from './TarjetaDescarga.module.css';

interface TarjetaDescargaProps {
  descarga: DescargaGrupo;
  /** Cuántos trabajos entran en el archivo. */
  entregaron: number;
  /** Cuántos faltan y por eso no están. */
  sinEntregar: number;
  /** El archivo ya está listo y descargado. */
  lista: boolean;
  /** No se pudo armar el archivo: se dice por qué y se ofrece intentar otra vez. */
  error?: string | null;
  alDescargarOtraVez: () => void;
}

/** El archivo comprimido con todos los trabajos entregados, con su avance. */
export function TarjetaDescarga({ descarga, entregaron, sinEntregar, lista, error = null, alDescargarOtraVez }: TarjetaDescargaProps) {
  return (
    <TarjetaDeCelestea etiqueta="Descarga de trabajos" conRelleno>
      <div className={styles.fila}>
        <span className={styles.icono} aria-hidden="true">
          <Archive size={26} strokeWidth={1.8} />
        </span>
        <div className={styles.textos}>
          <span className={styles.archivo}>{descarga.archivo}</span>
          <span className={styles.detalle}>
            {`${entregaron} archivos, ${descarga.megabytes} MB`}
          </span>
        </div>
        {lista || error ? (
          <Pildora
            variante="contorno"
            alto={44}
            relleno={18}
            letra={15}
            peso={600}
            icono={<Download size={17} strokeWidth={2} aria-hidden="true" />}
            onClick={alDescargarOtraVez}
          >
            {error ? 'Intentar otra vez' : 'Descargar otra vez'}
          </Pildora>
        ) : null}
      </div>

      <div className={styles.avance}>
        <div className={styles.pista} aria-hidden="true">
          <div className={styles.relleno} />
        </div>
        <div className={styles.pie}>
          <span role="status" className={styles.estado}>
            {lista && !error ? <Check size={14} strokeWidth={2.4} aria-hidden="true" className={styles.listo} /> : null}
            {error ?? (lista ? 'Descargado' : 'Preparando…')}
          </span>
          <span>No incluye a los {sinEntregar} que no entregaron</span>
        </div>
      </div>
    </TarjetaDeCelestea>
  );
}
