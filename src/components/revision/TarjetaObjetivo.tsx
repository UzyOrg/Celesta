'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
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

/**
 * Un solo objetivo de cerca. Al principio solo se ven los conteos; los nombres de
 * quienes no lo explicaron del todo aparecen cuando el profesor toca "Ver quiénes".
 */
export function TarjetaObjetivo({ datos, rutaReporte }: TarjetaObjetivoProps) {
  const { conteo, defendieron, porNivel } = datos;
  const [abierta, setAbierta] = useState(false);
  const idNombres = useId();
  const titulo = `Objetivo ${conteo.objetivo.id}: ${conteo.objetivo.corto}`;
  const descripcion = `De ${defendieron} defensas: ${conteo.explico} lo explicaron, ${conteo.enParte} en parte, ${conteo.noSalio} no salió y ${conteo.sinDato} sin dato`;
  const conNombres = porNivel.some((grupo) => grupo.total > 0);

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
          <>
            <div className={styles.conteosNivel}>
              <span className={styles.leyendaItem}>
                <IconoNivel nivel="explico" tamano={12} />
                {ETIQUETA_NIVEL.explico} <span className={styles.mono}>{conteo.explico}</span>
              </span>
              <span className={styles.leyendaItem}>
                <IconoNivel nivel="en-parte" tamano={12} />
                {ETIQUETA_NIVEL['en-parte']} <span className={styles.mono}>{conteo.enParte}</span>
              </span>
              <span className={styles.leyendaItem}>
                <IconoNivel nivel="no-salio" tamano={12} />
                {ETIQUETA_NIVEL['no-salio']} <span className={styles.mono}>{conteo.noSalio}</span>
              </span>
              {conteo.sinDato > 0 ? (
                <span className={styles.leyendaItem}>
                  Sin dato <span className={styles.mono}>{conteo.sinDato}</span>
                </span>
              ) : null}
            </div>
            {conNombres ? (
              <button
                type="button"
                className={styles.desplegar}
                aria-expanded={abierta}
                aria-controls={idNombres}
                onClick={() => setAbierta((actual) => !actual)}
              >
                {abierta ? 'Ocultar quiénes' : 'Ver quiénes no lo explicaron del todo'}
                <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className={abierta ? styles.flechaAbierta : styles.flecha} />
              </button>
            ) : null}
            <div id={idNombres} hidden={!abierta} className={styles.columnas}>
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
          </>
        )}
      </div>
    </TarjetaDeCelestea>
  );
}
