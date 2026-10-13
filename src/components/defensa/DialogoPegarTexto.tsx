'use client';

import { useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { Dialogo } from '@/components/celeste/Dialogo';
import styles from './DialogoPegarTexto.module.css';

interface DialogoPegarTextoProps {
  abierto: boolean;
  alCerrar: () => void;
  /** Se llama con el texto ya recortado cuando la persona lo confirma. */
  alConfirmar: (texto: string) => void;
}

/** Hoja para pegar el texto del trabajo cuando no hay archivo. Solo guarda el texto en el navegador. */
export function DialogoPegarTexto({ abierto, alCerrar, alConfirmar }: DialogoPegarTextoProps) {
  const idTitulo = useId();
  const idCampo = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState('');
  const vacio = texto.trim().length === 0;

  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} etiquetadoPor={idTitulo} forma="hoja" enfoqueInicial={campo}>
      <form
        className={styles.contenido}
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!vacio) alConfirmar(texto.trim());
        }}
      >
        <div className={styles.encabezado}>
          <h2 id={idTitulo} className={styles.titulo}>
            Pegar texto
          </h2>
          <button type="button" className={styles.cerrar} aria-label="Cerrar" onClick={alCerrar}>
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.campoCaja}>
          <label className={styles.etiqueta} htmlFor={idCampo}>
            El texto de tu trabajo
          </label>
          <textarea
            id={idCampo}
            ref={campo}
            className={styles.campo}
            rows={8}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
        </div>

        <div className={styles.acciones}>
          <Boton type="submit" tamano={64} aria-disabled={vacio}>
            Usar este texto
          </Boton>
          <Boton type="button" variante="contorno" tamano={56} onClick={alCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
