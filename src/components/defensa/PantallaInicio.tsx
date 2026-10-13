import { File } from 'lucide-react';
import type { ActividadAlumno } from './types';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaInicio.module.css';

interface PantallaInicioProps {
  actividad: ActividadAlumno;
  alEmpezar: () => void;
}

/** Paso 1: saludo y tarjeta de la actividad. */
export function PantallaInicio({ actividad, alEmpezar }: PantallaInicioProps) {
  return (
    <div className={styles.raiz}>
      <div className={styles.orbe}>
        <Personaje
          tamano={156}
          movimiento="flotar"
          ondas={2}
          ritmoOndas={3.2}
          ritmoParpadeo={4.5}
          layoutId="orbe"
        />
      </div>

      <section className={styles.textos}>
        <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.35, 0.8)}>
          Hola.
        </h1>
        <p className={`${styles.subtitulo} ${animaciones.entra}`} style={retraso(0.5, 0.8)}>
          Platiquemos de tu proyecto.
        </p>
      </section>

      <div className={styles.relleno} />

      <div className={`${styles.pie} ${animaciones.entra}`} style={retraso(0.7, 0.8)}>
        <div className={styles.tarjeta}>
          <span className={styles.icono}>
            <File size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className={styles.nombres}>
            <span className={styles.nombre}>{actividad.nombre}</span>
            <span className={styles.curso}>{actividad.curso}</span>
          </span>
          <span className={styles.vence}>
            <span>Vence el</span>
            <span className={styles.venceDia}>{actividad.cierreTarjeta}</span>
          </span>
        </div>
        <Boton tamano={64} onClick={alEmpezar}>
          Empezar
        </Boton>
      </div>
    </div>
  );
}
