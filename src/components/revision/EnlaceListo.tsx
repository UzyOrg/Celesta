'use client';

import { ArrowRight, Check, Copy, GraduationCap, MessageCircle, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { direccionDelEnlace, enlaceDeWhatsApp, mensajeParaElGrupo } from './nueva';
import { Pildora } from './Pildora';
import { copiarAlPortapapeles } from './portapapeles';
import type { ActividadProfesor } from './types';
import styles from './EnlaceListo.module.css';

interface EnlaceListoProps {
  /** Actividad que se acaba de crear (la del borrador). */
  actividad: ActividadProfesor;
  /** Cuántos alumnos tiene el grupo, para el límite de envíos. */
  totalAlumnos: number;
  /** Dirección del grupo del profesor: "Ir al grupo". */
  rutaGrupo: string;
  /** Dirección de lo que ve el alumno: "Ver como alumno". */
  rutaAlumno: string;
}

type EstadoMoodle = 'nada' | 'conectando' | 'listo';

const LIMITE_INICIAL = 45;
const LIMITE_MINIMO = 1;
const LIMITE_MAXIMO = 200;

const MS_COPIADO = 2200;
const MS_WHATSAPP = 2600;
const MS_MOODLE = 1400;

/**
 * Enlace listo: la dirección para el grupo, un mensaje ya escrito, dos formas
 * de compartirlo y los ajustes del enlace.
 *
 * Lo único real es copiar al portapapeles y el enlace de WhatsApp (que abre
 * WhatsApp en otra pestaña con el mensaje, a decisión de quien toca). Moodle,
 * el interruptor y el límite son simulados: no hay servidor donde guardarlos.
 */
export function EnlaceListo({ actividad, totalAlumnos, rutaGrupo, rutaAlumno }: EnlaceListoProps) {
  const direccion = direccionDelEnlace(actividad.token);
  const mensaje = mensajeParaElGrupo(direccion, actividad.cierre);

  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const [mensajeCopiado, setMensajeCopiado] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [moodle, setMoodle] = useState<EstadoMoodle>('nada');
  const [activo, setActivo] = useState(true);
  const [limite, setLimite] = useState(LIMITE_INICIAL);

  const campoDelEnlace = useRef<HTMLInputElement>(null);
  const temporizadores = useRef<{
    enlace?: ReturnType<typeof setTimeout>;
    mensaje?: ReturnType<typeof setTimeout>;
    whatsapp?: ReturnType<typeof setTimeout>;
    moodle?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    const guardados = temporizadores.current;
    return () => {
      clearTimeout(guardados.enlace);
      clearTimeout(guardados.mensaje);
      clearTimeout(guardados.whatsapp);
      clearTimeout(guardados.moodle);
    };
  }, []);

  const copiarEnlace = useCallback(async () => {
    const copiado = await copiarAlPortapapeles(direccion);
    if (!copiado) {
      // Sin acceso al portapapeles se deja el texto seleccionado para que lo copie la persona.
      campoDelEnlace.current?.select();
      setFallo(true);
      return;
    }
    setFallo(false);
    clearTimeout(temporizadores.current.enlace);
    setEnlaceCopiado(true);
    temporizadores.current.enlace = setTimeout(() => setEnlaceCopiado(false), MS_COPIADO);
  }, [direccion]);

  const copiarMensaje = useCallback(async () => {
    const copiado = await copiarAlPortapapeles(mensaje.plano);
    if (!copiado) {
      setFallo(true);
      return;
    }
    setFallo(false);
    clearTimeout(temporizadores.current.mensaje);
    setMensajeCopiado(true);
    temporizadores.current.mensaje = setTimeout(() => setMensajeCopiado(false), MS_COPIADO);
  }, [mensaje.plano]);

  const abrirWhatsApp = useCallback(() => {
    clearTimeout(temporizadores.current.whatsapp);
    setWhatsapp(true);
    temporizadores.current.whatsapp = setTimeout(() => setWhatsapp(false), MS_WHATSAPP);
  }, []);

  const conectarMoodle = useCallback(() => {
    if (moodle !== 'nada') return;
    clearTimeout(temporizadores.current.moodle);
    setMoodle('conectando');
    temporizadores.current.moodle = setTimeout(() => setMoodle('listo'), MS_MOODLE);
  }, [moodle]);

  const textoMoodle =
    moodle === 'nada'
      ? 'Conecta tu curso y publícalo ahí'
      : moodle === 'conectando'
        ? 'Conectando con tu curso…'
        : `Publicado en tu curso de Metodología, grupo ${actividad.grupo}`;

  const anuncio = fallo
    ? 'No se pudo copiar. Selecciona el texto y cópialo.'
    : enlaceCopiado
      ? 'Enlace copiado'
      : mensajeCopiado
        ? 'Mensaje copiado'
        : '';

  return (
    <div className={styles.raiz}>
      <div className={styles.columna}>
        <div className={styles.encabezado}>
          <span className={styles.insignia} aria-hidden="true">
            <Check size={28} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={styles.visto} />
          </span>
          <h1 className={styles.titulo}>Tu enlace está listo</h1>
          <p className={styles.subtitulo}>Compártelo en tu plataforma o en el chat del grupo.</p>
        </div>

        <section aria-labelledby="titulo-enlace" className={`${styles.tarjeta} ${styles.entrada1}`}>
          <label id="titulo-enlace" htmlFor="enlace-del-grupo" className={styles.etiqueta}>
            {`Enlace del grupo ${actividad.grupo}`}
          </label>
          <div className={styles.filaEnlace}>
            <input
              ref={campoDelEnlace}
              id="enlace-del-grupo"
              type="text"
              readOnly
              value={direccion}
              className={styles.direccion}
            />
            <Pildora
              alto={52}
              relleno={20}
              letra={16}
              peso={650}
              anchoMinimo={150}
              icono={
                enlaceCopiado ? (
                  <Check size={18} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                ) : (
                  <Copy size={18} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                )
              }
              onClick={copiarEnlace}
            >
              {enlaceCopiado ? 'Copiado' : 'Copiar'}
            </Pildora>
          </div>
        </section>

        <section aria-labelledby="titulo-mensaje" className={`${styles.tarjeta} ${styles.tarjetaMensaje} ${styles.entrada2}`}>
          <div className={styles.cabeceraMensaje}>
            <h2 id="titulo-mensaje" className={styles.subtituloTarjeta}>
              Mensaje para tu grupo
            </h2>
            <Pildora
              variante="contorno"
              alto={40}
              relleno={14}
              letra={14}
              peso={600}
              icono={
                mensajeCopiado ? (
                  <Check
                    size={16}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={styles.copiadoIcono}
                  />
                ) : (
                  <Copy size={16} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                )
              }
              onClick={copiarMensaje}
            >
              {mensajeCopiado ? 'Copiado' : 'Copiar mensaje'}
            </Pildora>
          </div>
          <p className={styles.mensaje}>
            {mensaje.antes}
            <span className={styles.direccionEnMensaje}>{direccion}</span>
            {mensaje.despues}
          </p>
        </section>

        <section aria-labelledby="titulo-compartir" className={`${styles.tarjeta} ${styles.tarjetaMensaje} ${styles.entrada3}`}>
          <h2 id="titulo-compartir" className={styles.subtituloTarjeta}>
            Compártelo directo
          </h2>
          <div className={styles.canales}>
            <a
              href={enlaceDeWhatsApp(mensaje.plano)}
              target="_blank"
              rel="noopener noreferrer"
              className={whatsapp ? `${styles.canal} ${styles.canalWhatsApp}` : styles.canal}
              onClick={abrirWhatsApp}
            >
              <span className={`${styles.canalIcono} ${styles.iconoWhatsApp}`} aria-hidden="true">
                <MessageCircle size={22} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </span>
              <span className={styles.canalTextos}>
                <span className={styles.canalNombre}>WhatsApp</span>
                <span className={styles.canalDetalle}>
                  {whatsapp ? 'Se abrió WhatsApp con el mensaje listo' : 'Manda el mensaje al chat del grupo'}
                </span>
              </span>
            </a>
            <button
              type="button"
              className={moodle === 'listo' ? `${styles.canal} ${styles.canalMoodle}` : styles.canal}
              onClick={conectarMoodle}
            >
              <span className={`${styles.canalIcono} ${styles.iconoMoodle}`} aria-hidden="true">
                <span className={moodle === 'conectando' ? styles.girando : styles.quieto}>
                  <GraduationCap size={22} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </span>
              </span>
              <span className={styles.canalTextos}>
                <span className={`${styles.canalNombre} ${styles.canalNombreFila}`}>
                  Moodle
                  {moodle === 'listo' ? (
                    <Check size={15} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.moodleListo} />
                  ) : null}
                </span>
                <span className={styles.canalDetalle}>{textoMoodle}</span>
              </span>
            </button>
          </div>
        </section>

        <section aria-label="Ajustes del enlace" className={`${styles.ajustes} ${styles.entrada4}`}>
          <div className={styles.ajuste}>
            <div className={styles.ajusteTextos}>
              <span id="titulo-activo" className={styles.ajusteNombre}>
                Enlace activo
              </span>
              <span className={styles.ajusteDetalle}>
                {activo ? 'Si lo apagas, nadie más puede entrar.' : 'Apagado. Nadie puede entrar ni entregar.'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={activo}
              aria-labelledby="titulo-activo"
              className={activo ? `${styles.interruptor} ${styles.interruptorEncendido}` : styles.interruptor}
              onClick={() => setActivo((actual) => !actual)}
            >
              <span aria-hidden="true" className={styles.bola} />
            </button>
          </div>
          <div className={`${styles.ajuste} ${styles.ajusteConLinea}`}>
            <div className={styles.ajusteTextos}>
              <span id="titulo-limite" className={styles.ajusteNombre}>
                Límite de envíos
              </span>
              <span className={styles.ajusteDetalle}>{`Para un grupo de ${totalAlumnos}. Evita entregas de fuera.`}</span>
            </div>
            <div role="group" aria-labelledby="titulo-limite" className={styles.paso}>
              <button
                type="button"
                aria-label="Bajar el límite"
                className={styles.pasoBoton}
                onClick={() => setLimite((actual) => Math.max(LIMITE_MINIMO, actual - 1))}
              >
                <Minus size={16} strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" />
              </button>
              <output aria-live="polite" className={styles.limite}>
                {limite}
              </output>
              <button
                type="button"
                aria-label="Subir el límite"
                className={styles.pasoBoton}
                onClick={() => setLimite((actual) => Math.min(LIMITE_MAXIMO, actual + 1))}
              >
                <Plus size={16} strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <div className={`${styles.acciones} ${styles.entrada5}`}>
          <Pildora
            href={rutaGrupo}
            alto={52}
            relleno={24}
            letra={16}
            peso={650}
            icono={<ArrowRight size={18} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />}
            iconoAlFinal
          >
            Ir al grupo
          </Pildora>
          <Pildora href={rutaAlumno} variante="contorno" alto={52} relleno={22} letra={16} peso={600}>
            Ver como alumno
          </Pildora>
        </div>
      </div>

      <p role="status" className={styles.soloLector}>
        {anuncio}
      </p>
      <p role="status" className={styles.soloLector}>
        {whatsapp ? 'Se abrió WhatsApp con el mensaje listo' : moodle === 'listo' ? textoMoodle : ''}
      </p>
    </div>
  );
}
