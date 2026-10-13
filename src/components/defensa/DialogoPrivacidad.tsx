'use client';

import { useId } from 'react';
import { X } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { Dialogo } from '@/components/celeste/Dialogo';
import styles from './DialogoPrivacidad.module.css';

interface DialogoPrivacidadProps {
  abierto: boolean;
  alCerrar: () => void;
}

/** Puntos del aviso, en lenguaje llano. Texto de ejemplo: lo definitivo lo valida el área legal. */
const PUNTOS: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Tu audio',
    texto: 'Se borra a los 7 días. Lo único que se conserva es la transcripción de lo que dijiste.',
  },
  {
    titulo: 'Quién lo ve',
    texto: 'Tu profe ve tu transcripción y tu trabajo. Tu ensayo es privado: nadie lo ve.',
  },
  {
    titulo: 'Dónde se procesa',
    texto: 'En servidores de EE. UU. Por eso te pedimos que lo aceptes.',
  },
  {
    titulo: 'Lo que nunca hacemos',
    texto: 'No entrenamos IA con tus datos y no usamos tu cámara.',
  },
];

/** Hoja con el aviso de privacidad resumido (se abre desde "Tres sí y seguimos"). */
export function DialogoPrivacidad({ abierto, alCerrar }: DialogoPrivacidadProps) {
  const idTitulo = useId();

  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} etiquetadoPor={idTitulo} forma="hoja">
      <div className={styles.contenido}>
        <div className={styles.encabezado}>
          <h2 id={idTitulo} className={styles.titulo}>
            Aviso de privacidad
          </h2>
          <button type="button" className={styles.cerrar} aria-label="Cerrar aviso" onClick={alCerrar}>
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <dl className={styles.lista}>
          {PUNTOS.map((punto) => (
            <div key={punto.titulo} className={styles.punto}>
              <dt className={styles.puntoTitulo}>{punto.titulo}</dt>
              <dd className={styles.puntoTexto}>{punto.texto}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.nota}>Resumen de ejemplo para esta demostración.</p>

        <Boton tamano={64} onClick={alCerrar}>
          Entendido
        </Boton>
      </div>
    </Dialogo>
  );
}
