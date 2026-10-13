import { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { Interruptor } from '@/components/celeste/Interruptor';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { CabezaConBurbuja } from './CabezaConBurbuja';
import { DialogoPrivacidad } from './DialogoPrivacidad';
import styles from './PantallaPermisos.module.css';

/** Estado de los tres "sí", en el orden en que se muestran. */
export type Aceptaciones = readonly [boolean, boolean, boolean];

interface PantallaPermisosProps {
  aceptaciones: Aceptaciones;
  alCambiar: (indice: 0 | 1 | 2, valor: boolean) => void;
  alAceptar: () => void;
}

const FILAS: readonly { indice: 0 | 1 | 2; etiqueta: string; entrada: number }[] = [
  { indice: 0, etiqueta: 'Leí el aviso de privacidad', entrada: 0.25 },
  { indice: 1, etiqueta: 'Acepto que mis datos se procesen en EE. UU.', entrada: 0.35 },
  { indice: 2, etiqueta: 'Soy mayor de edad', entrada: 0.45 },
];

/** Paso 3: tres interruptores, todos apagados al llegar; hay que activarlos a conciencia. */
export function PantallaPermisos({ aceptaciones, alCambiar, alAceptar }: PantallaPermisosProps) {
  const idAyuda = useId();
  const [avisoAbierto, setAvisoAbierto] = useState(false);
  const todos = aceptaciones.every(Boolean);

  return (
    <div className={styles.raiz}>
      <CabezaConBurbuja
        personaje={<Personaje tamano={56} movimiento="flotar" ritmoParpadeo={4} layoutId="orbe" />}
        titulo="Tres sí y seguimos."
      />

      <div className={styles.filas}>
        {FILAS.map((fila) => (
          <Interruptor
            key={fila.indice}
            etiqueta={fila.etiqueta}
            marcado={aceptaciones[fila.indice]}
            alCambiar={(valor) => alCambiar(fila.indice, valor)}
            entrada={fila.entrada}
          />
        ))}
      </div>

      <div className={`${styles.notas} ${animaciones.entra}`} style={retraso(0.6, 0.5)}>
        <button type="button" className={styles.enlace} onClick={() => setAvisoAbierto(true)}>
          Leer aviso de privacidad
        </button>
        <span className={styles.garantia}>
          <Lock size={16} strokeWidth={2} aria-hidden="true" />
          Nunca entrenamos IA con tus datos.
        </span>
      </div>

      <div className={styles.relleno} />

      <p id={idAyuda} className={styles.ayuda} hidden={todos}>
        Activa los tres para seguir.
      </p>
      <Boton
        tamano={64}
        aria-disabled={!todos}
        aria-describedby={todos ? undefined : idAyuda}
        onClick={() => {
          if (todos) alAceptar();
        }}
      >
        Aceptar
      </Boton>

      <DialogoPrivacidad abierto={avisoAbierto} alCerrar={() => setAvisoAbierto(false)} />
    </div>
  );
}
