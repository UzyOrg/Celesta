import { Download, Headphones } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { Chip } from '../celeste/Chip';
import type { PropsTarjetaLista } from './catalogo';
import { Pildora } from './Pildora';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import styles from './TarjetasDelAsistente.module.css';

interface TarjetaListaProps {
  datos: PropsTarjetaLista;
  /** Reporte pasando por "Antes de ver su reporte". */
  rutaReporte: (matricula: string) => string;
  /** Reporte directo, para quienes ya fueron revisados. */
  rutaReporteDirecto: (matricula: string) => string;
  alDescargarTrabajo: (matricula: string) => void;
  /** Abre la lista por estado completa cuando hay más filas de las que caben. */
  alVerTodo: () => void;
}

/** Una lista del grupo con un filtro ya aplicado: "Entregaron o defendieron tarde". */
export function TarjetaLista({ datos, rutaReporte, rutaReporteDirecto, alDescargarTrabajo, alVerTodo }: TarjetaListaProps) {
  const { titulo, filas, total, vacio } = datos;
  const faltan = total - filas.length;

  return (
    <TarjetaDeCelestea etiqueta={titulo} titulo={titulo}>
      {filas.length === 0 ? (
        <p className={styles.vacio}>{vacio}</p>
      ) : (
        <ul className={styles.filas}>
          {filas.map((fila) => (
            <li key={fila.matricula} className={styles.fila}>
              <Avatar iniciales={fila.iniciales} nombre={fila.nombre} tamano={36} />
              <div className={styles.persona}>
                <span className={styles.nombre}>{fila.nombre}</span>
                <div className={styles.datos}>
                  <span className={styles.detalle}>{fila.detalle}</span>
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
              {fila.accion === 'abrir' ? (
                <Pildora
                  href={rutaReporte(fila.matricula)}
                  variante="suave"
                  alto={40}
                  relleno={16}
                  letra={14}
                  peso={600}
                  aria-label={`Abrir el reporte de ${fila.nombre}`}
                >
                  Abrir
                </Pildora>
              ) : null}
              {fila.accion === 'ver' ? (
                <Link href={rutaReporteDirecto(fila.matricula)} className={styles.ver} aria-label={`Ver el reporte de ${fila.nombre}`}>
                  Ver
                </Link>
              ) : null}
              {fila.accion === 'bajar' ? (
                <button
                  type="button"
                  className={styles.bajar}
                  aria-label={`Descargar el trabajo de ${fila.nombre}`}
                  onClick={() => alDescargarTrabajo(fila.matricula)}
                >
                  <Download size={17} strokeWidth={2} aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {faltan > 0 ? (
        <div className={styles.pie}>
          <span className={styles.detalle}>{`Y ${faltan} más.`}</span>
          <button type="button" className={styles.enlaceTexto} onClick={alVerTodo}>
            Ver la lista completa
          </button>
        </div>
      ) : null}
    </TarjetaDeCelestea>
  );
}
