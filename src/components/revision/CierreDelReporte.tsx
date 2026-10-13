import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import type { CierreReporte, VecinoReporte } from './types';
import styles from './CierreDelReporte.module.css';

interface CierreDelReporteProps {
  /** Lo que el profesor contestó, o `null` si todavía no contesta. */
  valor: CierreReporte | null;
  alElegir: (valor: CierreReporte) => void;
  /** Quién sigue en la cola; `null` si este era el último. */
  siguiente: VecinoReporte | null;
  rutaSiguiente: string;
  rutaInicio: string;
}

const OPCIONES: readonly { valor: CierreReporte; texto: string }[] = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'parte', texto: 'En parte' },
  { valor: 'no', texto: 'No' },
];

/**
 * Cierre del reporte: una pregunta al profesor sobre si el reporte coincide con
 * lo que pensaba (la comparación con su respuesta de antes) y el paso al
 * siguiente reporte. La respuesta se guarda en este navegador hasta que exista
 * un servidor donde guardarla.
 */
export function CierreDelReporte({ valor, alElegir, siguiente, rutaSiguiente, rutaInicio }: CierreDelReporteProps) {
  const contestado = valor !== null;
  return (
    <section aria-labelledby="titulo-cierre" className={styles.cierre}>
      <div className={styles.pregunta}>
        <span id="titulo-cierre" className={styles.titulo}>
          ¿El reporte coincide con lo que piensas?
        </span>
        <div className={styles.fila}>
          <div role="group" aria-labelledby="titulo-cierre" className={styles.opciones}>
            {OPCIONES.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                aria-pressed={valor === opcion.valor}
                className={valor === opcion.valor ? `${styles.opcion} ${styles.activa}` : styles.opcion}
                onClick={() => alElegir(opcion.valor)}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
          {contestado ? (
            <span aria-hidden="true" className={styles.guardado}>
              <Check size={16} strokeWidth={2.2} className={styles.guardadoIcono} />
              Guardado
            </span>
          ) : null}
          <span role="status" className={styles.soloLector}>
            {contestado ? 'Guardado' : ''}
          </span>
        </div>
      </div>
      <Link
        href={siguiente ? rutaSiguiente : rutaInicio}
        className={contestado ? `${styles.siguiente} ${styles.siguienteListo}` : styles.siguiente}
      >
        {siguiente ? `Siguiente: ${siguiente.nombreCorto}` : 'Volver al inicio'}
        <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
      </Link>
    </section>
  );
}
