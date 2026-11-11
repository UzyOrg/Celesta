'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { RespuestaAsistente, TarjetaRespuesta } from './catalogo';
import { LineaDeCelestea } from './LineaDeCelestea';
import { PasosDeCelestea, type PasoVisible } from './PasosDeCelestea';
import { TarjetaAlumno } from './TarjetaAlumno';
import { TarjetaAvance } from './TarjetaAvance';
import { TarjetaCitas } from './TarjetaCitas';
import { TarjetaDescarga } from './TarjetaDescarga';
import { TarjetaGrupo } from './TarjetaGrupo';
import { TarjetaLista } from './TarjetaLista';
import { TarjetaObjetivo } from './TarjetaObjetivo';
import { TarjetaObjetivos } from './TarjetaObjetivos';
import { TarjetaPendientes } from './TarjetaPendientes';
import { TarjetaRitmo } from './TarjetaRitmo';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import type { Alumno, ActividadProfesor, ClaveFijable, DescargaGrupo, EstadoAlumno } from './types';
import styles from './TarjetasDelAsistente.module.css';

export interface AccionesDeRespuesta {
  actividad: ActividadProfesor;
  alumnoBuscado: Alumno;
  rutaReporte: (matricula: string) => string;
  rutaReporteDirecto: (matricula: string) => string;
  fijados: Readonly<Record<ClaveFijable, boolean>>;
  alAlternarFijado: (clave: ClaveFijable) => void;
  alDescargarTrabajo: (alumno: Alumno | string) => void;
  descarga: { archivo: DescargaGrupo; lista: boolean; error: string | null; alDescargarOtraVez: () => void };
  secciones: { abiertas: Readonly<Record<EstadoAlumno, boolean>>; alAlternar: (estado: EstadoAlumno) => void };
  alVerTodo: () => void;
}

interface RespuestaDelAsistenteProps extends AccionesDeRespuesta {
  /** Mientras Celestea trabaja no hay respuesta: solo pasos. */
  respuesta: RespuestaAsistente | null;
  pasos: readonly PasoVisible[];
}

/**
 * Lo que contesta el asistente: los pasos que dio (plegados al terminar), su frase
 * y las tarjetas del catálogo. Cada tarjeta tiene su propio límite de error: si una
 * falla, se dice y las demás siguen; un tipo desconocido simplemente no se pinta.
 */
export function RespuestaDelAsistente({ respuesta, pasos, ...acciones }: RespuestaDelAsistenteProps) {
  return (
    <>
      <PasosDeCelestea pasos={pasos} terminado={respuesta !== null} />
      {respuesta ? (
        <>
          <LineaDeCelestea>{respuesta.texto}</LineaDeCelestea>
          {respuesta.tarjetas.map((tarjeta, indice) => (
            <LimiteDeTarjeta key={`${tarjeta.tipo}-${indice}`}>
              <TarjetaDelCatalogo tarjeta={tarjeta} acciones={acciones} />
            </LimiteDeTarjeta>
          ))}
        </>
      ) : null}
    </>
  );
}

function TarjetaDelCatalogo({ tarjeta, acciones }: { tarjeta: TarjetaRespuesta; acciones: AccionesDeRespuesta }): ReactNode {
  const { actividad, rutaReporte, rutaReporteDirecto, fijados, alAlternarFijado } = acciones;
  switch (tarjeta.tipo) {
    case 'avance':
      return (
        <TarjetaAvance
          grupo={actividad.grupo}
          resumen={tarjeta.props.resumen}
          sinEntregar={tarjeta.props.sinEntregar}
          sinDefensa={tarjeta.props.sinDefensa}
          fijado={fijados.avance}
          alAlternarFijado={() => alAlternarFijado('avance')}
        />
      );
    case 'alumno': {
      const { alumno } = tarjeta.props;
      const esElFijable = alumno.matricula === acciones.alumnoBuscado.matricula;
      return (
        <TarjetaAlumno
          alumno={alumno}
          grupo={actividad.grupo}
          objetivos={actividad.objetivos}
          rutaReporte={rutaReporte(alumno.matricula)}
          rutaPartes={rutaReporteDirecto(alumno.matricula)}
          alDescargarTrabajo={() => acciones.alDescargarTrabajo(alumno)}
          {...(esElFijable ? { fijado: fijados.ana, alAlternarFijado: () => alAlternarFijado('ana') } : {})}
        />
      );
    }
    case 'grupo':
      return (
        <TarjetaGrupo
          grupo={actividad.grupo}
          secciones={tarjeta.props.secciones}
          abiertas={acciones.secciones.abiertas}
          alAlternarSeccion={acciones.secciones.alAlternar}
          rutaReporte={rutaReporte}
          rutaReporteDirecto={rutaReporteDirecto}
          alDescargarTrabajo={acciones.alDescargarTrabajo}
        />
      );
    case 'objetivos':
      return <TarjetaObjetivos conteos={tarjeta.props.conteos} fijado={fijados.objetivos} alAlternarFijado={() => alAlternarFijado('objetivos')} />;
    case 'descarga':
      return (
        <TarjetaDescarga
          descarga={tarjeta.props.descarga}
          entregaron={tarjeta.props.entregaron}
          sinEntregar={tarjeta.props.sinEntregar}
          lista={acciones.descarga.lista}
          error={acciones.descarga.error}
          alDescargarOtraVez={acciones.descarga.alDescargarOtraVez}
        />
      );
    case 'lista':
      return (
        <TarjetaLista
          datos={tarjeta.props}
          rutaReporte={rutaReporte}
          rutaReporteDirecto={rutaReporteDirecto}
          alDescargarTrabajo={acciones.alDescargarTrabajo}
          alVerTodo={acciones.alVerTodo}
        />
      );
    case 'objetivo':
      return <TarjetaObjetivo datos={tarjeta.props} rutaReporte={rutaReporte} />;
    case 'citas':
      return <TarjetaCitas datos={tarjeta.props} rutaReporteDirecto={rutaReporteDirecto} />;
    case 'pendientes':
      return (
        <TarjetaPendientes
          datos={tarjeta.props}
          rutaPrimero={tarjeta.props.primeraMatricula ? rutaReporte(tarjeta.props.primeraMatricula) : null}
        />
      );
    case 'ritmo':
      return <TarjetaRitmo datos={tarjeta.props} />;
    case 'accion':
      // Las acciones se ejecutan al llegar la respuesta; no tienen tarjeta propia.
      return null;
    default:
      return null;
  }
}

interface LimiteProps {
  children: ReactNode;
}

/** Si una tarjeta falla al pintarse, se dice y las demás siguen. */
class LimiteDeTarjeta extends Component<LimiteProps, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError(): { fallo: boolean } {
    return { fallo: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error('revision_tarjeta_fallo', { nombre: error.name });
  }

  render(): ReactNode {
    if (this.state.fallo) {
      return (
        <TarjetaDeCelestea etiqueta="Esta parte no se pudo mostrar">
          <p className={styles.vacio}>Esta parte no se pudo mostrar. Lo demás sigue aquí.</p>
        </TarjetaDeCelestea>
      );
    }
    return this.props.children;
  }
}
