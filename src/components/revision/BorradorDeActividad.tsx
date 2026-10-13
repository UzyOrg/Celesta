import { Pencil } from 'lucide-react';
import type { AvanceBorrador } from './nueva';
import { Pildora } from './Pildora';
import type { CampoBorrador } from './types';
import styles from './BorradorDeActividad.module.css';

interface BorradorDeActividadProps {
  campos: readonly CampoBorrador[];
  avance: AvanceBorrador;
  /** Se puede crear el enlace. */
  listo: boolean;
  rutaEnlace: string;
  alEditarAMano: () => void;
}

/**
 * El borrador de la actividad a la derecha de la conversación: cada respuesta
 * llena un campo (con un destello breve) y la barra muestra cuánto falta.
 * "Crear enlace" se enciende cuando termina la conversación.
 */
export function BorradorDeActividad({ campos, avance, listo, rutaEnlace, alEditarAMano }: BorradorDeActividadProps) {
  return (
    <aside aria-labelledby="titulo-borrador" className={styles.borrador}>
      <div className={styles.cabecera}>
        <h2 id="titulo-borrador" className={styles.titulo}>
          Borrador
          <span className={styles.avance}>{avance.texto}</span>
        </h2>
        <button type="button" className={styles.editar} onClick={alEditarAMano}>
          <Pencil size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
          Editar a mano
        </button>
      </div>

      <div className={styles.pista} aria-hidden="true">
        <div className={styles.relleno} style={{ transform: `scaleX(${avance.fraccion})` }} />
      </div>

      <dl className={styles.campos}>
        {campos.map((campo) => (
          <div key={campo.id} className={campo.reciente ? `${styles.campo} ${styles.reciente}` : styles.campo}>
            <dt className={styles.nombre}>{campo.nombre}</dt>
            {campo.valor !== null ? (
              <dd className={styles.valor}>{campo.valor}</dd>
            ) : (
              <dd className={styles.pendiente}>Pendiente</dd>
            )}
          </div>
        ))}
      </dl>

      <div className={styles.pie}>
        {listo ? (
          <Pildora href={rutaEnlace} alto={52} letra={16} peso={650} ancho="completo">
            Crear enlace
          </Pildora>
        ) : (
          <button type="button" disabled className={styles.deshabilitado}>
            Crear enlace
          </button>
        )}
      </div>
    </aside>
  );
}
