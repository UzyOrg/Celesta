import { useId } from 'react';
import type { ChangeEvent } from 'react';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { CabezaConBurbuja } from './CabezaConBurbuja';
import styles from './PantallaQuien.module.css';

interface PantallaQuienProps {
  nombre: string;
  matricula: string;
  alCambiarNombre: (valor: string) => void;
  alCambiarMatricula: (valor: string) => void;
  alSeguir: () => void;
}

/** Paso 2: nombre y matrícula. */
export function PantallaQuien({ nombre, matricula, alCambiarNombre, alCambiarMatricula, alSeguir }: PantallaQuienProps) {
  const idNombre = useId();
  const idMatricula = useId();
  const completo = nombre.trim().length > 0 && matricula.trim().length > 0;

  return (
    <form
      className={styles.raiz}
      onSubmit={(evento) => {
        evento.preventDefault();
        if (completo) alSeguir();
      }}
    >
      <CabezaConBurbuja
        personaje={<Personaje tamano={56} movimiento="flotar" ritmoParpadeo={4} layoutId="orbe" />}
        titulo="¿Quién eres?"
      />

      <div className={`${styles.campos} ${animaciones.entra}`} style={retraso(0.3)}>
        <div className={styles.campo}>
          <label className={styles.etiqueta} htmlFor={idNombre}>
            Nombre completo
          </label>
          <input
            id={idNombre}
            className={styles.entrada}
            type="text"
            name="nombre"
            autoComplete="name"
            value={nombre}
            onChange={(evento: ChangeEvent<HTMLInputElement>) => alCambiarNombre(evento.target.value)}
          />
        </div>
        <div className={styles.campo}>
          <label className={styles.etiqueta} htmlFor={idMatricula}>
            Matrícula
          </label>
          <input
            id={idMatricula}
            className={`${styles.entrada} ${styles.matricula}`}
            type="text"
            name="matricula"
            inputMode="numeric"
            autoComplete="off"
            value={matricula}
            onChange={(evento: ChangeEvent<HTMLInputElement>) => alCambiarMatricula(evento.target.value)}
          />
        </div>
      </div>

      <div className={styles.relleno} />

      <Boton type="submit" tamano={64} aria-disabled={!completo}>
        Seguir
      </Boton>
    </form>
  );
}
