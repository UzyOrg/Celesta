import { IconoNivel } from '../celeste/IconoNivel';
import { Chip } from '../celeste/Chip';
import { BarraSegmentada } from './BarraSegmentada';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import type { ConteoObjetivo } from './types';
import styles from './TarjetaObjetivos.module.css';

interface TarjetaObjetivosProps {
  conteos: readonly ConteoObjetivo[];
  fijado: boolean;
  alAlternarFijado: () => void;
}

/** "Lo que mostró el grupo": por objetivo, cuántos lo explicaron, en parte o no. */
export function TarjetaObjetivos({ conteos, fijado, alAlternarFijado }: TarjetaObjetivosProps) {
  return (
    <TarjetaDeCelestea
      etiqueta="Lo que mostró el grupo"
      titulo="Lo que mostró el grupo"
      fijable={{ fijado, alAlternar: alAlternarFijado }}
    >
      <div className={styles.cuerpo}>
        <div className={styles.leyenda}>
          <span className={styles.leyendaItem}>
            <IconoNivel nivel="explico" tamano={12} />
            Lo explicó
          </span>
          <span className={styles.leyendaItem}>
            <IconoNivel nivel="en-parte" tamano={12} />
            En parte
          </span>
          <span className={styles.leyendaItem}>
            <IconoNivel nivel="no-salio" tamano={12} />
            No salió
          </span>
        </div>

        {conteos.map((conteo, indice) => (
          <div key={conteo.objetivo.id} className={conteo.masCostoso ? styles.objetivo : `${styles.objetivo} ${styles.apagado}`}>
            <div className={styles.encabezado}>
              <span className={styles.nombre}>
                {conteo.objetivo.corto}
                {conteo.masCostoso ? <Chip tono="destacado" tamano={24}>Le costó más</Chip> : null}
              </span>
              <span className={styles.cifras}>
                <span className={styles.cifra}>
                  <IconoNivel nivel="explico" tamano={9} />
                  {conteo.explico}
                </span>
                <span className={styles.cifra}>
                  <IconoNivel nivel="en-parte" tamano={9} />
                  {conteo.enParte}
                </span>
                <span className={styles.cifra}>
                  <IconoNivel nivel="no-salio" tamano={9} />
                  {conteo.noSalio}
                </span>
              </span>
            </div>
            <BarraSegmentada
              alto={10}
              animada
              retraso={0.3 + indice * 0.08}
              etiqueta={`${conteo.objetivo.corto}: ${conteo.explico} lo explicaron, ${conteo.enParte} en parte, ${conteo.noSalio} no salió`}
              segmentos={[
                { valor: conteo.explico, nivel: 'explico' },
                { valor: conteo.enParte, nivel: 'en-parte' },
                { valor: conteo.noSalio, nivel: 'no-salio' },
                { valor: conteo.sinDato, nivel: null },
              ]}
            />
          </div>
        ))}
      </div>
    </TarjetaDeCelestea>
  );
}
