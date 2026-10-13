import { Download, Headphones } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { ETIQUETA_NIVEL, IconoNivel } from '../celeste/IconoNivel';
import { cantidadEnLetra } from './derivados';
import { marcaCapital } from './fechas';
import { Pildora } from './Pildora';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import type { Alumno, Objetivo } from './types';
import styles from './TarjetaAlumno.module.css';

interface TarjetaAlumnoProps {
  alumno: Alumno;
  grupo: string;
  objetivos: readonly Objetivo[];
  /** Dirección del reporte, pasando por "Antes de ver su reporte". */
  rutaReporte: string;
  /** Dirección del reporte directo, para la parte para oír. */
  rutaPartes: string;
  alDescargarTrabajo: () => void;
  fijado: boolean;
  alAlternarFijado: () => void;
}

/** La ficha de un alumno: sus tiempos, qué mostró en cada objetivo y qué hay para oír. */
export function TarjetaAlumno({
  alumno,
  grupo,
  objetivos,
  rutaReporte,
  rutaPartes,
  alDescargarTrabajo,
  fijado,
  alAlternarFijado,
}: TarjetaAlumnoProps) {
  const rotulo = `${alumno.tratamiento ?? 'Alumno'} del grupo ${grupo}`;
  const revision = alumno.revisoSuTranscripcion;

  return (
    <TarjetaDeCelestea
      etiqueta={alumno.nombre}
      titulo={rotulo}
      fijable={{ fijado, alAlternar: alAlternarFijado }}
    >
      <div className={styles.cuerpo}>
        <div className={styles.encabezado}>
          <div className={styles.identidad}>
            <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={60} />
            <div className={styles.identidadTextos}>
              <span className={styles.nombre}>{alumno.nombre}</span>
              <span className={styles.matricula}>{alumno.matricula}</span>
            </div>
          </div>
          <div className={styles.acciones}>
            <Pildora href={rutaReporte} alto={44} relleno={18} letra={15} peso={650}>
              Abrir reporte
            </Pildora>
            <Pildora
              variante="contorno"
              alto={44}
              relleno={16}
              letra={15}
              peso={600}
              icono={<Download size={17} strokeWidth={2} aria-hidden="true" />}
              onClick={alDescargarTrabajo}
            >
              Su trabajo
            </Pildora>
          </div>
        </div>

        <ol className={styles.fichas}>
          <li className={styles.ficha}>
            <span className={styles.fichaRotulo}>
              <span className={styles.punto} aria-hidden="true" />
              Entregó
            </span>
            <span className={styles.fichaValor}>{alumno.entrega ? marcaCapital(alumno.entrega) : 'Sin entrega'}</span>
            {alumno.entrega ? (
              <span className={styles.fichaDetalle}>{alumno.entregaTardia ? 'Después del cierre' : 'A tiempo'}</span>
            ) : null}
          </li>
          <li className={styles.ficha}>
            <span className={styles.fichaRotulo}>
              <span className={styles.punto} aria-hidden="true" />
              Defendió
            </span>
            <span className={styles.fichaValor}>{alumno.defensa?.hora ?? 'Sin defensa'}</span>
            {alumno.duracion ? <span className={styles.fichaDetalle}>{`Duró ${alumno.duracion}`}</span> : null}
          </li>
          {revision ? (
            <li className={styles.ficha}>
              <span className={styles.fichaRotulo}>
                <span className={styles.punto} aria-hidden="true" />
                Revisó lo que dijo
              </span>
              <span className={styles.fichaValor}>{revision.hora}</span>
              <span className={styles.fichaDetalle}>{revision.nota}</span>
            </li>
          ) : null}
        </ol>

        <div className={styles.objetivos}>
          {objetivos.map((objetivo, indice) => {
            const nivel = alumno.evidencia[indice] ?? null;
            return (
              <div key={objetivo.id} className={styles.objetivo}>
                <span className={styles.objetivoTexto}>{objetivo.texto}</span>
                {nivel ? (
                  <span className={styles.nivel}>
                    <IconoNivel nivel={nivel} tamano={12} />
                    {ETIQUETA_NIVEL[nivel]}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {alumno.partesParaOir > 0 ? (
          <Link href={rutaPartes} className={styles.partes}>
            <Headphones size={20} strokeWidth={2} aria-hidden="true" className={styles.partesIcono} />
            <span className={styles.partesTexto}>
              {textoPartes(alumno)}
            </span>
            <span className={styles.partesOir}>Oír</span>
          </Link>
        ) : null}
      </div>
    </TarjetaDeCelestea>
  );
}

/** "Dos partes para oír: una aclarada y una que Ana marcó". */
function textoPartes(alumno: Alumno): string {
  const cuantas = alumno.partesParaOir;
  const encabezado = `${cantidadEnLetra(cuantas)} ${cuantas === 1 ? 'parte' : 'partes'} para oír`;
  if (cuantas === 2) return `${encabezado}: una aclarada y una que ${alumno.primerNombre} marcó`;
  return encabezado;
}
