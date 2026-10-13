import type { ReactNode } from 'react';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './CabezaConBurbuja.module.css';

interface CabezaConBurbujaProps {
  /** El personaje ya configurado (tamaño, expresión, movimiento). */
  personaje: ReactNode;
  /** El título del paso: es el `<h1>` de la pantalla. */
  titulo: string;
  /** "normal" (24 px) o "menor" (22 px, para frases largas). */
  tamanoTitulo?: 'normal' | 'menor';
}

/**
 * Fila "personaje + burbuja": la IA le habla a la persona con una frase corta.
 * El personaje queda fuera de cualquier contenedor animado para que pueda
 * volar de una pantalla a otra sin interferencias.
 */
export function CabezaConBurbuja({ personaje, titulo, tamanoTitulo = 'normal' }: CabezaConBurbujaProps) {
  return (
    <div className={styles.fila}>
      {personaje}
      <div className={`${styles.burbuja} ${animaciones.entra}`} style={retraso(0.15)}>
        <h1 className={tamanoTitulo === 'menor' ? styles.tituloMenor : styles.titulo}>{titulo}</h1>
      </div>
    </div>
  );
}
