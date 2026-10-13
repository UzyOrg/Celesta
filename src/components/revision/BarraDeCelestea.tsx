'use client';

import { ArrowUp, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { LogoCelestea } from '../celeste/LogoCelestea';
import styles from './BarraDeCelestea.module.css';

interface BarraDeCelesteaProps {
  /**
   * "inicio" flota abajo en el centro de la pantalla del grupo; "reporte" se
   * pega al borde inferior mientras se lee un reporte largo.
   */
  variante: 'inicio' | 'reporte';
  abierta: boolean;
  alCambiarAbierta: (abierta: boolean) => void;
  texto: string;
  alCambiarTexto: (texto: string) => void;
  /** Se llama con el texto escrito (o dictado) al enviar. */
  alEnviar: (texto: string) => void;
  /** Sugerencias para tocar; `null` las esconde (mientras escribe, escucha o piensa). */
  sugerencias: readonly string[] | null;
  alPedirSugerencia: (texto: string) => void;
  /** Celestea está "pensando": su símbolo gira. */
  pensando?: boolean;
  /** Dictado en curso (simulado). Sin `alAlternarDictado` no hay botón de micrófono. */
  escuchando?: boolean;
  alAlternarDictado?: () => void;
  placeholder: string;
  /** Nombre accesible del campo (no se ve). */
  etiquetaCampo: string;
  /** Texto del botón que la vuelve a mostrar. */
  etiquetaBotonCerrado: string;
  /** Línea pequeña bajo la barra. */
  pie?: string;
  /** Contenido sobre las sugerencias: la respuesta a la última pregunta. */
  arriba?: ReactNode;
}

/**
 * Barra de Celestea: un campo para pedirle cosas, sugerencias para tocar y la
 * posibilidad de esconderla. Es un simulacro: las peticiones se resuelven con
 * reglas locales (`intenciones.ts`), no con un modelo.
 */
export function BarraDeCelestea({
  variante,
  abierta,
  alCambiarAbierta,
  texto,
  alCambiarTexto,
  alEnviar,
  sugerencias,
  alPedirSugerencia,
  pensando = false,
  escuchando = false,
  alAlternarDictado,
  placeholder,
  etiquetaCampo,
  etiquetaBotonCerrado,
  pie,
  arriba,
}: BarraDeCelesteaProps) {
  const idCampo = useId();
  const campo = useRef<HTMLInputElement>(null);
  const botonCerrado = useRef<HTMLButtonElement>(null);
  const yaMontada = useRef(false);

  // El foco acompaña a quien esconde o muestra la barra, sin quitárselo a nadie al cargar la página.
  useEffect(() => {
    if (!yaMontada.current) {
      yaMontada.current = true;
      return;
    }
    if (abierta) campo.current?.focus({ preventScroll: true });
    else botonCerrado.current?.focus({ preventScroll: true });
  }, [abierta]);

  const hayTexto = texto.trim().length > 0;

  const alEnviarFormulario = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (hayTexto) alEnviar(texto);
  };

  const claseRaiz = variante === 'inicio' ? styles.raizInicio : styles.raizReporte;
  const claseColumna = variante === 'inicio' ? styles.columnaInicio : styles.columnaReporte;

  return (
    <div className={claseRaiz}>
      {abierta ? (
        <div className={claseColumna}>
          {arriba}
          {sugerencias && sugerencias.length > 0 ? (
            <div role="group" aria-label="Sugerencias" className={styles.sugerencias}>
              {sugerencias.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  className={styles.sugerencia}
                  onClick={() => alPedirSugerencia(sugerencia)}
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className={escuchando ? `${styles.barra} ${styles.escuchando}` : styles.barra}
            onSubmit={alEnviarFormulario}
          >
            <LogoCelestea tamano={variante === 'inicio' ? 24 : 22} girando={pensando} className={styles.logo} />
            <label htmlFor={idCampo} className={styles.soloLector}>
              {etiquetaCampo}
            </label>
            <input
              ref={campo}
              id={idCampo}
              type="text"
              value={texto}
              onChange={(evento) => alCambiarTexto(evento.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className={styles.campo}
            />
            {alAlternarDictado ? (
              <button
                type="button"
                aria-label="Dictar"
                aria-pressed={escuchando}
                className={escuchando ? `${styles.microfono} ${styles.microfonoActivo}` : styles.microfono}
                onClick={alAlternarDictado}
              >
                <Mic size={19} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="Enviar"
              disabled={!hayTexto}
              className={hayTexto ? `${styles.enviar} ${styles.enviarListo}` : styles.enviar}
            >
              <ArrowUp size={19} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Ocultar a Celestea"
              title="Ocultar"
              className={styles.ocultar}
              onClick={() => alCambiarAbierta(false)}
            >
              <ChevronDown size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </form>

          {pie ? <span className={styles.pie}>{pie}</span> : null}
        </div>
      ) : (
        <button ref={botonCerrado} type="button" className={styles.mostrar} onClick={() => alCambiarAbierta(true)}>
          <LogoCelestea tamano={22} />
          {etiquetaBotonCerrado}
          <ChevronUp size={16} strokeWidth={2.2} aria-hidden="true" className={styles.mostrarFlecha} />
        </button>
      )}
    </div>
  );
}
