import { ChevronDown, Download, Headphones } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { Chip } from '../celeste/Chip';
import { Pildora } from './Pildora';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import type { Alumno, EstadoAlumno, FilaGrupo, SeccionGrupo } from './types';
import styles from './TarjetaGrupo.module.css';

interface TarjetaGrupoProps {
  grupo: string;
  secciones: readonly SeccionGrupo[];
  abiertas: Readonly<Record<EstadoAlumno, boolean>>;
  alAlternarSeccion: (estado: EstadoAlumno) => void;
  /** Reporte pasando por "Antes de ver su reporte". */
  rutaReporte: (matricula: string) => string;
  /** Reporte directo, para quienes ya fueron revisados. */
  rutaReporteDirecto: (matricula: string) => string;
  alDescargarTrabajo: (alumno: Alumno) => void;
}

/** "Grupo 3B por estado": cuatro secciones plegables con cada alumno y lo que se puede hacer con él. */
export function TarjetaGrupo({
  grupo,
  secciones,
  abiertas,
  alAlternarSeccion,
  rutaReporte,
  rutaReporteDirecto,
  alDescargarTrabajo,
}: TarjetaGrupoProps) {
  return (
    <TarjetaDeCelestea etiqueta={`Grupo ${grupo} por estado`} recortar>
      {secciones.map((seccion, indice) => {
        const abierta = abiertas[seccion.id];
        const idLista = `lista-${seccion.id}`;
        return (
          <section key={seccion.id} className={indice === 0 ? styles.seccion : `${styles.seccion} ${styles.separada}`}>
            <h3 className={styles.titulo}>
              <button
                type="button"
                className={styles.cabecera}
                aria-expanded={abierta}
                aria-controls={idLista}
                onClick={() => alAlternarSeccion(seccion.id)}
              >
                <span className={styles.nombreSeccion}>
                  {seccion.nombre}
                  <span className={styles.cuenta}>{seccion.filas.length}</span>
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={abierta ? `${styles.flecha} ${styles.flechaAbierta}` : styles.flecha}
                />
              </button>
            </h3>
            {abierta ? (
              <ul id={idLista} className={styles.filas}>
                {seccion.filas.map((fila) => (
                  <Fila
                    key={fila.alumno.matricula}
                    fila={fila}
                    estado={seccion.id}
                    rutaReporte={rutaReporte}
                    rutaReporteDirecto={rutaReporteDirecto}
                    alDescargarTrabajo={alDescargarTrabajo}
                  />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </TarjetaDeCelestea>
  );
}

interface FilaProps {
  fila: FilaGrupo;
  estado: EstadoAlumno;
  rutaReporte: (matricula: string) => string;
  rutaReporteDirecto: (matricula: string) => string;
  alDescargarTrabajo: (alumno: Alumno) => void;
}

function Fila({ fila, estado, rutaReporte, rutaReporteDirecto, alDescargarTrabajo }: FilaProps) {
  const { alumno } = fila;
  return (
    <li className={styles.fila}>
      <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={36} />
      <div className={styles.persona}>
        <span className={styles.nombre}>{alumno.nombre}</span>
        <div className={styles.datos}>
          <span className={styles.estado}>{fila.estado}</span>
          {fila.etiquetas.map((etiqueta) => (
            <Chip
              key={etiqueta.texto}
              tono={etiqueta.tipo === 'oir' ? 'oir' : 'neutro'}
              icono={etiqueta.tipo === 'oir' ? <Headphones size={12} strokeWidth={2.2} aria-hidden="true" /> : undefined}
            >
              {etiqueta.texto}
            </Chip>
          ))}
        </div>
      </div>
      {estado === 'por-revisar' ? (
        <Pildora
          href={rutaReporte(alumno.matricula)}
          variante="suave"
          alto={40}
          relleno={16}
          letra={14}
          peso={600}
          aria-label={`Abrir el reporte de ${alumno.nombre}`}
        >
          Abrir
        </Pildora>
      ) : null}
      {estado === 'revisado' ? (
        <Link
          href={rutaReporteDirecto(alumno.matricula)}
          className={styles.ver}
          aria-label={`Ver el reporte de ${alumno.nombre}`}
        >
          Ver
        </Link>
      ) : null}
      {estado === 'sin-defensa' ? (
        <button
          type="button"
          className={styles.bajar}
          aria-label={`Descargar el trabajo de ${alumno.nombre}`}
          onClick={() => alDescargarTrabajo(alumno)}
        >
          <Download size={17} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}
