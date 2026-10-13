import { useId } from 'react';
import { Personaje } from '@/components/celeste/Personaje';
import type { ExpresionPersonaje, MovimientoPersonaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaEstres.module.css';

interface PantallaEstresProps {
  /** Se llama con la posición elegida, de 0 ("Mucho menos") a 4 ("Mucho más"). */
  alElegir: (nivel: number) => void;
}

interface OpcionEstres {
  etiqueta: string;
  expresion: ExpresionPersonaje;
  movimiento: MovimientoPersonaje;
  ritmoParpadeo?: number;
}

/** Cinco caras, de la más tranquila a la más agitada. El texto siempre acompaña a la cara. */
const OPCIONES: readonly OpcionEstres[] = [
  { etiqueta: 'Mucho menos', expresion: 'escucha', movimiento: 'calma' },
  { etiqueta: 'Menos', expresion: 'neutro', movimiento: 'calma-rapida', ritmoParpadeo: 3.4 },
  { etiqueta: 'Igual', expresion: 'neutro', movimiento: 'quieto', ritmoParpadeo: 4.2 },
  { etiqueta: 'Más', expresion: 'atento', movimiento: 'tiembla' },
  { etiqueta: 'Mucho más', expresion: 'asombrado', movimiento: 'tiembla-fuerte' },
];

/** Paso 14: una sola pregunta, con cinco respuestas posibles. Se puede omitir. */
export function PantallaEstres({ alElegir }: PantallaEstresProps) {
  const idPregunta = useId();

  return (
    <div className={styles.raiz}>
      <h1 id={idPregunta} className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.15, 0.7)}>
        ¿Más o menos estrés que un examen escrito?
      </h1>

      <div className={styles.relleno} />

      <div
        className={`${styles.opciones} ${animaciones.entra}`}
        style={retraso(0.35, 0.7)}
        role="group"
        aria-labelledby={idPregunta}
      >
        {OPCIONES.map((opcion, indice) => (
          <button key={opcion.etiqueta} type="button" className={styles.opcion} onClick={() => alElegir(indice)}>
            <Personaje
              tamano={44}
              expresion={opcion.expresion}
              movimiento={opcion.movimiento}
              parpadea={opcion.ritmoParpadeo !== undefined}
              ritmoParpadeo={opcion.ritmoParpadeo}
            />
            <span className={styles.etiqueta}>{opcion.etiqueta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
