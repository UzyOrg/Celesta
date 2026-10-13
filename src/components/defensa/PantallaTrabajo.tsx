import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { AvisoDeError } from './AvisoDeError';
import { CabezaConBurbuja } from './CabezaConBurbuja';
import { DialogoPegarTexto } from './DialogoPegarTexto';
import styles from './PantallaTrabajo.module.css';

interface PantallaTrabajoProps {
  /** La persona eligió un PDF o un Word. */
  alElegirArchivo: (archivo: File) => void;
  alPegarTexto: (texto: string) => void;
  /** Se está subiendo o leyendo el trabajo. */
  ocupado?: boolean;
  /** Algo no salió con el archivo (no es PDF o Word, no tiene texto, pesa mucho...). */
  error?: string | null;
}

/** Paso 5: subir el trabajo (PDF o Word) o pegar el texto. */
export function PantallaTrabajo({ alElegirArchivo, alPegarTexto, ocupado = false, error = null }: PantallaTrabajoProps) {
  const [pegando, setPegando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const idEntrada = useId();

  const abrirSelector = () => {
    if (!ocupado) entrada.current?.click();
  };

  const alCambiarArchivo = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    // Se limpia para que elegir el mismo archivo otra vez (tras un error) vuelva a avisar.
    evento.target.value = '';
    if (archivo) alElegirArchivo(archivo);
  };

  return (
    <div className={styles.raiz}>
      <CabezaConBurbuja
        personaje={<Personaje tamano={56} movimiento="flotar" ritmoParpadeo={4} layoutId="orbe" />}
        titulo="Sube tu trabajo."
      />

      <input
        ref={entrada}
        id={idEntrada}
        type="file"
        hidden
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={alCambiarArchivo}
      />

      {/* La zona es un atajo para quien usa puntero; el botón de abajo es el control accesible. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={`${styles.zona} ${animaciones.entra}`}
        style={retraso(0.3)}
        onClick={abrirSelector}
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

      <AvisoDeError mensaje={error} />
      <div className={styles.acciones}>
        <Boton tamano={64} aria-disabled={ocupado} aria-busy={ocupado} onClick={abrirSelector}>
          {ocupado ? 'Subiendo tu trabajo…' : 'Elegir archivo'}
        </Boton>
        <Boton variante="contorno" tamano={56} aria-disabled={ocupado} onClick={() => !ocupado && setPegando(true)}>
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
