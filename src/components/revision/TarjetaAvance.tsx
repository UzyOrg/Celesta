import { Avatar } from '../celeste/Avatar';
import { Chip } from '../celeste/Chip';
import { textoDeEntrega } from './derivados';
import { BarraSegmentada } from './BarraSegmentada';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import type { Alumno, ResumenGrupo } from './types';
import styles from './TarjetaAvance.module.css';

interface TarjetaAvanceProps {
  grupo: string;
  resumen: ResumenGrupo;
  /** Quienes no han entregado, en orden alfabético. */
  sinEntregar: readonly Alumno[];
  /** Quienes entregaron pero no defendieron, por orden de entrega. */
  sinDefensa: readonly Alumno[];
  fijado: boolean;
  alAlternarFijado: () => void;
}

/** "Avance del grupo 3B": cuántos defendieron y quiénes faltan, con nombre. */
export function TarjetaAvance({ grupo, resumen, sinEntregar, sinDefensa, fijado, alAlternarFijado }: TarjetaAvanceProps) {
  const titulo = `Avance del grupo ${grupo}`;
  const descripcion = `${resumen.defendieron} defendieron, ${resumen.sinDefensa} solo entregaron, ${resumen.sinEntregar} sin entregar`;

  return (
    <TarjetaDeCelestea
      etiqueta={titulo}
      titulo={titulo}
      fijable={{ fijado, alAlternar: alAlternarFijado }}
    >
      <div className={styles.cuerpo}>
        <div className={styles.cifra}>
          <span className={styles.numero}>{resumen.defendieron}</span>
          <span className={styles.numeroTexto}>de {resumen.total} defendieron</span>
        </div>

        <BarraSegmentada
          alto={12}
          animada
          retraso={0.3}
          etiqueta={descripcion}
          segmentos={[
            { valor: resumen.defendieron, nivel: 'explico' },
            { valor: resumen.sinDefensa, nivel: 'en-parte' },
            { valor: resumen.sinEntregar, nivel: 'no-salio' },
          ]}
        />

        <div className={styles.leyenda}>
          <span className={styles.leyendaItem}>
            <span className={`${styles.muestra} ${styles.muestraExplico}`} aria-hidden="true" />
            Defendieron <span className={styles.mono}>{resumen.defendieron}</span>
          </span>
          <span className={styles.leyendaItem}>
            <span className={`${styles.muestra} ${styles.muestraParte}`} aria-hidden="true" />
            Solo entregaron <span className={styles.mono}>{resumen.sinDefensa}</span>
          </span>
          <span className={styles.leyendaItem}>
            <span className={`${styles.muestra} ${styles.muestraNo}`} aria-hidden="true" />
            Sin entregar <span className={styles.mono}>{resumen.sinEntregar}</span>
          </span>
        </div>

        <div className={styles.columnas}>
          <section aria-labelledby="titulo-sin-entregar" className={styles.columna}>
            <h3 id="titulo-sin-entregar" className={styles.tituloColumna}>
              No han entregado
              <Chip tono="conteo">{resumen.sinEntregar}</Chip>
            </h3>
            {sinEntregar.map((alumno) => (
              <div key={alumno.matricula} className={styles.persona}>
                <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={32} />
                <span className={styles.nombre}>{alumno.nombre}</span>
              </div>
            ))}
          </section>

          <section aria-labelledby="titulo-sin-defensa" className={styles.columna}>
            <h3 id="titulo-sin-defensa" className={styles.tituloColumna}>
              Entregaron sin defender
              <Chip tono="conteo">{resumen.sinDefensa}</Chip>
            </h3>
            {sinDefensa.map((alumno) => (
              <div key={alumno.matricula} className={styles.persona}>
                <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={32} />
                <div className={styles.personaTextos}>
                  <span className={styles.nombre}>{alumno.nombre}</span>
                  <span className={styles.estado}>{textoDeEntrega(alumno)}</span>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </TarjetaDeCelestea>
  );
}
