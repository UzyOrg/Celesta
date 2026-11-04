'use client';

import { BookOpen, ChevronLeft, ChevronRight, Download, Headphones } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../celeste/Avatar';
import { Reproductor } from '../defensa/reproductor';
import { ETIQUETA_NIVEL, IconoNivel } from '../celeste/IconoNivel';
import { BarraDeCelestea } from './BarraDeCelestea';
import { BloqueDeObjetivo } from './BloqueDeObjetivo';
import { apiProfesor, bajarArchivo, ErrorDelProfesor } from './clienteProfesor';
import { CierreDelReporte } from './CierreDelReporte';
import { cantidadEnLetra, conteoPorObjetivo, resumenDelGrupo } from './derivados';
import { diaDeBorradoDelAudio, marcaCorta } from './fechas';
import { respuestaDelReporte } from './frases';
import { clasificarPreguntaReporte, SUGERENCIAS_REPORTE } from './intenciones';
import type { RamaReporte } from './intenciones';
import { RespuestaEnReporte } from './RespuestaEnReporte';
import type { CierreReporte, DatosReporte, ParteParaOir } from './types';
import { useTiempoDeRevision } from './useTiempoDeRevision';
import { VisorDelTrabajo } from './VisorDelTrabajo';
import styles from './ReporteDelAlumno.module.css';

interface ReporteDelAlumnoProps {
  datos: DatosReporte;
}

type EstadoRespuesta = { tipo: 'pensando' } | { tipo: 'lista'; rama: RamaReporte };

const MS_PENSANDO = 700;
const MS_DESTELLO = 1600;
const MS_DESCARGA = 2400;

function esCierre(valor: string | null): valor is CierreReporte {
  return valor === 'si' || valor === 'parte' || valor === 'no';
}

/**
 * Reporte de la defensa de un alumno: qué mostró en cada objetivo, lo que
 * respondió (con audio original solo de lo que marcó o aclaró) y una pregunta
 * de cierre para el profesor. Abajo, una barra para preguntarle a Celestea
 * sobre esta defensa.
 *
 * Con datos reales (`grupo.conectado`) el audio suena de verdad (un enlace que caduca, solo
 * el tramo marcado o aclarado), la descarga baja el trabajo, la respuesta de cierre se guarda
 * en el servidor y se mide el tiempo que el reporte está abierto. En el escenario de ejemplo
 * todo eso es simulado. Las respuestas de Celestea a las preguntas salen de reglas de palabras
 * sobre este mismo reporte, sin modelo de lenguaje.
 */
