import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Clock, Keyboard, Lock, Mic, RotateCcw } from 'lucide-react';
import type { PreguntaDefensa } from './types';
import type { ModoDeRespuesta } from './pasos';
import type { FallaDeVoz, VozDePregunta } from './useFlujoDefensa';
import { BarrasDeVoz, type FuenteDeVoz } from '@/components/celeste/BarrasDeVoz';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { AvisoDeError } from './AvisoDeError';
import { AvisoDeMicrofono } from './AvisoDeMicrofono';
import styles from './PantallaPregunta.module.css';

interface PantallaPreguntaProps {
  pregunta: PreguntaDefensa;
  /** Pasaron unos segundos sin respuesta: "Sin prisa". Es un estado de la misma pantalla. */
  enSilencio: boolean;
  modo: ModoDeRespuesta;
  ensayo: boolean;
  /** Lo que hace Celestea con la pregunta: mientras la dice (o está por decirla) no se graba. */
  voz: VozDePregunta;
  /** La pregunta tiene audio: "Repetir pregunta" la vuelve a decir en voz alta. */
  conAudio: boolean;
  /** Lo que oye el micrófono: con "Te escucho" las barras siguen la voz de la persona. */
  fuenteDeVoz: FuenteDeVoz;
  /** Quería hablar pero el micrófono falló: responde escribiendo y ve por qué, con un toque para volver a la voz. */
  falla: FallaDeVoz | null;
  /** Se está pidiendo el micrófono otra vez. */
  probandoMicrofono: boolean;
  alProbarMicrofono: () => void;
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

/** La pregunta escrita sale como subtítulo, un instante después de que empieza la voz. */
const MS_SUBTITULO = 120;
/** Y nunca tarda más que esto, aunque el audio no cargue: la voz aclara quién habla, no hace esperar. */
const MS_TOPE = 500;

/**
 * Pasos 10 y 11: una pregunta de la defensa. El mismo componente sirve para
 * "Celestea habla", "Te escucho" y "Sin prisa", así la esfera sigue ahí y solo
 * cambia de gesto.
 *
 * Primero habla la esfera y después aparece la pregunta escrita. Esa pregunta
 * siempre está en la página (el foco llega a su título y el lector de pantalla
 * la lee de inmediato); solo se ve un instante después. Sin audio, si el
 * navegador lo bloquea o con movimiento reducido, se ve desde el principio.
 */
export function PantallaPregunta({
  pregunta,
  enSilencio,
  modo,
  ensayo,
  voz,
  conAudio,
  fuenteDeVoz,
  falla,
  probandoMicrofono,
  alProbarMicrofono,
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
  const reducido = useReducedMotion() ?? false;
  const [avisoRepeticion, setAvisoRepeticion] = useState(false);
  const temporizador = useRef<number | null>(null);
  const escribe = modo === 'escrito';
  const habla = voz !== 'calla';
  /** Cuándo empezó la lectura que espera la pregunta escrita (al llegar o al repetirla); null: ya se ve. */
  const [lectura, setLectura] = useState<number | null>(() => (habla ? performance.now() : null));
  const textoVisible = lectura === null || reducido;
  const sinTexto = escribe && textoEscrito.trim().length === 0;
  // En escrito con voz (el micrófono falló) el cuadro guarda su lugar y aparece cuando Celestea termina.
  // Lo que la persona ya escribió nunca se esconde.
  const cuadroEnEspera = escribe && habla && sinTexto && !reducido;
  // Mientras Celestea dice la pregunta todavía no se graba: no hay nada que enviar.
  const bloqueado = sinTexto || ocupado || (habla && !escribe);
  const estadoCelestea = ocupado ? 'enviando' : habla ? 'habla' : enSilencio ? 'sin-prisa' : 'escucha';

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  // La pregunta escrita aparece en cuanto suena la voz (como subtítulo) y nunca después de MS_TOPE.
  useEffect(() => {
    if (lectura === null) return undefined;
    if (voz === 'calla') {
      // No hay voz (terminó, falló o el navegador la bloqueó): la pregunta se ve ya.
      setLectura(null);
      return undefined;
    }
    const restante = Math.max(0, MS_TOPE - (performance.now() - lectura));
    const reloj = window.setTimeout(() => setLectura(null), voz === 'suena' ? Math.min(MS_SUBTITULO, restante) : restante);
    return () => window.clearTimeout(reloj);
  }, [lectura, voz]);

  const repetir = () => {
    if (ocupado) return;
    if (conAudio) {
      // Se repite la misma secuencia: primero habla Celestea y después aparece la pregunta escrita.
      setLectura(performance.now());
    } else {
      // Sin audio no hay voz que la repita: un aviso breve confirma el toque.
      setAvisoRepeticion(true);
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setAvisoRepeticion(false), 2400);
    }
    alRepetir();
  };

  return (
    <div className={styles.raiz} data-celestea={estadoCelestea}>
      <section className={styles.cabeza}>
        {ensayo ? (
          <span className={styles.ensayo}>
            <Lock size={13} strokeWidth={2.25} aria-hidden="true" />
            Ensayo privado, nadie lo ve
          </span>
        ) : null}
        {/* Mientras espera, la pregunta sigue en la página (para lectores de pantalla) y guarda su lugar. */}
        <div className={`${styles.pregunta} ${textoVisible ? '' : styles.preguntaEnEspera}`} data-texto={textoVisible ? 'visible' : 'en-espera'}>
          {pregunta.contexto ? <p className={styles.contexto}>{pregunta.contexto}</p> : null}
          <h1 className={styles.titulo}>{pregunta.pregunta}</h1>
        </div>
      </section>

      <section
        className={`${styles.centro} ${enSilencio ? styles.centroSilencio : ''} ${escribe ? styles.centroEscribe : ''}`}
        aria-live={escribe ? undefined : 'polite'}
      >
        {escribe ? (
          <>
            <Personaje
              tamano={88}
              expresion={habla ? 'atento' : 'neutro'}
              movimiento={habla ? 'latir' : 'flotar'}
              ondas={habla ? 2 : 0}
              ritmoOndas={1.2}
              hablando={habla}
              ritmoParpadeo={3.6}
              layoutId="orbe"
            />
            <div className={`${styles.campo} ${cuadroEnEspera ? styles.campoEnEspera : ''}`}>
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
              {cuadroEnEspera ? (
                <span className={`${styles.estado} ${styles.sobreCampo}`}>
                  <span className={styles.latido} aria-hidden="true" />
                  Celestea habla
                </span>
              ) : null}
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
            {/* Mientras habla, las ondas salen más seguido: la voz viene de la esfera. */}
            <Personaje
              tamano={132}
              expresion={habla ? 'atento' : 'escucha'}
              movimiento="latir"
              ondas={habla ? 3 : 2}
              ritmoOndas={habla ? 1.2 : 2.4}
              hablando={habla}
              layoutId="orbe"
            />
            {/* Siguen la voz solo mientras se escucha: si habla Celestea o se está enviando, quedan en reposo. */}
            <BarrasDeVoz preset="voz" fuente={habla || ocupado ? null : fuenteDeVoz} />
            <span className={styles.estado}>
              <span className={styles.latido} aria-hidden="true" />
              {ocupado ? 'Enviando…' : habla ? 'Celestea habla' : avisoRepeticion ? 'Repito la pregunta' : 'Te escucho'}
            </span>
          </>
        )}
        {escribe && !cuadroEnEspera && (habla || avisoRepeticion) ? (
          <span className={styles.aviso}>{habla ? 'Celestea habla' : 'Repito la pregunta'}</span>
        ) : null}
      </section>

      <section className={styles.pie}>
        {falla ? (
          <AvisoDeMicrofono mensaje={falla.mensaje} reintentos={falla.reintentos} probando={probandoMicrofono} alProbar={alProbarMicrofono} />
        ) : null}
        <AvisoDeError mensaje={error} />
        <div className={`${styles.dos} ${falla ? styles.una : ''}`}>
          <Boton variante="tarjeta" tamano={52} icono={<RotateCcw size={16} strokeWidth={2} />} onClick={repetir}>
            Repetir pregunta
          </Boton>
          {/* Cambiar de modo es una salida, no la tarea: botón discreto (sin borde ni relleno) y sin llamar la atención. */}
          {/* Con una falla del micrófono, volver a hablar es el botón del aviso. */}
          {falla ? null : escribe ? (
            <Boton variante="sutil" tamano={52} icono={<Mic size={16} strokeWidth={2} />} onClick={() => !ocupado && alHablar()}>
              Prefiero hablar
            </Boton>
          ) : (
            <Boton variante="sutil" tamano={52} icono={<Keyboard size={16} strokeWidth={1.9} />} onClick={() => !ocupado && alEscribir()}>
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
