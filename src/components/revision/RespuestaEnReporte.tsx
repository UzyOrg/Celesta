import { X } from 'lucide-react';
import { LogoCelestea } from '../celeste/LogoCelestea';
import styles from './RespuestaEnReporte.module.css';

interface RespuestaEnReporteProps {
  /** Lo que preguntó el profesor. */
  pregunta: string;
  texto: string;
  pensando: boolean;
  /** Enlace a la pregunta del reporte de la que habla la respuesta, si la hay. */
  irA: { ancla: string; texto: string; alIr: () => void } | null;
  alCerrar: () => void;
}

/**
 * Respuesta de Celestea sobre la defensa que se está leyendo. Aparece sobre la
 * barra, se puede cerrar y, cuando habla de una pregunta concreta, lleva a ella.
 * No lleva `role="status"`: el aviso para lector de pantalla vive en la página,
 * en una región que siempre existe, porque una región que nace con su texto no
 * siempre se anuncia.
 */
export function RespuestaEnReporte({ pregunta, texto, pensando, irA, alCerrar }: RespuestaEnReporteProps) {
  return (
    <div className={styles.respuesta}>
      <span className={styles.avatar} aria-hidden="true">
        <LogoCelestea tamano={18} girando={pensando} />
      </span>
      <div className={styles.cuerpo}>
        <span className={styles.pregunta}>{pregunta}</span>
        <span className={styles.texto}>{texto}</span>
        {irA ? (
          <a href={irA.ancla} className={styles.ir} onClick={irA.alIr}>
            {irA.texto}
          </a>
        ) : null}
      </div>
      <button type="button" className={styles.cerrar} aria-label="Cerrar respuesta" onClick={alCerrar}>
        <X size={16} strokeWidth={2} strokeLinecap="round" aria-hidden="true" />
      </button>
    </div>
  );
}
