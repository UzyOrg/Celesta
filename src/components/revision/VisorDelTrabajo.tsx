'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiProfesor, ErrorDelProfesor } from './clienteProfesor';
import { marcaCorta } from './fechas';
import type { TrabajoParaLeer } from './types';
import styles from './VisorDelTrabajo.module.css';

interface VisorDelTrabajoProps {
  token: string;
  /** La entrega que se lee (con datos reales). */
  entregaId: string | undefined;
  /** En el escenario de ejemplo el trabajo viene escrito; con datos reales se pide al abrir. */
  deEjemplo: TrabajoParaLeer | null;
  conectado: boolean;
  primerNombre: string;
  alDescargar: () => void;
  alCerrar: () => void;
}

type Estado = { tipo: 'cargando' } | { tipo: 'listo'; trabajo: TrabajoParaLeer } | { tipo: 'error'; mensaje: string };

/**
 * El trabajo que entregó el alumno, para leerlo junto a su reporte. Solo lectura:
 * aquí no se califica ni se anota nada. En escritorio queda a un lado del reporte;
 * en el celular ocupa la pantalla y se cierra con la X o con Escape.
 */
export function VisorDelTrabajo({ token, entregaId, deEjemplo, conectado, primerNombre, alDescargar, alCerrar }: VisorDelTrabajoProps) {
  const [estado, setEstado] = useState<Estado>(() =>
    deEjemplo ? { tipo: 'listo', trabajo: deEjemplo } : conectado ? { tipo: 'cargando' } : { tipo: 'error', mensaje: `Esta demostración no trae el trabajo de ${primerNombre}.` },
  );
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cerrar.current?.focus({ preventScroll: true });
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') alCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alCerrar]);

  useEffect(() => {
    if (deEjemplo || !conectado) return undefined;
    if (!entregaId) {
      setEstado({ tipo: 'error', mensaje: `${primerNombre} todavía no tiene un trabajo entregado.` });
      return undefined;
    }
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    apiProfesor
      .trabajo(token, entregaId)
      .then((trabajo) => vigente && setEstado({ tipo: 'listo', trabajo }))
      .catch((causa: unknown) => {
        if (!vigente) return;
        setEstado({ tipo: 'error', mensaje: causa instanceof ErrorDelProfesor ? causa.message : 'No pude abrir el trabajo. Inténtalo otra vez.' });
      });
    return () => {
      vigente = false;
    };
  }, [token, entregaId, deEjemplo, conectado, primerNombre]);

  const trabajo = estado.tipo === 'listo' ? estado.trabajo : null;
  const detalles = trabajo
    ? [
        trabajo.version > 1 ? `Versión ${trabajo.version}` : null,
        trabajo.paginas ? `${trabajo.paginas} ${trabajo.paginas === 1 ? 'página' : 'páginas'}` : null,
        trabajo.palabras ? `${trabajo.palabras.toLocaleString('es-MX')} palabras` : null,
        `Entregó ${marcaCorta(trabajo.entregadoEn)}`,
      ].filter((parte): parte is string => parte !== null)
    : [];

  return (
    <aside aria-label={`Trabajo de ${primerNombre}`} className={styles.visor}>
      <header className={styles.cabecera}>
        <div className={styles.titulos}>
          <h2 className={styles.titulo}>{trabajo ? trabajo.nombre : `Trabajo de ${primerNombre}`}</h2>
          {detalles.length > 0 ? <p className={styles.detalle}>{detalles.join(' · ')}</p> : null}
        </div>
        <button ref={cerrar} type="button" className={styles.cerrar} aria-label="Cerrar el trabajo" onClick={alCerrar}>
          <X size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </header>
      <p className={styles.aviso}>Solo para leer. Aquí no se califica: eso lo haces donde siempre.</p>

      <div className={styles.cuerpo} tabIndex={0}>
        {estado.tipo === 'cargando' ? (
          <p role="status" className={styles.estado}>
            Abriendo el trabajo…
          </p>
        ) : null}
        {estado.tipo === 'error' ? (
          <p role="alert" className={styles.estado}>
            {estado.mensaje}
          </p>
        ) : null}
        {trabajo && trabajo.texto.trim() === '' ? (
          <p className={styles.estado}>No pude sacar el texto de este archivo. Descárgalo para leerlo completo.</p>
        ) : null}
        {trabajo && trabajo.texto.trim() !== '' ? <div className={styles.texto}>{trabajo.texto}</div> : null}
        {trabajo?.recortado ? <p className={styles.estado}>El trabajo sigue; descárgalo para leerlo completo.</p> : null}
      </div>

      <footer className={styles.pie}>
        <button type="button" className={styles.descargar} onClick={alDescargar}>
          <Download size={17} strokeWidth={2} aria-hidden="true" />
          Descargar el original
        </button>
      </footer>
    </aside>
  );
}
