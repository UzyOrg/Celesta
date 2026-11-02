import { Mic, PenLine } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { Chip } from '../celeste/Chip';
import { ETIQUETA_NIVEL, IconoNivel } from '../celeste/IconoNivel';
import type { PropsTarjetaCitas } from './catalogo';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import styles from './TarjetasDelAsistente.module.css';

interface TarjetaCitasProps {
  datos: PropsTarjetaCitas;
  rutaReporteDirecto: (matricula: string) => string;
}

/**
 * Lo que dijeron sobre un objetivo, con sus palabras. Cada cita es una subcadena
 * exacta de la transcripción ya verificada por el reporte; aquí no se resume ni
 * se reescribe nada, y siempre lleva al reporte de donde sale.
 */
export function TarjetaCitas({ datos, rutaReporteDirecto }: TarjetaCitasProps) {
  const { titulo, objetivo, citas, total } = datos;
  const faltan = total - citas.length;

  return (
    <TarjetaDeCelestea etiqueta={titulo} titulo={titulo}>
      <div className={styles.cuerpo}>
        <p className={styles.objetivoTexto}>{`Objetivo ${objetivo.id}: ${objetivo.texto}`}</p>
        {citas.length === 0 ? (
          <p className={styles.vacio}>Todavía no hay frases verificadas sobre este objetivo.</p>
        ) : (
          <ul className={styles.citas}>
            {citas.map((cita) => (
              <li key={`${cita.matricula}-${cita.tiempo ?? 'escrito'}`} className={styles.cita}>
                <blockquote className={styles.citaTexto}>{`«${cita.texto}»`}</blockquote>
                <div className={styles.citaPie}>
                  <Avatar iniciales={cita.iniciales} nombre={cita.nombre} tamano={32} />
                  <span className={styles.nombre}>{cita.nombre}</span>
                  {cita.nivel ? (
                    <Chip tono={cita.nivel} icono={<IconoNivel nivel={cita.nivel} tamano={10} />}>
                      {ETIQUETA_NIVEL[cita.nivel]}
                    </Chip>
                  ) : null}
                  <Chip
                    tono="tenue"
                    icono={
                      cita.modo === 'voz' ? (
                        <Mic size={11} strokeWidth={2.2} aria-hidden="true" />
                      ) : (
                        <PenLine size={11} strokeWidth={2.2} aria-hidden="true" />
                      )
                    }
                  >
                    {cita.modo === 'voz' ? `Voz ${cita.tiempo ?? ''}`.trim() : 'Por escrito'}
                  </Chip>
                  <Link
                    href={rutaReporteDirecto(cita.matricula)}
                    className={styles.enlaceTexto}
                    aria-label={`Ver la cita en el reporte de ${cita.nombre}`}
                  >
                    Ver en su reporte
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {faltan > 0 ? <span className={styles.detalle}>{`Hay ${faltan} frases más en los reportes.`}</span> : null}
      </div>
    </TarjetaDeCelestea>
  );
}
