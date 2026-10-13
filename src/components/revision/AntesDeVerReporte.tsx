'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Avatar } from '../celeste/Avatar';
import { construirMenu, resumenDelGrupo } from './derivados';
import { diaLargo } from './fechas';
import { MarcoProfesor } from './MarcoProfesor';
import type { DatosReporte } from './types';
import styles from './AntesDeVerReporte.module.css';

interface AntesDeVerReporteProps {
  datos: DatosReporte;
}

const OPCIONES = ['Sí', 'En parte', 'No'] as const;

/**
 * "Antes de ver su reporte": se le pide al profesor que diga qué cree del
 * alumno antes de leer lo que dice el reporte. Así luego se puede comparar su
 * idea con lo que mostró la defensa. El alumno nunca ve esta respuesta.
 *
 * Es un diálogo que no se puede cerrar con Escape ni tocando el fondo: la
 * salida es contestar o elegir "No sé". En el prototipo la respuesta no se
 * guarda; cualquiera de las cuatro opciones lleva al reporte.
 */
export function AntesDeVerReporte({ datos }: AntesDeVerReporteProps) {
  const { grupo, alumno, cola } = datos;
  const { actividad, profesora } = grupo;
  const rutaReporte = `/revision/${actividad.token}/alumno/${alumno.matricula}?vista=reporte`;

  const fondo = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Todo lo que queda detrás del diálogo deja de recibir foco y de leerse.
  useEffect(() => {
    const detras = fondo.current;
    detras?.setAttribute('inert', '');
    panel.current?.focus({ preventScroll: true });
    return () => detras?.removeAttribute('inert');
  }, []);

  const resumen = resumenDelGrupo(grupo.alumnos);
  const menu = construirMenu('revisar', actividad, resumen, grupo.otrasActividades);

  // El foco da la vuelta dentro del diálogo.
  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab' || !panel.current) return;
    const enlaces = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href]'));
    const primero = enlaces[0];
    const ultimo = enlaces[enlaces.length - 1];
    if (!primero || !ultimo) return;
    const activo = document.activeElement;
    if (evento.shiftKey && (activo === primero || activo === panel.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  const entrego = alumno.entrega ? `, entregó el ${diaLargo(alumno.entrega.dia)} a las ${alumno.entrega.hora}` : '';

  return (
    <>
      <div ref={fondo} className={styles.detras}>
        <MarcoProfesor
          token={actividad.token}
          menu={menu}
          profesora={profesora}
          forma="bloqueada"
          oculto
          difuminado
        >
          <div className={styles.esqueleto}>
            <div className={styles.migas}>
              <span>Inicio</span>
              {cola ? <span>{`${cola.posicion} de ${cola.total} por revisar`}</span> : null}
            </div>
            <div className={styles.identidad}>
              <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={64} />
              <div className={styles.textos}>
                <span className={styles.nombre}>{alumno.nombre}</span>
                <span className={styles.meta}>{`${alumno.matricula}${entrego}`}</span>
              </div>
            </div>
            <div className={styles.fichas}>
              <span className={styles.ficha} />
              <span className={styles.ficha} />
              <span className={styles.ficha} />
            </div>
            <div className={styles.bloque}>
              <span className={styles.lineaCorta} />
              <span className={styles.lineaLarga} />
              <span className={styles.caja} />
              <span className={styles.cajaOro} />
            </div>
          </div>
        </MarcoProfesor>
      </div>

      <div className={styles.velo}>
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-antes"
          aria-describedby="descripcion-antes"
          tabIndex={-1}
          className={styles.panel}
          onKeyDown={alTeclear}
        >
          <div className={styles.persona}>
            <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={48} />
            <div className={styles.personaTextos}>
              <span className={styles.personaNombre}>{alumno.nombre}</span>
              <span className={styles.personaRotulo}>Antes de ver su reporte</span>
            </div>
          </div>
          <h1 id="titulo-antes" className={styles.titulo}>
            {`¿Crees que ${alumno.primerNombre} domina el tema?`}
          </h1>
          <div className={styles.opciones}>
            {OPCIONES.map((opcion) => (
              <Link key={opcion} href={rutaReporte} className={styles.opcion}>
                {opcion}
              </Link>
            ))}
          </div>
          <div className={styles.pie}>
            <p id="descripcion-antes" className={styles.nota}>
              {`${alumno.primerNombre} no ve tu respuesta. Nos dice si el reporte te sirve.`}
            </p>
            <Link href={rutaReporte} className={styles.noSe}>
              No sé
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
