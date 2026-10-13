'use client';

import { Check, Mic, Paperclip, ArrowUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BorradorDeActividad } from './BorradorDeActividad';
import { HiloDeNueva } from './HiloDeNueva';
import {
  avanceDe,
  camposDe,
  estadoInicial,
  mensajesDe,
  PASO_FINAL,
  puedeCrearEnlace,
  reducirNueva,
  respuestasRapidasDe,
  textoPensandoDe,
} from './nueva';
import type { PasoNueva } from './types';
import styles from './NuevaActividad.module.css';

interface NuevaActividadProps {
  /** Código de la actividad desde la que se abre: las rutas cuelgan de `/revision/<token>`. */
  token: string;
  /** Paso con el que abre la conversación (`?paso=`); 0 es una actividad nueva. */
  pasoInicial: PasoNueva;
}

const MS_PENSANDO = 750;
const MS_DICTADO = 1500;
const MS_AVISO = 2800;

/**
 * Nueva actividad: una conversación con Celestea que va llenando el borrador
 * de la derecha. Al terminar se crea el enlace.
 *
 * Todo es simulado. Las respuestas rápidas y el texto libre avanzan por el
 * mismo guion (`nueva.ts`); no se interpreta lo escrito ni se sube ningún
 * archivo; el dictado no abre el micrófono; y no se guarda nada en ningún
 * servidor. "Editar a mano" y los cambios por mensaje en el último paso todavía
 * no existen y lo dicen.
 */
