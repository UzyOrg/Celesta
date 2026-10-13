import { File } from 'lucide-react';
import type { ActividadAlumno } from './types';
import { Boton } from '@/components/celeste/Boton';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaEntregado.module.css';

interface PantallaEntregadoProps {
  actividad: ActividadAlumno;
  /** Nombre del archivo o del texto que se entregó. */
  nombreDelTrabajo: string;
  alCambiar: () => void;
  alSeguir: () => void;
}

/** Cada "Entregado" arranca en una sexta parte del círculo, así que no dependen del ancho de la fuente. */
const PALABRAS_DEL_ANILLO: readonly string[] = Array.from({ length: 6 }, (_, indice) => `${(indice * 100) / 6}%`);

/** Paso 7: el sello de entrega. Lo entregado ya cuenta, pase lo que pase en la defensa. */
export function PantallaEntregado({ actividad, nombreDelTrabajo, alCambiar, alSeguir }: PantallaEntregadoProps) {
  return (
    <div className={styles.raiz}>
      <div className={styles.escena}>
        <div className={styles.sello} role="img" aria-label={actividad.sello}>
          <span className={styles.impacto} />
          <span className={styles.estampa}>
            <span className={styles.anillo}>
              <svg width="210" height="210" viewBox="0 0 210 210" aria-hidden="true" focusable="false">
                <defs>
                  <path id="anillo-entregado" d="M105,105 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0" />
                </defs>
                {PALABRAS_DEL_ANILLO.map((inicio) => (
                  <text key={inicio} className={styles.textoAnillo}>
                    <textPath href="#anillo-entregado" startOffset={inicio}>
                      Entregado
                    </textPath>
                  </text>
                ))}
              </svg>
            </span>
            <span className={styles.disco}>
              <span className={styles.hora}>{actividad.horaEntrega}</span>
              <span className={styles.fecha}>{actividad.fechaSello}</span>
            </span>
          </span>
        </div>
      </div>

      <section className={styles.textos}>
        <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.75, 0.7)}>
          Ya cuenta.
        </h1>
        <p className={`${styles.subtitulo} ${animaciones.entra}`} style={retraso(0.9, 0.7)}>
          Pase lo que pase en la defensa.
        </p>
      </section>

      <div className={styles.relleno} />

      <div className={`${styles.pie} ${animaciones.entra}`} style={retraso(1.05, 0.7)}>
        <div className={styles.archivo}>
          <File size={20} strokeWidth={1.75} className={styles.iconoArchivo} aria-hidden="true" />
          <span className={styles.nombre}>{nombreDelTrabajo}</span>
          <Boton variante="suave" tamano={44} ancho="auto" onClick={alCambiar}>
            Cambiar
          </Boton>
        </div>
        <Boton tamano={64} onClick={alSeguir}>
          Seguir
        </Boton>
      </div>
    </div>
  );
}
