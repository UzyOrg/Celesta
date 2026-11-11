import { Chip } from '../celeste/Chip';
import { variablesCss } from '../celeste/variablesCss';
import type { PropsTarjetaRitmo } from './catalogo';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import styles from './TarjetasDelAsistente.module.css';

interface TarjetaRitmoProps {
  datos: PropsTarjetaRitmo;
}

/**
 * Cuándo entregó y defendió el grupo, día por día. Solo cuentas del grupo: no
 * ordena a nadie por rapidez ni muestra cuánto tardó cada persona.
 */
export function TarjetaRitmo({ datos }: TarjetaRitmoProps) {
  const { dias, tarde, duracionTipica } = datos;
  const maximo = Math.max(1, ...dias.flatMap((dia) => [dia.entregas, dia.defensas]));
  const titulo = 'Cuándo entregaron y defendieron';

  return (
    <TarjetaDeCelestea etiqueta={titulo} titulo={titulo}>
      <div className={styles.cuerpo}>
        {dias.length === 0 ? (
          <p className={styles.vacio}>Nadie ha entregado todavía.</p>
        ) : (
          <>
            <div className={styles.leyenda} aria-hidden="true">
              <span className={styles.leyendaItem}>
                <span className={`${styles.muestra} ${styles.muestraEntrega}`} />
                Entregas
              </span>
              <span className={styles.leyendaItem}>
                <span className={`${styles.muestra} ${styles.muestraDefensa}`} />
                Defensas
              </span>
            </div>
            <ul className={styles.dias}>
              {dias.map((dia) => (
                <li
                  key={dia.dia}
                  className={styles.dia}
                  aria-label={`${dia.dia}: ${dia.entregas} entregas y ${dia.defensas} defensas${dia.esCierre ? ', día del cierre' : ''}`}
                >
                  <span className={styles.diaNombre} aria-hidden="true">
                    {dia.dia}
                    {dia.esCierre ? <Chip tono="contorno">Cierre</Chip> : null}
                  </span>
                  <span className={styles.diaBarras} aria-hidden="true">
                    <span className={styles.diaFila}>
                      <span
                        className={`${styles.diaBarra} ${styles.muestraEntrega}`}
                        style={variablesCss({ '--ancho': `${(dia.entregas / maximo) * 100}%` })}
                      />
                      <span className={styles.mono}>{dia.entregas}</span>
                    </span>
                    <span className={styles.diaFila}>
                      <span
                        className={`${styles.diaBarra} ${styles.muestraDefensa}`}
                        style={variablesCss({ '--ancho': `${(dia.defensas / maximo) * 100}%` })}
                      />
                      <span className={styles.mono}>{dia.defensas}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className={styles.detalle}>
          {tarde.entregas + tarde.defensas === 0
            ? 'Nadie entregó ni defendió después del cierre.'
            : `Después del cierre: ${tarde.entregas} ${tarde.entregas === 1 ? 'entrega' : 'entregas'} y ${tarde.defensas} ${tarde.defensas === 1 ? 'defensa' : 'defensas'}.`}
          {duracionTipica ? ` Una defensa dura por lo general ${duracionTipica}.` : ''}
        </p>
      </div>
    </TarjetaDeCelestea>
  );
}
