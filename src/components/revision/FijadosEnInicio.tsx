import { X } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { BarraSegmentada } from './BarraSegmentada';
import { estadoDe, textoPartesParaOir } from './derivados';
import type { Alumno, ClaveFijable, ConteoObjetivo, ResumenGrupo } from './types';
import styles from './FijadosEnInicio.module.css';

interface FijadosEnInicioProps {
  fijados: Readonly<Record<ClaveFijable, boolean>>;
  resumen: ResumenGrupo;
  /** El objetivo que más costó al grupo. */
  objetivoMasCostoso: ConteoObjetivo;
  alumno: Alumno;
  rutaReporte: string;
  alQuitar: (clave: ClaveFijable) => void;
  alVerAvance: () => void;
  alVerObjetivos: () => void;
}

/**
 * "Fijado por ti": las respuestas de Celestea que el profesor dejó en el inicio.
 * Cada una es una tarjeta chica con lo esencial y un paso para ver el detalle.
 */
export function FijadosEnInicio({
  fijados,
  resumen,
  objetivoMasCostoso,
  alumno,
  rutaReporte,
  alQuitar,
  alVerAvance,
  alVerObjetivos,
}: FijadosEnInicioProps) {
  if (!fijados.avance && !fijados.ana && !fijados.objetivos) return null;

  const partes = alumno.partesParaOir;
  const estadoAlumno = estadoDe(alumno) === 'por-revisar' ? 'Por revisar' : 'Revisado';

  return (
    <section aria-labelledby="titulo-fijado" className={styles.seccion}>
      <h2 id="titulo-fijado" className={styles.titulo}>
        Fijado por ti
      </h2>
      <div className={styles.rejilla}>
        {fijados.avance ? (
          <div className={styles.tarjeta}>
            <div className={styles.cabecera}>
              <span className={styles.rotulo}>Avance</span>
              <BotonQuitar etiqueta="Quitar el avance del inicio" alPulsar={() => alQuitar('avance')} />
            </div>
            <div className={styles.cifra}>
              <span className={styles.numero}>{resumen.defendieron}</span>
              <span className={styles.numeroTexto}>de {resumen.total} defendieron</span>
            </div>
            <BarraSegmentada
              alto={8}
              margenDerecho
              segmentos={[
                { valor: resumen.defendieron, nivel: 'explico' },
                { valor: resumen.sinDefensa, nivel: 'en-parte' },
                { valor: resumen.sinEntregar, nivel: 'no-salio' },
              ]}
            />
            <button type="button" className={styles.enlace} onClick={alVerAvance}>
              Ver los {resumen.faltan} que faltan
            </button>
          </div>
        ) : null}

        {fijados.ana ? (
          <div className={styles.tarjeta}>
            <div className={styles.cabecera}>
              <span className={styles.rotulo}>{alumno.tratamiento ?? 'Alumno'}</span>
              <BotonQuitar etiqueta={`Quitar a ${alumno.primerNombre} del inicio`} alPulsar={() => alQuitar('ana')} />
            </div>
            <div className={styles.persona}>
              <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={40} />
              <div className={styles.personaTextos}>
                <span className={styles.personaNombre}>{alumno.nombre}</span>
                <span className={styles.personaEstado}>
                  {estadoAlumno}
                  {partes > 0 ? `, con ${textoPartesParaOir(partes)}` : ''}
                </span>
              </div>
            </div>
            <Link href={rutaReporte} className={`${styles.enlace} ${styles.enlaceVinculo}`}>
              Abrir reporte
            </Link>
          </div>
        ) : null}

        {fijados.objetivos ? (
          <div className={styles.tarjeta}>
            <div className={styles.cabecera}>
              <span className={styles.rotulo}>Le costó más al grupo</span>
              <BotonQuitar etiqueta="Quitar objetivos del inicio" alPulsar={() => alQuitar('objetivos')} />
            </div>
            <span className={styles.objetivo}>{objetivoMasCostoso.objetivo.corto}</span>
            <BarraSegmentada
              alto={8}
              margenDerecho
              segmentos={[
                { valor: objetivoMasCostoso.explico, nivel: 'explico' },
                { valor: objetivoMasCostoso.enParte, nivel: 'en-parte' },
                { valor: objetivoMasCostoso.noSalio, nivel: 'no-salio' },
              ]}
            />
            <button type="button" className={styles.enlace} onClick={alVerObjetivos}>
              {objetivoMasCostoso.enParte} lo explicaron solo en parte
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BotonQuitar({ etiqueta, alPulsar }: { etiqueta: string; alPulsar: () => void }) {
  return (
    <button type="button" className={styles.quitar} aria-label={etiqueta} title="Quitar del inicio" onClick={alPulsar}>
      <X size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