export function ReporteDelAlumno({ datos }: ReporteDelAlumnoProps) {
  const { grupo, alumno, reporte, cola } = datos;
  const { actividad } = grupo;
  const token = actividad.token;
  const rutaInicio = `/revision/${token}`;
  const rutaAlumno = (matricula: string) => `/revision/${token}/alumno/${matricula}`;
  const conectado = grupo.conectado === true;
  const defensaId = datos.defensaId;

  useTiempoDeRevision(token, defensaId, conectado);

  const [sonando, setSonando] = useState<ParteParaOir['id'] | null>(null);
  const [brillo, setBrillo] = useState<number | null>(null);
  const [descargado, setDescargado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDeDescarga, setErrorDeDescarga] = useState<string | null>(null);
  const [errorDeAudio, setErrorDeAudio] = useState<string | null>(null);
  const [cierre, setCierre] = useState<CierreReporte | null>(null);
  const [texto, setTexto] = useState('');
  const [barraAbierta, setBarraAbierta] = useState(true);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState<EstadoRespuesta | null>(null);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const botonVisor = useRef<HTMLButtonElement>(null);
  const cerrarVisor = useCallback(() => {
    setVisorAbierto(false);
    botonVisor.current?.focus({ preventScroll: true });
  }, []);

  const [reproductor] = useState(() => new Reproductor());
  const sonandoAhora = useRef<ParteParaOir['id'] | null>(null);

  const temporizadores = useRef<{
    audio?: ReturnType<typeof setTimeout>;
    brillo?: ReturnType<typeof setTimeout>;
    pensar?: ReturnType<typeof setTimeout>;
    descarga?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    const guardados = temporizadores.current;
    return () => {
      clearTimeout(guardados.audio);
      clearTimeout(guardados.brillo);
      clearTimeout(guardados.pensar);
      clearTimeout(guardados.descarga);
      reproductor.liberar();
    };
  }, [reproductor]);

  // La respuesta de cierre también se recuerda en este navegador, para que al volver se vea contestada.
  const claveCierre = `celestea-revision-cierre-${token}-${alumno.matricula}`;
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(claveCierre);
      if (esCierre(guardado)) setCierre(guardado);
    } catch {
      // Sin almacenamiento disponible: la pregunta empieza sin responder.
    }
  }, [claveCierre]);

  const elegirCierre = useCallback(
    (valor: CierreReporte) => {
      setCierre(valor);
      if (conectado && defensaId) {
        void apiProfesor.toque(token, { defensaId, tipo: 'despues', valor }).catch(() => undefined);
      }
      try {
        window.localStorage.setItem(claveCierre, valor);
      } catch {
        // La respuesta sigue en pantalla aunque no se pueda recordar.
      }
    },
    [claveCierre, conectado, defensaId, token],
  );

  const brillar = useCallback((numero: number) => {
    clearTimeout(temporizadores.current.brillo);
    setBrillo(numero);
    temporizadores.current.brillo = setTimeout(() => setBrillo(null), MS_DESTELLO);
  }, []);

  const tocarParte = useCallback(
    async (parte: ParteParaOir) => {
      clearTimeout(temporizadores.current.audio);
      setErrorDeAudio(null);
      if (!conectado) {
        setSonando((actual) => (actual === parte.id ? null : parte.id));
        // Si ya sonaba, el toque lo detiene; si no, suena el largo de la parte y se detiene solo.
        temporizadores.current.audio = setTimeout(() => setSonando(null), parte.milisegundos);
        return;
      }
      // Con audio real: el toque detiene lo que suena o pide un enlace y reproduce solo ese tramo.
      if (sonandoAhora.current === parte.id) {
        reproductor.detener();
        sonandoAhora.current = null;
        setSonando(null);
        return;
      }
      if (!defensaId || !parte.turnoId) return;
      sonandoAhora.current = parte.id;
      setSonando(parte.id);
      try {
        const { url } = await apiProfesor.audio(token, { defensaId, turnoId: parte.turnoId });
        const tramo =
          parte.desdeMs !== undefined && parte.hastaMs !== undefined ? { desdeMs: parte.desdeMs, hastaMs: parte.hastaMs } : undefined;
        const resultado = await reproductor.reproducir(url, tramo);
        if (resultado === 'error' || resultado === 'bloqueado') {
          setErrorDeAudio('No se pudo reproducir el audio. Inténtalo otra vez.');
        }
      } catch (causa) {
        setErrorDeAudio(causa instanceof ErrorDelProfesor ? causa.message : 'No se pudo reproducir el audio. Inténtalo otra vez.');
      } finally {
        // Solo suelta lo suyo: si ya empezó otra parte, esa sigue sonando.
        if (sonandoAhora.current === parte.id) {
          sonandoAhora.current = null;
          setSonando(null);
        }
      }
    },
    [conectado, defensaId, reproductor, token],
  );

  const descargar = useCallback(async () => {
    clearTimeout(temporizadores.current.descarga);
    if (!conectado) {
      setDescargado(true);
      temporizadores.current.descarga = setTimeout(() => setDescargado(false), MS_DESCARGA);
      return;
    }
    if (!alumno.entregaId || descargando) return;
    setDescargando(true);
    setErrorDeDescarga(null);
    try {
      const recibida = await apiProfesor.descarga(token, { alcance: 'uno', entregaId: alumno.entregaId });
      bajarArchivo(recibida.url, recibida.nombre);
      setDescargado(true);
      temporizadores.current.descarga = setTimeout(() => setDescargado(false), MS_DESCARGA);
    } catch (causa) {
      setErrorDeDescarga(causa instanceof ErrorDelProfesor ? causa.message : 'No pudimos bajar el trabajo. Inténtalo otra vez.');
    } finally {
      setDescargando(false);
    }
  }, [alumno.entregaId, conectado, descargando, token]);

  const conteos = useMemo(() => conteoPorObjetivo(grupo.alumnos, actividad.objetivos), [grupo.alumnos, actividad.objetivos]);
  const resumenGrupo = useMemo(() => resumenDelGrupo(grupo.alumnos), [grupo.alumnos]);

  const pedir = useCallback((peticion: string) => {
    const limpia = peticion.trim();
    if (!limpia) return;
    const rama = clasificarPreguntaReporte(limpia);
    clearTimeout(temporizadores.current.pensar);
    setTexto('');
    setPregunta(limpia);
    setRespuesta({ tipo: 'pensando' });
    temporizadores.current.pensar = setTimeout(() => setRespuesta({ tipo: 'lista', rama }), MS_PENSANDO);
  }, []);

  const contestada =
    respuesta?.tipo === 'lista'
      ? respuestaDelReporte(respuesta.rama, {
          alumno,
          reporte,
          conteos,
          defendieron: resumenGrupo.defendieron,
        })
      : null;
  const textoDeLaRespuesta = contestada
    ? contestada.texto
    : `Leyendo la defensa de ${alumno.primerNombre}…`;

  const partesParaOir = reporte.bloques.filter((bloque) => bloque.respuesta?.parteParaOir).length;
  const hayVoz = reporte.bloques.some((bloque) => bloque.respuesta?.modo === 'voz');
  const entrega = alumno.entrega
    ? `Entregó ${marcaCorta(alumno.entrega)}${alumno.entregaTardia ? ', después del cierre' : ''}`
    : null;
  const defensa = alumno.defensa
    ? `Defendió a las ${alumno.defensa.hora}${alumno.duracion ? `, en ${alumno.duracion}` : ''}`
    : null;

  const arriba =
    respuesta !== null ? (
      <RespuestaEnReporte
        pregunta={pregunta}
        texto={textoDeLaRespuesta}
        pensando={respuesta.tipo === 'pensando'}
        irA={
          contestada?.irAPregunta
            ? {
                ancla: `#p${contestada.irAPregunta}`,
                texto: `Ir a la pregunta ${contestada.irAPregunta}`,
                alIr: () => brillar(contestada.irAPregunta ?? 0),
              }
            : null
        }
        alCerrar={() => setRespuesta(null)}
      />
    ) : null;

  return (
    <div className={styles.raiz}>
      <div className={visorAbierto ? styles.conVisor : styles.sinVisor}>
        <div className={styles.columna}>
          <div className={styles.migas}>
            <Link href={rutaInicio} className={styles.volver}>
              <ChevronLeft size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
              Inicio
            </Link>
            {cola ? (
              <div className={styles.cola}>
                <span className={styles.posicion}>{`${cola.posicion} de ${cola.total} por revisar`}</span>
                {cola.anterior ? (
                  <Link
                    href={rutaAlumno(cola.anterior.matricula)}
                    className={styles.flecha}
                    aria-label={`Anterior: ${cola.anterior.nombre}`}
                  >
                    <ChevronLeft size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                  </Link>
                ) : null}
                {cola.siguiente ? (
                  <Link
                    href={rutaAlumno(cola.siguiente.matricula)}
                    className={styles.flecha}
                    aria-label={`Siguiente: ${cola.siguiente.nombre}`}
                  >
                    <ChevronRight size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <header className={styles.cabecera}>
            <div className={styles.identidad}>
              <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={64} />
              <div className={styles.textos}>
                <h1 className={styles.nombre}>{alumno.nombre}</h1>
                <div className={styles.meta}>
                  <span className={styles.matricula}>{alumno.matricula}</span>
                  {entrega ? <span>{entrega}</span> : null}
                  {defensa ? <span>{defensa}</span> : null}
                </div>
              </div>
            </div>
            <div className={styles.accionesCabecera}>
              <button
                ref={botonVisor}
                type="button"
                className={styles.descargar}
                aria-expanded={visorAbierto}
                onClick={() => setVisorAbierto((abierto) => !abierto)}
              >
                <BookOpen size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                {visorAbierto ? 'Cerrar su trabajo' : 'Leer su trabajo'}
              </button>
              <button type="button" className={styles.descargar} onClick={descargar}>
                <Download size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                {descargando ? 'Preparando…' : descargado ? 'Descargado' : errorDeDescarga ? 'Inténtalo otra vez' : 'Descargar trabajo'}
              </button>
            </div>
          </header>

          <section aria-label="Resumen por objetivo" className={styles.resumen}>
            {reporte.bloques.map((bloque) => (
              <a
                key={bloque.objetivo.id}
                href={`#p${bloque.pregunta.numero}`}
                className={styles.objetivo}
                onClick={() => brillar(bloque.pregunta.numero)}
              >
                <span className={styles.objetivoNumero}>{`Objetivo ${bloque.objetivo.id}`}</span>
                <span className={styles.objetivoTexto}>{bloque.objetivo.texto}</span>
                <span className={styles.objetivoNivel}>
                  {bloque.nivel ? <IconoNivel nivel={bloque.nivel} tamano={12} /> : null}
                  {bloque.nivel ? ETIQUETA_NIVEL[bloque.nivel] : 'Sin dato'}
                </span>
              </a>
            ))}
          </section>

          {reporte.aviso ? (
            <div className={styles.nota}>
              <span>{reporte.aviso}</span>
            </div>
          ) : null}

          {!reporte.completo ? (
            <div className={styles.nota}>
              <span>{`Esta demostración solo trae la transcripción y el audio de ${grupo.alumnoBuscado.nombreCorto}.`}</span>
            </div>
          ) : null}

          {partesParaOir > 0 || hayVoz ? (
            <div className={styles.nota}>
              {partesParaOir > 0 ? (
                <span className={styles.notaOir}>
                  <Headphones size={15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.notaIcono} />
                  {`${cantidadEnLetra(partesParaOir)} ${partesParaOir === 1 ? 'parte' : 'partes'} para oír, dentro de sus respuestas`}
                </span>
              ) : null}
              {hayVoz && alumno.defensa ? (
                <span>
                  {reporte.audioDisponible === false
                    ? 'El audio ya se borró'
                    : `El audio se borra el ${diaDeBorradoDelAudio(alumno.defensa)}`}
                </span>
              ) : null}
            </div>
          ) : null}

          {reporte.bloques.map((bloque) => (
            <BloqueDeObjetivo
              key={bloque.objetivo.id}
              bloque={bloque}
              alumno={alumno}
              resaltado={brillo === bloque.pregunta.numero}
              sonando={sonando}
              alTocarParte={tocarParte}
            />
          ))}

          <CierreDelReporte
            valor={cierre}
            alElegir={elegirCierre}
            siguiente={cola?.siguiente ?? null}
            rutaSiguiente={cola?.siguiente ? rutaAlumno(cola.siguiente.matricula) : rutaInicio}
            rutaInicio={rutaInicio}
          />

          <BarraDeCelestea
            variante="reporte"
            abierta={barraAbierta}
            alCambiarAbierta={setBarraAbierta}
            texto={texto}
            alCambiarTexto={setTexto}
            alEnviar={pedir}
            sugerencias={!texto && respuesta?.tipo !== 'pensando' ? SUGERENCIAS_REPORTE : null}
            alPedirSugerencia={pedir}
            pensando={respuesta?.tipo === 'pensando'}
            placeholder={`Pregunta sobre la defensa de ${alumno.primerNombre}…`}
            etiquetaCampo={`Pregúntale a Celestea sobre ${alumno.primerNombre}`}
            etiquetaBotonCerrado={`Pregúntale sobre ${alumno.primerNombre}`}
            arriba={arriba}
          />
        </div>
        {visorAbierto ? (
          <VisorDelTrabajo
            token={token}
            entregaId={alumno.entregaId}
            deEjemplo={datos.trabajoDeEjemplo ?? null}
            conectado={conectado}
            primerNombre={alumno.primerNombre}
            alDescargar={() => void descargar()}
            alCerrar={cerrarVisor}
          />
        ) : null}
      </div>

      <p role="status" className={styles.soloLector}>
        {contestada ? `Celestea respondió: ${contestada.texto}` : ''}
      </p>
      <p role="status" className={styles.soloLector}>
        {errorDeDescarga ?? errorDeAudio ?? (descargado ? `Se descargó el trabajo de ${alumno.nombre}` : '')}
      </p>
    </div>
  );
}
