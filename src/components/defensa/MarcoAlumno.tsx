import type { CSSProperties, ReactNode } from 'react';
import { variablesCss } from '@/components/celeste/variablesCss';
import styles from './MarcoAlumno.module.css';

export type DireccionDeEntrada = 'der' | 'izq' | 'ninguna';

/** Resplandor de fondo: dónde cae (px desde arriba) y qué tan fuerte se ve (0 = sin resplandor). */
export interface Resplandor {
  arriba: number;
  intensidad: number;
}

interface MarcoAlumnoProps {
  /** Si el contenido llega desde la derecha (avanzar) o la izquierda (volver). */
  direccion: DireccionDeEntrada;
  resplandor: Resplandor;
  cabecera: ReactNode;
  /** Pie fijo al borde inferior (solo la revisión lo usa). */
  pie?: ReactNode;
  /** Identifica el paso actual: sirve para los estilos y para las pruebas visuales. */
  paso: string;
  children: ReactNode;
}

/**
 * Marco del alumno: una columna pensada para el celular que en pantallas
 * grandes se queda centrada (máx. 430 px). Contiene el resplandor, la cabecera
 * y el contenido. El contenedor de `children` es `<main>`.
 */
export function MarcoAlumno({ direccion, resplandor, cabecera, pie, paso, children }: MarcoAlumnoProps) {
  const estiloResplandor: CSSProperties = variablesCss({
    '--brillo-arriba': `${resplandor.arriba}px`,
    '--brillo-fuerza': resplandor.intensidad,
  });

  return (
    <div className={styles.marco} data-dir={direccion} data-paso={paso}>
      <div className={styles.resplandor} style={estiloResplandor} aria-hidden="true" />
      {cabecera}
      <main className={styles.principal} id="contenido-defensa">
        {children}
      </main>
      {pie}
    </div>
  );
}