export function NuevaActividad({ token, pasoInicial }: NuevaActividadProps) {
  const [estado, despachar] = useReducer(reducirNueva, pasoInicial, estadoInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState('');

  const campo = useRef<HTMLInputElement>(null);
  const hayInteraccion = useRef(false);
  const temporizadores = useRef<{
    pensar?: ReturnType<typeof setTimeout>;
    dictado?: ReturnType<typeof setTimeout>;
    aviso?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    const guardados = temporizadores.current;
    return () => {
      clearTimeout(guardados.pensar);
      clearTimeout(guardados.dictado);
      clearTimeout(guardados.aviso);
    };
  }, []);

  const mensajes = useMemo(() => mensajesDe(estado), [estado]);
  const campos = useMemo(() => camposDe(estado), [estado]);
  const avance = useMemo(() => avanceDe(campos), [campos]);
  const rapidas = respuestasRapidasDe(estado.paso);
  const listo = puedeCrearEnlace(estado);
  const rutaEnlace = `/revision/${token}/nueva?paso=enlace`;
  const enElFinal = estado.paso >= PASO_FINAL;

  const avisar = useCallback((mensaje: string) => {
    clearTimeout(temporizadores.current.aviso);
    setAviso(mensaje);
    temporizadores.current.aviso = setTimeout(() => setAviso(null), MS_AVISO);
  }, []);

  const editarAMano = useCallback(() => {
    avisar('Editar a mano todavía no está en esta demostración.');
  }, [avisar]);

  const responder = useCallback(
    (mensaje: string, valor?: string) => {
      if (estado.pensando) return;
      if (estado.paso >= PASO_FINAL) {
        if (mensaje.trim()) avisar('Pedir cambios por mensaje todavía no funciona en esta demostración.');
        return;
      }
      if (!mensaje.trim()) return;
      hayInteraccion.current = true;
      despachar({ tipo: 'responder', mensaje, valor });
      clearTimeout(temporizadores.current.pensar);
      temporizadores.current.pensar = setTimeout(() => despachar({ tipo: 'avanzar' }), MS_PENSANDO);
      campo.current?.focus({ preventScroll: true });
    },
    [estado.pensando, estado.paso, avisar],
  );

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    responder(estado.texto);
  };

  const dictar = () => {
    clearTimeout(temporizadores.current.dictado);
    if (estado.escuchando) {
      despachar({ tipo: 'escuchar', activo: false });
      return;
    }
    despachar({ tipo: 'escuchar', activo: true });
    // Simulacro: no se abre ningún micrófono; tras un momento "se entiende" la primera respuesta rápida.
    temporizadores.current.dictado = setTimeout(() => {
      despachar({ tipo: 'escuchar', activo: false });
      const primera = rapidas[0];
      if (primera) responder(primera.mensaje, primera.valor);
    }, MS_DICTADO);
  };

  const adjuntar = () => {
    const archivo = rapidas.find((rapida) => rapida.texto === 'Subir archivo');
    if (archivo) responder(archivo.mensaje, archivo.valor);
    else avisar('Adjuntar sirve para la consigna y la rúbrica.');
  };

  // La dirección acompaña a la conversación: al recargar o volver desde el enlace se regresa al mismo paso.
  useEffect(() => {
    if (!hayInteraccion.current) return;
    const direccion = new URL(window.location.href);
    direccion.searchParams.set('paso', String(estado.paso));
    window.history.replaceState(window.history.state, '', direccion);
    document.title = estado.paso >= PASO_FINAL ? 'Borrador listo | Celestea' : 'Nueva actividad con Celestea | Celestea';
  }, [estado.paso]);

  // Lo que Celestea dice o hace se anuncia en una región que siempre existe (una que nace con su texto no siempre se lee).
  useEffect(() => {
    if (!hayInteraccion.current) return;
    if (estado.pensando) {
      setAnuncio(textoPensandoDe(estado));
      return;
    }
    const ultimo = [...mensajes].reverse().find((mensaje) => mensaje.autor === 'celestea');
    setAnuncio(ultimo ? ultimo.texto : '');
    // Solo cuando cambia el paso o el estado de "pensando".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.paso, estado.pensando]);

  const hayTexto = estado.texto.trim().length > 0;
  const placeholder = estado.escuchando ? 'Te escucho…' : enElFinal ? 'Pide cualquier cambio…' : 'Escribe o dicta tu respuesta…';
  const clasesBarra = estado.escuchando ? `${styles.barra} ${styles.escuchando}` : styles.barra;

  return (
    <>
      <section aria-label="Conversación con Celestea" className={styles.conversacion}>
        <div className={styles.cabecera}>
          <h1 className={styles.titulo}>Nueva actividad</h1>
          <span className={styles.duracion}>Unos 10 minutos</span>
        </div>

        <div className={styles.mensajes}>
          <HiloDeNueva
            mensajes={mensajes}
            activos={estado.activos}
            alAlternarObjetivo={(indice) => despachar({ tipo: 'alternar-objetivo', indice })}
            pensando={estado.pensando}
            textoPensando={textoPensandoDe(estado)}
            puedeCrearEnlace={listo}
            rutaEnlace={rutaEnlace}
            alEditarAMano={editarAMano}
          />
        </div>

        <div className={styles.pie}>
          <div className={styles.compositor}>
            {!estado.pensando && rapidas.length > 0 && !estado.texto ? (
              <div role="group" aria-label="Respuestas rápidas" className={styles.rapidas}>
                {rapidas.map((rapida, indice) => (
                  <button
                    key={rapida.texto}
                    type="button"
                    className={indice === 0 ? `${styles.rapida} ${styles.rapidaPrimera}` : styles.rapida}
                    onClick={() => responder(rapida.mensaje, rapida.valor)}
                  >
                    {rapida.texto}
                  </button>
                ))}
              </div>
            ) : null}

            <form className={clasesBarra} onSubmit={alEnviar}>
              <label htmlFor="responder-a-celestea" className={styles.soloLector}>
                Responder a Celestea
              </label>
              <input
                ref={campo}
                id="responder-a-celestea"
                type="text"
                value={estado.texto}
                onChange={(evento) => despachar({ tipo: 'escribir', texto: evento.target.value })}
                placeholder={placeholder}
                autoComplete="off"
                className={styles.campo}
              />
              <button
                type="button"
                aria-label="Adjuntar archivo"
                title="Adjuntar consigna o rúbrica"
                className={styles.icono}
                onClick={adjuntar}
              >
                <Paperclip size={19} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Dictar"
                aria-pressed={estado.escuchando}
                className={estado.escuchando ? `${styles.icono} ${styles.microfonoActivo}` : styles.icono}
                onClick={dictar}
              >
                <Mic size={19} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
              </button>
              <button
                type="submit"
                aria-label="Enviar"
                disabled={!hayTexto}
                className={hayTexto ? `${styles.enviar} ${styles.enviarListo}` : styles.enviar}
              >
                <ArrowUp size={19} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>

        {aviso ? (
          <div className={styles.aviso}>
            <Check size={16} strokeWidth={2.4} aria-hidden="true" className={styles.avisoIcono} />
            <span>{aviso}</span>
          </div>
        ) : null}

        <p role="status" className={styles.soloLector}>
          {anuncio}
        </p>
        <p role="status" className={styles.soloLector}>
          {aviso ?? ''}
        </p>
      </section>

      <BorradorDeActividad
        campos={campos}
        avance={avance}
        listo={listo}
        rutaEnlace={rutaEnlace}
        alEditarAMano={editarAMano}
      />
    </>
  );
}
