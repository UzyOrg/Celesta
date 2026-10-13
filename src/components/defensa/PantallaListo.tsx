import { useEffect, useState } from 'react';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso, variablesCss } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaListo.module.css';

interface PantallaListoProps {
  /** Hora en que llegó el trabajo y hora en que se entregó la defensa ("21:05", "21:32"). */
  horaEntrega: string;
  horaDefensa: string;
}

interface Chispa {
  angulo: number;
  lado: 6 | 8;
  color: 'acento' | 'oro' | 'claro';
  cuadrada: boolean;
  retraso: number;
}

/** Doce destellos que salen de la esfera, repartidos alrededor. */
const CHISPAS: readonly Chispa[] = [
  { angulo: 0, lado: 8, color: 'acento', cuadrada: false, retraso: 0 },
  { angulo: 32, lado: 6, color: 'oro', cuadrada: false, retraso: 0.15 },
  { angulo: 61, lado: 8, color: 'claro', cuadrada: true, retraso: 0.05 },
  { angulo: 93, lado: 6, color: 'acento', cuadrada: false, retraso: 0.2 },
  { angulo: 118, lado: 8, color: 'oro', cuadrada: false, retraso: 0.1 },
  { angulo: 152, lado: 6, color: 'acento', cuadrada: true, retraso: 0.25 },
  { angulo: 179, lado: 8, color: 'claro', cuadrada: false, retraso: 0 },
  { angulo: 211, lado: 6, color: 'oro', cuadrada: false, retraso: 0.15 },
  { angulo: 238, lado: 8, color: 'acento', cuadrada: true, retraso: 0.05 },
  { angulo: 272, lado: 6, color: 'claro', cuadrada: false, retraso: 0.2 },
  { angulo: 301, lado: 8, color: 'oro', cuadrada: false, retraso: 0.1 },
  { angulo: 331, lado: 6, color: 'acento', cuadrada: true, retraso: 0.25 },
];

const MILISEGUNDOS_HASTA_LA_PIEL = 350;
const MILISEGUNDOS_HASTA_EL_AVISO = 1700;

/**
 * Paso 15: "Listo". La esfera celebra y, como es la primera defensa, estrena
 * su piel Celestia. La piel se guardaría en el perfil de la persona; aquí solo
 * se muestra el momento del desbloqueo.
 */
export function PantallaListo({ horaEntrega, horaDefensa }: PantallaListoProps) {
  const [conPiel, setConPiel] = useState(false);
  const [conAviso, setConAviso] = useState(false);

  useEffect(() => {
    const piel = window.setTimeout(() => setConPiel(true), MILISEGUNDOS_HASTA_LA_PIEL);
    const aviso = window.setTimeout(() => setConAviso(true), MILISEGUNDOS_HASTA_EL_AVISO);
    return () => {
      window.clearTimeout(piel);
      window.clearTimeout(aviso);
    };
  }, []);

  return (
    <div className={styles.raiz}>
      <div className={styles.escena} aria-hidden="true">
        <div className={styles.chispas}>
          {CHISPAS.map((chispa) => (
            <span key={chispa.angulo} className={styles.rayo} style={{ transform: `rotate(${chispa.angulo}deg)` }}>
              <span
                className={`${styles.chispa} ${styles[`color-${chispa.color}`] ?? ''} ${chispa.cuadrada ? styles.cuadrada : ''}`}
                style={variablesCss({ '--lado': `${chispa.lado}px`, '--espera': `${chispa.retraso}s` })}
              />
            </span>
          ))}
        </div>
        <Personaje
          tamano={140}
          expresion="feliz"
          piel={conPiel ? 'celestia' : 'azul'}
          preparaCelestia
          movimiento="celebrar"
          ondas={1}
          ritmoOndas={2.6}
        />
      </div>

      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.3, 0.7)}>
        Listo.
      </h1>
      <p className={`${styles.horas} ${animaciones.entra}`} style={retraso(0.45, 0.7)}>
        Trabajo a las {horaEntrega}, defensa a las {horaDefensa}
      </p>
      <p className={`${styles.profe} ${animaciones.entra}`} style={retraso(0.6, 0.7)}>
        Tu profe califica donde siempre.
      </p>

      <div role="status" className={styles.aviso}>
        {conAviso ? (
          <span className={`${styles.desbloqueo} ${animaciones.pop}`} style={retraso(0, 0.6)}>
            <Personaje tamano={34} piel="celestia" parpadea={false} />
            <span className={styles.desbloqueoTextos}>
              <span className={styles.desbloqueoEtiqueta}>Desbloqueaste</span>
              <span className={styles.desbloqueoNombre}>Celestia</span>
            </span>
          </span>
        ) : null}
      </div>

      <div className={styles.relleno} />

      <p className={styles.cerrar}>Ya puedes cerrar esta página</p>
    </div>
  );
}
