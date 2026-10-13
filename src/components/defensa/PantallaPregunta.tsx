import { useEffect, useId, useRef, useState } from 'react';
import { Clock, Keyboard, Lock, Mic, RotateCcw } from 'lucide-react';
import type { PreguntaDefensa } from './types';
import type { ModoDeRespuesta } from './pasos';
import { BarrasDeVoz } from '@/components/celeste/BarrasDeVoz';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { AvisoDeError } from './AvisoDeError';
import styles from './PantallaPregunta.module.css';

interface PantallaPreguntaProps {
  pregunta: PreguntaDefensa;
  /** Pasaron unos segundos sin respuesta: "Sin prisa". Es un estado de la misma pantalla. */
  enSilencio: boolean;
  modo: ModoDeRespuesta;
  ensayo: boolean;
  /** Celestea está diciendo la pregunta: todavía no se graba. */
  preguntando: boolean;
  /** Se está enviando la respuesta ("Listo" ya se pulsó). */
  ocupado: boolean;
  /** Algo no salió (sin conexión, no se pudo procesar el audio...). */
  error: string | null;
  textoEscrito: string;
  alCambiarTexto: (texto: string) => void;
  alEscribir: () => void;
  alHablar: () => void;
  /** La pregunta se vuelve a plantear: el reloj del silencio empieza de nuevo. */
  alRepetir: () => void;
  alListo: () => void;
}

/**
 * Pasos 10 y 11: una pregunta de la defensa. El mismo componente sirve para
 * "Te escucho" y para "Sin prisa", así la esfera sigue ahí y solo cambia de
 * gesto cuando pasa el tiempo.
 */
export function PantallaPregunta({
  pregunta,
  enSilencio,
  modo,
  ensayo,
  preguntando,
  ocupado,
  error,
  textoEscrito,
  alCambiarTexto,
  alEscribir,
  alHablar,
  alRepetir,
  alListo,
}: PantallaPreguntaProps) {
  const idCampo = useId();
  const [repeticiones, setRepeticiones] = useState(0);
  const [avisoRepeticion, setAvisoRepeticion] = useState(false);
  const temporizador = useRef<number | null>(null);
  const escribe = modo === 'escrito';
  const sinTexto = escribe && textoEscrito.trim().length === 0;
  const bloqueado = sinTexto || ocupado;

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  const repetir = () => {
    if (ocupado) return;
    setRepeticiones((valor) => valor + 1);
    setAvisoRepeticion(true);
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAvisoRepeticion(false), 2400);
    alRepetir();
  };

  return (
    <div className={styles.raiz}>
      <section className={styles.cabeza}>
        {ensayo ? (
          <span className={styles.ensayo}>
            <Lock size={13} strokeWidth={2.25} aria-hidden="true" />
            Ensayo privado, nadie lo ve
          </span>
        ) : null}
        {/* Al repetir la pregunta cambia la clave y la frase vuelve a aparecer. */}
        <div key={repeticiones} className={styles.pregunta}>
          {pregunta.contexto ? (
            <p className={`${styles.contexto} ${animaciones.entra}`} style={retraso(0.1)}>
              {pregunta.contexto}
            </p>
          ) : null}
          <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.25)}>
            {pregunta.pregunta}
          </h1>
        </div>
      </section>

      <section
        className={`${styles.centro} ${enSilencio ? styles.centroSilencio : ''} ${escribe ? styles.centroEscribe : ''}`}
        aria-live={escribe ? undefined : 'polite'}
      >
        {escribe ? (
          <>
            <Personaje tamano={88} expresion="neutro" movimiento="flotar" ritmoParpadeo={3.6} layoutId="orbe" />
            <div className={styles.campo}>
              <label className={styles.etiqueta} htmlFor={idCampo}>
                Tu respuesta
              </label>
              <textarea
                id={idCampo}
                className={styles.texto}
                rows={5}
                maxLength={4000}
                value={textoEscrito}
                onChange={(evento) => alCambiarTexto(evento.target.value)}
              />
            </div>
          </>
        ) : enSilencio ? (
          <>
            <Personaje tamano={132} expresion="neutro" movimiento="flotar" ritmoParpadeo={3.6} layoutId="orbe" />
            <span className={`${styles.sinPrisa} ${animaciones.pop}`} style={retraso(0.3, 0.7)}>
              <Clock size={18} strokeWidth={2} aria-hidden="true" />
              Sin prisa.
            </span>
            <BarrasDeVoz preset="silencio" />
          </>
        ) : (
          <>
            <Personaje
              tamano={132}
              expresion="escucha"
              movimiento="latir"
              ondas={2}
              ritmoOndas={2.4}
              layoutId="orbe"
            />
            <BarrasDeVoz preset="pregunta" />
            <span className={styles.estado}>
              <span className={styles.latido} aria-hidden="true" />
              {ocupado ? 'Un momento…' : avisoRepeticion ? 'Repito la pregunta' : preguntando ? 'Escucha la pregunta' : 'Te escucho'}
            </span>
          </>
        )}
        {escribe && avisoRepeticion ? <span className={styles.aviso}>Repito la pregunta</span> : null}
      </section>

      <section className={styles.pie}>
        <AvisoDeError mensaje={error} />
        <div className={styles.dos}>
          <Boton variante="tarjeta" tamano={52} icono={<RotateCcw size={16} strokeWidth={2} />} onClick={repetir}>
            Repetir pregunta
          </Boton>
          {escribe ? (
            <Boton variante="tarjeta" tamano={52} icono={<Mic size={16} strokeWidth={2} />} onClick={() => !ocupado && alHablar()}>
              Prefiero hablar
            </Boton>
          ) : (
            <Boton
              variante="tarjeta"
              tamano={52}
              icono={<Keyboard size={16} strokeWidth={1.9} />}
              className={enSilencio || error ? styles.sugerido : ''}
              onClick={() => !ocupado && alEscribir()}
            >
              Prefiero escribir
            </Boton>
          )}
        </div>
        <Boton
          tamano={64}
          aria-disabled={bloqueado}
          aria-busy={ocupado}
          onClick={() => {
            if (!bloqueado) alListo();
          }}
        >
          {ocupado ? 'Enviando…' : 'Listo'}
        </Boton>
      </section>
    </div>
  );
}
