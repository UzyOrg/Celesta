import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaRespira.module.css';

interface PantallaRespiraProps {
  /** Empieza un ensayo privado: se ve igual que la defensa, pero nadie lo ve y no se entrega. */
  alEnsayar: () => void;
  /** Empieza la defensa de verdad. */
  alEmpezar: () => void;
}

/** Paso 9: "Cuando quieras". Nadie se apura; se puede ensayar en privado. */
export function PantallaRespira({ alEnsayar, alEmpezar }: PantallaRespiraProps) {
  return (
    <div className={styles.raiz}>
      <Personaje tamano={190} expresion="neutro" movimiento="respira" mirada="alrededor" layoutId="orbe" />
      <span className={styles.sombra} aria-hidden="true" />

      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.2, 0.7)}>
        Cuando quieras.
      </h1>
      <p className={`${styles.apoyo} ${animaciones.entra}`} style={retraso(0.35, 0.7)}>
        3 minutos, sin cámara y puedes escribir.
      </p>

      <div className={styles.relleno} />

      <div className={styles.acciones}>
        <Boton variante="contorno" tamano={56} onClick={alEnsayar} className={styles.ensayo}>
          <span className={styles.ensayoTitulo}>Ensayar primero</span>
          <span className={styles.ensayoNota}>Privado y sin nota</span>
        </Boton>
        <Boton tamano={64} onClick={alEmpezar}>
          Empezar defensa
        </Boton>
      </div>
    </div>
  );
}
