import { Pause, Play } from 'lucide-react';
import { variablesCss } from '../celeste/variablesCss';
import type { ParteParaOir as DatosParteParaOir } from './types';
import styles from './ParteParaOir.module.css';

interface ParteParaOirProps {
  parte: DatosParteParaOir;
  /** Se está reproduciendo (simulado). */
  sonando: boolean;
  alTocar: () => void;
}

const BARRAS = 40;

/** Forma de onda fija: depende solo de la semilla, así servidor y navegador pintan lo mismo. */
function ondaDe(semilla: number): { alto: number; retraso: string }[] {
  return Array.from({ length: BARRAS }, (_, indice) => ({
    alto: 5 + ((indice * semilla + 7) % 15),
    retraso: `${(-((indice * 7) % 9) / 10).toFixed(1)}s`,
  }));
}

/**
 * Tarjeta con el audio original de una frase que el alumno marcó o aclaró.
 *
 * El audio es simulado: al tocar corre una barra de progreso del largo de la
 * parte y no suena nada. Cuando haya audio real, el reproductor se conecta
 * aquí; el audio solo debe empezar después de un toque.
 */
export function ParteParaOir({ parte, sonando, alTocar }: ParteParaOirProps) {
  const onda = ondaDe(parte.semilla);
  return (
    <div className={sonando ? `${styles.tarjeta} ${styles.sonando}` : styles.tarjeta}>
      <button
        type="button"
        className={styles.boton}
        aria-label={parte.etiquetaBoton}
        aria-pressed={sonando}
        onClick={alTocar}
      >
        {sonando ? (
          <Pause size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        ) : (
          <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        )}
      </button>
      <div className={styles.cuerpo}>
        <span className={styles.descripcion}>{parte.descripcion}</span>
        <div aria-hidden="true" className={styles.visual}>
          <div className={styles.onda}>
            {onda.map((barra, indice) => (
              <span
                // La forma de onda es fija: el orden nunca cambia.
                key={indice}
                className={styles.barra}
                style={variablesCss({ '--alto': `${barra.alto}px`, '--retraso': barra.retraso })}
              />
            ))}
          </div>
          <div className={styles.pista}>
            {sonando ? (
              <div className={styles.progreso} style={variablesCss({ '--duracion': `${parte.milisegundos}ms` })} />
            ) : null}
          </div>
        </div>
      </div>
      <span className={styles.duracion}>{parte.duracion}</span>
    </div>
  );
}
