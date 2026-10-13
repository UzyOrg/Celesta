import { File } from 'lucide-react';
import type { TrabajoEntregado } from './types';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaArchivo.module.css';

interface PantallaArchivoProps {
  trabajo: TrabajoEntregado;
  alCambiar: () => void;
  alEntregar: () => void;
}

/** Anchos de las líneas que imitan el texto de la hoja. */
const LINEAS: readonly number[] = [100, 92, 100, 76, 100, 86, 58];

/** Paso 6: "¿Es este?". Vista previa del archivo y confirmación antes de entregar. */
export function PantallaArchivo({ trabajo, alCambiar, alEntregar }: PantallaArchivoProps) {
  return (
    <div className={styles.raiz}>
      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.1)}>
        ¿Es este?
      </h1>

      <div className={styles.escena}>
        <div className={styles.tarjeta}>
          <div className={styles.hoja}>
            <span className={styles.hojaTitulo}>{trabajo.titulo}</span>
            <span className={styles.hojaCurso}>{trabajo.curso}</span>
            {LINEAS.map((ancho, indice) => (
              <span key={indice} className={styles.linea} style={{ width: `${ancho}%` }} />
            ))}
          </div>
          <div className={styles.archivo}>
            <File size={18} strokeWidth={1.75} className={styles.iconoArchivo} aria-hidden="true" />
            <span className={styles.nombre}>{trabajo.archivo}</span>
            <span className={styles.paginas}>{trabajo.detalle}</span>
          </div>
        </div>

        <div className={styles.asoma}>
          <Personaje
            tamano={68}
            movimiento="flotar"
            entra
            retrasoEntra={0.75}
            inclina
            mirada={{ x: -6 / 68, y: 6 / 68 }}
            ritmoParpadeo={3.8}
          />
        </div>
      </div>

      <div className={styles.relleno} />

      <div className={`${styles.acciones} ${animaciones.entra}`} style={retraso(0.4)}>
        <Boton variante="contorno" tamano={56} onClick={alCambiar}>
          Cambiar archivo
        </Boton>
        <Boton tamano={64} onClick={alEntregar}>
          Entregar
        </Boton>
      </div>
    </div>
  );
}
