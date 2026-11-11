import { Check } from 'lucide-react';
import { AvatarCelestea } from '../celeste/AvatarCelestea';
import styles from './PasosDeCelestea.module.css';

export interface PasoVisible {
  /** Frase fija del servidor con datos del grupo: "Busco en 31 entregas…". Nunca el razonamiento del modelo. */
  texto: string;
  hecho: boolean;
}

interface PasosDeCelesteaProps {
  pasos: readonly PasoVisible[];
  /** Ya respondió: los pasos se pliegan en "Cómo lo busqué". */
  terminado: boolean;
}

/**
 * Lo que Celestea está haciendo mientras arma una respuesta, paso por paso.
 * Mientras trabaja se anuncia el paso en curso; al terminar queda plegado para
 * quien quiera ver de dónde salió la respuesta.
 */
export function PasosDeCelestea({ pasos, terminado }: PasosDeCelesteaProps) {
  if (pasos.length === 0) return null;

  const lista = (
    <ol className={styles.pasos}>
      {pasos.map((paso, indice) => (
        <li key={`${indice}-${paso.texto}`} className={paso.hecho ? styles.paso : `${styles.paso} ${styles.enCurso}`}>
          <span className={styles.marca} aria-hidden="true">
            {paso.hecho ? <Check size={13} strokeWidth={2.6} /> : <span className={styles.punto} />}
          </span>
          <span>{paso.texto}</span>
        </li>
      ))}
    </ol>
  );

  if (terminado) {
    return (
      <details className={styles.plegado}>
        <summary className={styles.resumen}>{`Cómo lo busqué · ${pasos.length} ${pasos.length === 1 ? 'paso' : 'pasos'}`}</summary>
        {lista}
      </details>
    );
  }

  const enCurso = pasos.find((paso) => !paso.hecho) ?? pasos[pasos.length - 1];
  return (
    <div className={styles.linea}>
      <AvatarCelestea tamano={32} pensando />
      <div className={styles.columna}>
        {lista}
        <p role="status" className={styles.soloLector}>
          {enCurso?.texto ?? ''}
        </p>
      </div>
    </div>
  );
}
