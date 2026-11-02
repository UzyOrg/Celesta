import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { Chip } from '../celeste/Chip';
import { ETIQUETA_NIVEL, IconoNivel } from '../celeste/IconoNivel';
import { BarraSegmentada } from './BarraSegmentada';
import type { PropsTarjetaObjetivo } from './catalogo';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import styles from './TarjetasDelAsistente.module.css';

interface TarjetaObjetivoProps {
  datos: PropsTarjetaObjetivo;
  rutaReporte: (matricula: string) => string;
}

/** Un solo objetivo de cerca: cuántos lo explicaron y, con nombre, quiénes no del todo. */
export function TarjetaObjetivo({ datos, rutaReporte }: TarjetaObjetivoProps) {
  const { conteo, defendieron, porNivel } = datos;
  const titulo = `Objetivo ${conteo.objetivo.id}: ${conteo.objetivo.corto}`;
  const descripcion = `De ${defendieron} defensas: ${conteo.explico} lo explicaron, ${conteo.enParte} en parte, ${conteo.noSalio} no salió y ${conteo.sinDato} sin dato`;

  return (
    <TarjetaDeCelestea etiqueta={titulo} titulo={titulo}>
      <div className={styles.cuerpo}>
        <p className={styles.objetivoTexto}>{conteo.objetivo.texto}</p>
        <BarraSegmentada
          alto={12}
          animada
          retraso={0.2}
          etiqueta={descripcion}
          segmentos={[
            { valor: conteo.explico, nivel: 'explico' },
            { valor: conteo.enParte, nivel: 'en-parte' },
            { valor: conteo.noSalio, nivel: 'no-salio' },
            { valor: conteo.sinDato, nivel: null },
          ]}
        />
        {defendieron === 0 ? (
          <p className={styles.vacio}>Nadie ha defendido todavía.</p>
        ) : (
          <div className={styles.columnas}>
            {porNivel.map((grupo) => {
              const nombre = grupo.nivel ? ETIQUETA_NIVEL[grupo.nivel] : 'Sin dato';
              const faltan = grupo.total - grupo.personas.length;
              return (
                <section key={nombre} aria-label={`${nombre}: ${grupo.total}`} className={styles.columna}>
                  <h3 className={styles.tituloColumna}>
                    {grupo.nivel ? <IconoNivel nivel={grupo.nivel} tamano={12} /> : null}
                    {nombre}
                    <Chip tono="conteo">{grupo.total}</Chip>
                  </h3>
                  {grupo.personas.map((persona) => (
                    <Link key={persona.matricula} href={rutaReporte(persona.matricula)} className={styles.personaEnlace}>
                      <Avatar iniciales={persona.iniciales} nombre={persona.nombre} tamano={32} />
                      <span className={styles.nombre}>{persona.nombre}</span>
                    </Link>
                  ))}
                  {faltan > 0 ? <span className={styles.detalle}>{`Y ${faltan} más.`}</span> : null}
                  {grupo.total === 0 ? <span className={styles.detalle}>Nadie.</span> : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </TarjetaDeCelestea>
  );
}
