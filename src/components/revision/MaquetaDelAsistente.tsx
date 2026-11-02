'use client';

import { Check, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarraDeCelestea } from './BarraDeCelestea';
import { alumnosEnEstado, ordenarAlumnos, resumenDelGrupo } from './derivados';
import { LineaDeCelestea } from './LineaDeCelestea';
import { DESCRIPCION_DE_MAQUETA, ESCENAS_DE_MAQUETA, type Maqueta, type TarjetaDeMaqueta } from './maquetas';
import { PasosDeCelestea, type PasoVisible } from './PasosDeCelestea';
import { TarjetaAlumno } from './TarjetaAlumno';
import { TarjetaAvance } from './TarjetaAvance';
import { TarjetaCitas } from './TarjetaCitas';
import { TarjetaEnlace } from './TarjetaEnlace';
import { TarjetaLista } from './TarjetaLista';
import { TarjetaObjetivo } from './TarjetaObjetivo';
import { TarjetaPendientes } from './TarjetaPendientes';
import { TarjetaRitmo } from './TarjetaRitmo';
import type { DatosGrupo } from './types';
import inicio from './InicioAgentico.module.css';
import styles from './MaquetaDelAsistente.module.css';

interface MaquetaDelAsistenteProps {
  grupo: DatosGrupo;
  /** `null` muestra el índice de maquetas. */
  maqueta: Maqueta | null;
}

/** Cada cuánto se completa un paso en la maqueta, en milisegundos. */
const MS_POR_PASO = 650;
const MS_AVISO = 2600;

function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Maquetas del asistente del profesor: cómo se verían sus respuestas con el
 * catálogo cerrado de tarjetas. Solo existen con el grupo de ejemplo; aquí no
 * hay modelo de lenguaje ni servidor detrás, y la barra no consulta nada.
 */
