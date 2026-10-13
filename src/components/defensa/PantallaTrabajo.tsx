import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { CabezaConBurbuja } from './CabezaConBurbuja';
import { DialogoPegarTexto } from './DialogoPegarTexto';
import styles from './PantallaTrabajo.module.css';

interface PantallaTrabajoProps {
  /** El prototipo no sube nada: "elegir" usa el archivo de ejemplo de la actividad. */
  alElegirArchivo: () => void;
  alPegarTexto: (texto: string) => void;
}

/** Paso 5: subir el trabajo (PDF o Word) o pegar el texto. */
export function PantallaTrabajo({ alElegirArchivo, alPegarTexto }: PantallaTrabajoProps) {
  const [pegando, setPegando] = useState(false);

  return (
    <div className={styles.raiz}>
      <CabezaConBurbuja
        personaje={<Personaje tamano={56} movimiento="flotar" ritmoParpadeo={4} layoutId="orbe" />}
        titulo="Sube tu trabajo."
      />

      {/* La zona es un atajo para quien usa puntero; el botón de abajo es el control accesible. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={`${styles.zona} ${animaciones.entra}`}
        style={retraso(0.3)}
        onClick={alElegirArchivo}
      >
        <span className={styles.ilustracion} aria-hidden="true">
          <span className={styles.hojaAtras} />
          <span className={styles.hoja}>
            <span className={styles.linea} style={{ width: '100%' }} />
            <span className={styles.linea} style={{ width: '78%' }} />
            <span className={styles.linea} style={{ width: '90%' }} />
            <span className={styles.linea} style={{ width: '64%' }} />
            <span className={styles.linea} style={{ width: '84%' }} />
          </span>
          <span className={styles.subir}>
            <ArrowUp size={22} strokeWidth={2.25} />
          </span>
        </span>
        <span className={styles.ayuda}>PDF o Word</span>
      </button>

      <div className={styles.relleno} />

      <div className={styles.acciones}>
        <Boton tamano={64} onClick={alElegirArchivo}>
          Elegir archivo
        </Boton>
        <Boton variante="contorno" tamano={56} onClick={() => setPegando(true)}>
          Pegar texto
        </Boton>
      </div>

      <DialogoPegarTexto
        abierto={pegando}
        alCerrar={() => setPegando(false)}
        alConfirmar={(texto) => {
          setPegando(false);
          alPegarTexto(texto);
        }}
      />
    </div>
  );
}
