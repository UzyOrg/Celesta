import type { NivelEvidencia } from '../celeste/types';
import { variablesCss } from '../celeste/variablesCss';
import styles from './BarraSegmentada.module.css';

export interface SegmentoBarra {
  /** Cuánto pesa el tramo (cuántos alumnos). */
  valor: number;
  /** Rampa de evidencia: `null` es un tramo sin color (sin dato). */
  nivel: NivelEvidencia | null;
}

interface BarraSegmentadaProps {
  segmentos: readonly SegmentoBarra[];
  /** Alto en px: 8 en las tarjetas fijadas, 10 y 12 en las respuestas. */
  alto: 8 | 10 | 12;
  /**
   * Texto que describe la barra completa. Sin él la barra es decorativa (siempre
   * hay otra cosa en texto que dice lo mismo) y se esconde del lector de pantalla.
   */
  etiqueta?: string;
  /** Crece desde la izquierda al aparecer. */
  animada?: boolean;
  /** Retraso de esa animación, en segundos. */
  retraso?: number;
  /** Deja un margen a la derecha (las tarjetas fijadas tienen menos relleno por ese lado). */
  margenDerecho?: boolean;
}

/**
 * Barra de tramos proporcionales: dónde está el grupo (defendieron, solo
 * entregaron, sin entregar) o cuánto explicó cada objetivo. Usa la rampa de
 * evidencia del tema; el color nunca va solo, siempre hay una leyenda o un
 * texto con los mismos números.
 */
export function BarraSegmentada({
  segmentos,
  alto,
  etiqueta,
  animada = false,
  retraso = 0,
  margenDerecho = false,
}: BarraSegmentadaProps) {
  const clases = [styles.barra, animada ? styles.animada : '', margenDerecho ? styles.margenDerecho : '']
    .filter(Boolean)
    .join(' ');
  // Las esquinas redondeadas son las del primer y el último tramo con color.
  const conColor = segmentos.map((segmento) => segmento.nivel !== null);
  const primero = conColor.indexOf(true);
  const ultimo = conColor.lastIndexOf(true);
  const accesibilidad = etiqueta
    ? ({ role: 'img', 'aria-label': etiqueta } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <div
      className={clases}
      style={variablesCss({ '--alto': `${alto}px`, '--retraso': `${retraso}s` })}
      {...accesibilidad}
    >
      {segmentos.map((segmento, indice) => {
        const clasesSegmento = [
          styles.segmento,
          styles[`nivel-${segmento.nivel ?? 'ninguno'}`] ?? '',
          indice === primero ? styles.inicio : '',
          indice === ultimo ? styles.fin : '',
        ]
          .filter(Boolean)
          .join(' ');
        return <span key={indice} className={clasesSegmento} style={variablesCss({ '--peso': segmento.valor })} />;
      })}
    </div>
  );
}