export function MaquetaDelAsistente({ grupo, maqueta }: MaquetaDelAsistenteProps) {
  const { actividad, alumnos } = grupo;
  const token = actividad.token;
  const rotuloGrupo = `Grupo ${actividad.grupo}`;

  const [hechos, setHechos] = useState(0);
  const [barraAbierta, setBarraAbierta] = useState(true);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [enlaceActivo, setEnlaceActivo] = useState(true);
  const [avanceFijado, setAvanceFijado] = useState(false);
  const temporizadorAviso = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resumen = useMemo(() => resumenDelGrupo(alumnos), [alumnos]);
  const sinEntregar = useMemo(() => ordenarAlumnos('sin-entregar', alumnosEnEstado(alumnos, 'sin-entregar')), [alumnos]);
  const sinDefensa = useMemo(() => ordenarAlumnos('sin-defensa', alumnosEnEstado(alumnos, 'sin-defensa')), [alumnos]);

  const rutaReporte = useCallback((matricula: string) => `/revision/${token}/alumno/${matricula}`, [token]);
  const rutaReporteDirecto = useCallback((matricula: string) => `/revision/${token}/alumno/${matricula}?vista=reporte`, [token]);

  const avisar = useCallback((mensaje: string) => {
    clearTimeout(temporizadorAviso.current);
    setAviso(mensaje);
    temporizadorAviso.current = setTimeout(() => setAviso(null), MS_AVISO);
  }, []);

  // Los pasos se van completando uno por uno; con movimiento reducido llegan todos de una vez.
  const totalPasos = maqueta?.pasos.length ?? 0;
  const congelada = maqueta?.congelada === true;
  useEffect(() => {
    setHechos(0);
    if (totalPasos === 0) return undefined;
    const limite = congelada ? totalPasos - 1 : totalPasos;
    if (prefiereMenosMovimiento()) {
      setHechos(limite);
      return undefined;
    }
    const intervalo = setInterval(() => {
      setHechos((actuales) => {
        if (actuales + 1 >= limite) clearInterval(intervalo);
        return Math.min(limite, actuales + 1);
      });
    }, MS_POR_PASO);
    return () => clearInterval(intervalo);
  }, [maqueta?.escena, totalPasos, congelada]);

  useEffect(() => () => clearTimeout(temporizadorAviso.current), []);

  const terminado = maqueta !== null && !congelada && hechos >= totalPasos;
  const pasos: PasoVisible[] = (maqueta?.pasos ?? []).slice(0, Math.min(totalPasos, hechos + 1)).map((paso, indice) => ({
    texto: paso,
    hecho: indice < hechos,
  }));

  const pintarTarjeta = (tarjeta: TarjetaDeMaqueta, indice: number) => {
    switch (tarjeta.tipo) {
      case 'lista':
        return (
          <TarjetaLista
            key={indice}
            datos={tarjeta.props}
            rutaReporte={rutaReporte}
            rutaReporteDirecto={rutaReporteDirecto}
            alDescargarTrabajo={() => avisar('En la maqueta no se descarga nada.')}
            alVerTodo={() => avisar('Abriría la lista por estado completa.')}
          />
        );
      case 'objetivo':
        return <TarjetaObjetivo key={indice} datos={tarjeta.props} rutaReporte={rutaReporte} />;
      case 'citas':
        return <TarjetaCitas key={indice} datos={tarjeta.props} rutaReporteDirecto={rutaReporteDirecto} />;
      case 'alumno':
        return (
          <TarjetaAlumno
            key={indice}
            alumno={tarjeta.alumno}
            grupo={actividad.grupo}
            objetivos={actividad.objetivos}
            rutaReporte={rutaReporte(tarjeta.alumno.matricula)}
            rutaPartes={rutaReporteDirecto(tarjeta.alumno.matricula)}
            alDescargarTrabajo={() => avisar('En la maqueta no se descarga nada.')}
            fijado={false}
            alAlternarFijado={() => avisar('Fijar a cualquier persona queda para la fase 2.')}
          />
        );
      case 'avance':
        return (
          <TarjetaAvance
            key={indice}
            grupo={actividad.grupo}
            resumen={resumen}
            sinEntregar={sinEntregar}
            sinDefensa={sinDefensa}
            fijado={avanceFijado}
            alAlternarFijado={() => setAvanceFijado((actual) => !actual)}
          />
        );
      case 'pendientes':
        return <TarjetaPendientes key={indice} datos={tarjeta.props} rutaPrimero={tarjeta.rutaPrimero} />;
      case 'ritmo':
        return <TarjetaRitmo key={indice} datos={tarjeta.props} />;
      case 'enlace':
        return (
          <TarjetaEnlace
            key={indice}
            datos={{ ...tarjeta.props, activo: enlaceActivo }}
            alCambiar={(activo) => {
              setEnlaceActivo(activo);
              avisar(activo ? 'Maqueta: el enlace quedaría reactivado.' : 'Maqueta: el enlace quedaría desactivado.');
            }}
          />
        );
    }
  };

  return (
    <>
      <div className={inicio.barraSuperior}>
        <Link
          href={maqueta ? `/revision/${token}?escena=asistente` : `/revision/${token}`}
          className={`${inicio.volver} ${styles.sinSubrayado}`}
        >
          <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>{maqueta ? 'Maquetas del asistente' : actividad.nombre}</span>
          <span className={inicio.grupo}>{rotuloGrupo}</span>
        </Link>
        <span className={inicio.cierre}>Maqueta con datos de ejemplo</span>
      </div>

      <div className={inicio.contenido}>
        <div className={inicio.columna}>
          {maqueta ? (
            <>
              <h1 className={inicio.soloLector}>{`Maqueta: ${DESCRIPCION_DE_MAQUETA[maqueta.escena]}`}</h1>
              <div className={inicio.peticion}>
                <div className={inicio.burbuja}>{maqueta.peticion}</div>
              </div>
              <PasosDeCelestea pasos={pasos} terminado={terminado} />
              {terminado || totalPasos === 0 ? (
                <>
                  <LineaDeCelestea>{maqueta.texto}</LineaDeCelestea>
                  {maqueta.tarjetas.map(pintarTarjeta)}
                </>
              ) : null}
            </>
          ) : (
            <section aria-labelledby="titulo-maquetas" className={styles.indice}>
              <h1 id="titulo-maquetas" className={styles.titulo}>
                Maquetas del asistente
              </h1>
              <p className={styles.explicacion}>
                Cómo respondería Celestea con el catálogo cerrado de tarjetas. Datos de ejemplo, sin modelo de lenguaje:
                la propuesta está en <code>docs/defensas/asistente-profesor.md</code>.
              </p>
              <ul className={styles.lista}>
                {ESCENAS_DE_MAQUETA.map((escena) => (
                  <li key={escena}>
                    <Link href={`/revision/${token}?escena=${escena}`} className={styles.enlace}>
                      <span>{DESCRIPCION_DE_MAQUETA[escena]}</span>
                      <span className={styles.clave}>{escena}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {aviso ? (
        <div role="status" className={inicio.aviso}>
          <Check size={16} strokeWidth={2.4} aria-hidden="true" className={inicio.avisoIcono} />
          <span>{aviso}</span>
        </div>
      ) : null}

      <div aria-hidden="true" className={inicio.degradado} />

      <BarraDeCelestea
        variante="inicio"
        abierta={barraAbierta}
        alCambiarAbierta={setBarraAbierta}
        texto={texto}
        alCambiarTexto={setTexto}
        alEnviar={() => {
          setTexto('');
          avisar('En la maqueta la barra no consulta a Celestea.');
        }}
        sugerencias={!texto && (terminado || !maqueta) ? (maqueta?.sugerencias ?? null) : null}
        alPedirSugerencia={() => avisar('En la maqueta la barra no consulta a Celestea.')}
        pensando={maqueta !== null && !terminado && totalPasos > 0}
        placeholder="Pide lo que quieras ver o hacer…"
        etiquetaCampo="Pídele algo a Celestea"
        etiquetaBotonCerrado="Pregúntale a Celestea"
        pie="Celestea responde con los datos de tu grupo. Tú decides."
      />
    </>
  );
}
