'use client';

import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarraDeCelestea } from './BarraDeCelestea';
import type { RespuestaAsistente, TipoTarjeta } from './catalogo';
import { apiProfesor, bajarArchivo, ErrorDelProfesor } from './clienteProfesor';
import { extensionPorId, extensionPorReglas, type ContextoDeExtension } from './extensiones';
import {
  alumnosEnEstado,
  conteoPorObjetivo,
  ordenarAlumnos,
  resumenDelGrupo,
  seccionesDelGrupo,
} from './derivados';
import { nombreDelDia } from './fechas';
import { FijadosEnInicio } from './FijadosEnInicio';
import {
  fraseAlumno,
  fraseAvance,
  fraseDescarga,
  fraseLista,
  fraseObjetivo,
  frasePendientes,
  TITULOS_DE_ESCENA,
} from './frases';
import {
  interpretarPeticion,
  normalizarTexto,
  PETICION_POR_ESCENA,
  RESPUESTA_DESCONOCIDA,
  SUGERENCIAS_POR_ESCENA,
  textoPensando,
} from './intenciones';
import { LineaDeCelestea } from './LineaDeCelestea';
import type { PasoVisible } from './PasosDeCelestea';
import { Pildora } from './Pildora';
import { RespuestaDelAsistente } from './RespuestaDelAsistente';
import { useDictado } from './useDictado';
import { TarjetaAlumno } from './TarjetaAlumno';
import { TarjetaAvance } from './TarjetaAvance';
import { TarjetaDescarga } from './TarjetaDescarga';
import { TarjetaGrupo } from './TarjetaGrupo';
import { TarjetaObjetivos } from './TarjetaObjetivos';
import type { Alumno, ClaveFijable, DatosGrupo, EscenaConsulta, EscenaProfesor, EstadoAlumno } from './types';
import styles from './InicioAgentico.module.css';

interface InicioAgenticoProps {
  grupo: DatosGrupo;
  /** Escena con la que abre la página (`?escena=`): el inicio o una respuesta ya dada. */
  escenaInicial: 'inicio' | EscenaConsulta;
}

type Fijados = Record<ClaveFijable, boolean>;
type SeccionesAbiertas = Record<EstadoAlumno, boolean>;

const FIJADOS_DE_INICIO: Fijados = { avance: true, ana: false, objetivos: false };
const SECCIONES_DE_INICIO: SeccionesAbiertas = {
  'por-revisar': true,
  revisado: false,
  'sin-defensa': false,
  'sin-entregar': false,
};

/** Cuánto tarda el simulacro en "pensar", en milisegundos. */
const MS_PENSANDO = 800;
/** Cada paso visible del asistente queda al menos esto en pantalla, para que no parpadee. */
const MS_POR_PASO = 250;
const MS_DESCARGA = 1750;
const MS_DICTADO = 1600;
const MS_AVISO = 2600;

function leerFijados(crudo: string | null): Fijados | null {
  if (!crudo) return null;
  try {
    const dato: unknown = JSON.parse(crudo);
    if (typeof dato !== 'object' || dato === null) return null;
    const candidato = dato as Partial<Record<ClaveFijable, unknown>>;
    return {
      avance: candidato.avance === true,
      ana: candidato.ana === true,
      objetivos: candidato.objetivos === true,
    };
  } catch {
    return null;
  }
}

/**
 * Inicio del profesor: un saludo, lo que fijó y una barra para pedirle cosas a
 * Celestea. Lo que se pide se contesta con componentes ya escritos (avance,
 * alumno, descarga, objetivos, lista); nada se inventa en el momento.
 *
 * Las peticiones se enrutan con reglas de palabras (`intenciones.ts`), sin modelo de
 * lenguaje. Con datos reales (`grupo.conectado`) las descargas bajan los trabajos de
 * verdad; en el escenario de ejemplo son simuladas y el dictado no usa el micrófono.
 */
export function InicioAgentico({ grupo, escenaInicial }: InicioAgenticoProps) {
  const router = useRouter();
  const { actividad, profesora, alumnos, descarga, alumnoBuscado } = grupo;
  const token = actividad.token;
  const conectado = grupo.conectado === true;

  const [escena, setEscena] = useState<EscenaProfesor>(escenaInicial);
  const [pregunta, setPregunta] = useState<string | null>(null);
  const [destino, setDestino] = useState<EscenaConsulta | 'otro' | null>(null);
  const [texto, setTexto] = useState('');
  const [barraAbierta, setBarraAbierta] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [fijados, setFijados] = useState<Fijados>(FIJADOS_DE_INICIO);
  const [fijadosCargados, setFijadosCargados] = useState(false);
  const [abiertas, setAbiertas] = useState<SeccionesAbiertas>(SECCIONES_DE_INICIO);
  const [descargaLista, setDescargaLista] = useState(false);
  const [descargaError, setDescargaError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaAsistente | null>(null);
  const [pasos, setPasos] = useState<PasoVisible[]>([]);

  const contenido = useRef<HTMLDivElement>(null);
  const solicitudDeDescarga = useRef(0);
  const solicitudDelAsistente = useRef(0);
  const historial = useRef<{ peticion: string; tipos: TipoTarjeta[] }[]>([]);
  const temporizadores = useRef<{
    pensar?: ReturnType<typeof setTimeout>;
    descarga?: ReturnType<typeof setTimeout>;
    dictado?: ReturnType<typeof setTimeout>;
    aviso?: ReturnType<typeof setTimeout>;
  }>({});

  // Todo lo del grupo sale de la lista de alumnos: nada está escrito a mano.
  const resumen = useMemo(() => resumenDelGrupo(alumnos), [alumnos]);
  const conteos = useMemo(() => conteoPorObjetivo(alumnos, actividad.objetivos), [alumnos, actividad.objetivos]);
  const masCostoso = useMemo(() => conteos.find((conteo) => conteo.masCostoso) ?? conteos[0], [conteos]);
  const secciones = useMemo(() => seccionesDelGrupo(alumnos), [alumnos]);
  const sinEntregar = useMemo(() => ordenarAlumnos('sin-entregar', alumnosEnEstado(alumnos, 'sin-entregar')), [alumnos]);
  const sinDefensa = useMemo(() => ordenarAlumnos('sin-defensa', alumnosEnEstado(alumnos, 'sin-defensa')), [alumnos]);

  const rutaReporte = useCallback(
    (matricula: string) => `/revision/${token}/alumno/${matricula}`,
    [token],
  );
  const rutaReporteDirecto = useCallback(
    (matricula: string) => `/revision/${token}/alumno/${matricula}?vista=reporte`,
    [token],
  );

  /* ───── Efectos ───── */

  const avisar = useCallback((mensaje: string) => {
    clearTimeout(temporizadores.current.aviso);
    setAviso(mensaje);
    temporizadores.current.aviso = setTimeout(() => setAviso(null), MS_AVISO);
  }, []);

  /** Arma el zip con el último trabajo de cada alumno y lo baja. Un enlace que caduca, no un archivo guardado. */
  const descargarTodos = useCallback(async () => {
    solicitudDeDescarga.current += 1;
    const solicitud = solicitudDeDescarga.current;
    setDescargaLista(false);
    setDescargaError(null);
    try {
      const recibida = await apiProfesor.descarga(token, { alcance: 'todos' });
      if (solicitud !== solicitudDeDescarga.current) return;
      bajarArchivo(recibida.url, recibida.nombre);
      setDescargaLista(true);
    } catch (causa) {
      if (solicitud !== solicitudDeDescarga.current) return;
      setDescargaError(causa instanceof ErrorDelProfesor ? causa.message : 'No pudimos armar el archivo. Inténtalo otra vez.');
    }
  }, [token]);

  const iniciarDescarga = useCallback(() => {
    if (conectado) {
      void descargarTodos();
      return;
    }
    clearTimeout(temporizadores.current.descarga);
    setDescargaLista(false);
    temporizadores.current.descarga = setTimeout(() => setDescargaLista(true), MS_DESCARGA);
  }, [conectado, descargarTodos]);

  /** El trabajo de una persona: con datos reales baja su última versión; en el ejemplo solo avisa. */
  const descargarTrabajo = useCallback(
    async (alumno: Alumno) => {
      if (!conectado) {
        avisar(`Se descargó el trabajo de ${alumno.nombre}`);
        return;
      }
      if (!alumno.entregaId) {
        avisar(`${alumno.primerNombre} todavía no entrega su trabajo`);
        return;
      }
      try {
        const recibida = await apiProfesor.descarga(token, { alcance: 'uno', entregaId: alumno.entregaId });
        bajarArchivo(recibida.url, recibida.nombre);
        avisar(`Se descargó el trabajo de ${alumno.nombre}`);
      } catch (causa) {
        avisar(causa instanceof ErrorDelProfesor ? causa.message : 'No pudimos bajar el trabajo. Inténtalo otra vez.');
      }
    },
    [conectado, token, avisar],
  );

  // Abrir directo `?escena=descarga` también arma el archivo.
  useEffect(() => {
    if (escenaInicial === 'descarga') iniciarDescarga();
    const guardados = temporizadores.current;
    return () => {
      solicitudDeDescarga.current += 1;
      clearTimeout(guardados.pensar);
      clearTimeout(guardados.descarga);
      clearTimeout(guardados.dictado);
      clearTimeout(guardados.aviso);
    };
    // Solo al montar: `escenaInicial` no cambia durante la vida de la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lo fijado se recuerda en este navegador (conveniencia de quien mira, no un dato del grupo).
  const claveGuardado = `celestea-revision-fijados-${token}`;
  useEffect(() => {
    try {
      const guardados = leerFijados(window.localStorage.getItem(claveGuardado));
      if (guardados) setFijados(guardados);
    } catch {
      // Sin almacenamiento disponible: se usan los valores de inicio.
    }
    setFijadosCargados(true);
  }, [claveGuardado]);

  useEffect(() => {
    if (!fijadosCargados) return;
    try {
      window.localStorage.setItem(claveGuardado, JSON.stringify(fijados));
    } catch {
      // Nada que hacer: la próxima visita empieza con los valores de inicio.
    }
  }, [fijados, fijadosCargados, claveGuardado]);

  // Cada escena empieza arriba, con su título y su dirección (`?escena=`).
  useEffect(() => {
    contenido.current?.scrollTo({ top: 0 });
    document.title = TITULOS_DE_ESCENA[escena];
    if (escena === 'pensando' || escena === 'otro' || escena === 'asistente') return;
    const direccion = new URL(window.location.href);
    if (escena === 'inicio') direccion.searchParams.delete('escena');
    else direccion.searchParams.set('escena', escena);
    window.history.replaceState(window.history.state, '', direccion);
  }, [escena]);

  /* ───── Acciones ───── */

  const contextoDeExtension = useMemo<ContextoDeExtension>(
    () => ({ token, conectado, irA: (ruta) => router.push(ruta), avisar }),
    [token, conectado, router, avisar],
  );

  /** Con reglas de palabras: el escenario de ejemplo y el respaldo si el servidor no contesta. */
  const pedirConReglas = useCallback(
    (limpia: string) => {
      const intencion = interpretarPeticion(limpia);
      const siguiente: EscenaConsulta | 'otro' = intencion.destino.tipo === 'escena' ? intencion.destino.escena : 'otro';
      clearTimeout(temporizadores.current.pensar);
      setPregunta(limpia);
      setTexto('');
      setEscena('pensando');
      setDestino(siguiente);
      setBarraAbierta(true);
      temporizadores.current.pensar = setTimeout(() => {
        setEscena(siguiente);
        if (siguiente === 'descarga') iniciarDescarga();
      }, MS_PENSANDO);
    },
    [iniciarDescarga],
  );

  /** Con datos reales, Celestea contesta desde el servidor con el catálogo de tarjetas. */
  const pedirAlAsistente = useCallback(
    async (limpia: string) => {
      solicitudDelAsistente.current += 1;
      const solicitud = solicitudDelAsistente.current;
      clearTimeout(temporizadores.current.pensar);
      setPregunta(limpia);
      setTexto('');
      setRespuesta(null);
      setPasos([]);
      setEscena('asistente');
      setBarraAbierta(true);
      const inicio = Date.now();
      let cuantos = 0;
      try {
        const recibida = await apiProfesor.asistente(token, { peticion: limpia, historial: historial.current }, (paso) => {
          if (solicitud !== solicitudDelAsistente.current) return;
          cuantos += 1;
          setPasos((anteriores) => [...anteriores.map((p) => ({ ...p, hecho: true })), { texto: paso, hecho: false }]);
        });
        // Cada paso queda un momento en pantalla, para que se alcance a leer.
        const espera = Math.max(0, cuantos * MS_POR_PASO - (Date.now() - inicio));
        if (espera > 0) await new Promise((resolver) => setTimeout(resolver, espera));
        if (solicitud !== solicitudDelAsistente.current) return;
        setPasos((anteriores) => anteriores.map((p) => ({ ...p, hecho: true })));
        setRespuesta(recibida);
        historial.current = [...historial.current, { peticion: limpia, tipos: recibida.tarjetas.map((t) => t.tipo) }].slice(-2);
        if (recibida.tarjetas.some((t) => t.tipo === 'descarga')) iniciarDescarga();
        for (const tarjeta of recibida.tarjetas) {
          if (tarjeta.tipo === 'accion') extensionPorId(tarjeta.props.id, grupo)?.ejecutar(contextoDeExtension);
        }
      } catch (causa) {
        if (solicitud !== solicitudDelAsistente.current) return;
        // Sin servidor contestan las reglas de siempre, con los datos que ya tiene la página.
        if (causa instanceof ErrorDelProfesor && causa.status === 0) pedirConReglas(limpia);
        else {
          setPasos([]);
          setRespuesta({
            texto: causa instanceof ErrorDelProfesor ? causa.message : 'No pude contestar eso ahora. Intenta otra vez.',
            tarjetas: [],
            sugerencias: SUGERENCIAS_POR_ESCENA.inicio,
            fuente: 'reglas',
            rechazo: null,
          });
        }
      }
    },
    [token, grupo, contextoDeExtension, iniciarDescarga, pedirConReglas],
  );

  const pedir = useCallback(
    (peticion: string) => {
      const limpia = peticion.trim();
      if (!limpia) return;
      // Una extensión de la barra (por ejemplo, crear actividad) se reconoce sin preguntarle al modelo.
      const extension = extensionPorReglas(normalizarTexto(limpia), grupo);
      if (extension) {
        setTexto('');
        extension.ejecutar(contextoDeExtension);
        return;
      }
      const intencion = interpretarPeticion(limpia);
      if (intencion.destino.tipo === 'accion') {
        // Con datos reales las actividades todavía se dan de alta con el script, no desde esta pantalla.
        if (conectado) avisar('Por ahora las actividades las damos de alta nosotros. Pídenos la tuya.');
        else router.push(`/revision/${token}/nueva`);
        return;
      }
      if (conectado) void pedirAlAsistente(limpia);
      else pedirConReglas(limpia);
    },
    [router, token, conectado, avisar, grupo, contextoDeExtension, pedirAlAsistente, pedirConReglas],
  );

  const irA = useCallback((siguiente: EscenaConsulta) => {
    clearTimeout(temporizadores.current.pensar);
    solicitudDelAsistente.current += 1;
    setEscena(siguiente);
    setPregunta(PETICION_POR_ESCENA[siguiente]);
  }, []);

  const irAlInicio = useCallback(() => {
    clearTimeout(temporizadores.current.pensar);
    solicitudDelAsistente.current += 1;
    setEscena('inicio');
    setPregunta(null);
  }, []);

  // El dictado real solo existe con transcripción real configurada; el del ejemplo es un simulacro.
  const dictado = useDictado({
    token,
    alEntender: (entendido) => {
      setTexto(entendido);
      setBarraAbierta(true);
    },
    alFallar: avisar,
  });
  const dictadoReal = conectado && grupo.dictadoDisponible === true;

  const alternarDictado = useCallback(() => {
    clearTimeout(temporizadores.current.dictado);
    if (escuchando) {
      setEscuchando(false);
      return;
    }
    setEscuchando(true);
    setTexto('');
    // Simulacro: no se abre ningún micrófono; tras un momento "se entiende" una petición de ejemplo.
    temporizadores.current.dictado = setTimeout(() => {
      setEscuchando(false);
      pedir('¿Quién no ha entregado?');
    }, MS_DICTADO);
  }, [escuchando, pedir]);

  const alternarFijado = useCallback((clave: ClaveFijable) => {
    setFijados((actuales) => ({ ...actuales, [clave]: !actuales[clave] }));
  }, []);

  const alternarSeccion = useCallback((estado: EstadoAlumno) => {
    setAbiertas((actuales) => ({ ...actuales, [estado]: !actuales[estado] }));
  }, []);

  /* ───── Lo que se ve ───── */

  const enInicio = escena === 'inicio';
  const peticion =
    pregunta ??
    (escena !== 'inicio' && escena !== 'pensando' && escena !== 'otro' && escena !== 'asistente' ? PETICION_POR_ESCENA[escena] : '');
  const asistentePensando = escena === 'asistente' && respuesta === null;
  const oyendo = escuchando || dictado.escuchando;
  const sugerenciasDeEscena = escena === 'asistente' ? (respuesta?.sugerencias ?? []) : SUGERENCIAS_POR_ESCENA[escena];
  const sugerencias = !texto && escena !== 'pensando' && !asistentePensando && !oyendo ? sugerenciasDeEscena : null;
  const rotuloGrupo = `Grupo ${actividad.grupo}`;

  return (
    <>
      <div className={styles.barraSuperior}>
        {enInicio ? (
          <p className={styles.titulo}>
            <span>{actividad.nombre}</span>
            <span className={styles.grupo}>{rotuloGrupo}</span>
          </p>
        ) : (
          <button
            type="button"
            className={styles.volver}
            aria-label={`Volver al inicio de ${actividad.nombre} ${rotuloGrupo}`}
            onClick={irAlInicio}
          >
            <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>{actividad.nombre}</span>
            <span className={styles.grupo}>{rotuloGrupo}</span>
          </button>
        )}
        <span className={styles.cierre}>{`Cerró ${actividad.cierreCorto}`}</span>
      </div>

      <div ref={contenido} className={styles.contenido}>
        <div className={styles.columna}>
          {enInicio ? (
            <>
              <section aria-labelledby="titulo-hola" className={styles.hola}>
                <h1 id="titulo-hola" className={styles.saludo}>
                  {`Hola, ${profesora.primerNombre}.`}
                </h1>
                <p className={styles.resumenInicio}>
                  {`${actividad.referencia} del ${actividad.grupo} cerró el ${nombreDelDia(actividad.cierre.dia)}. `}
                  <span className={styles.enfasis}>{frasePendientes(resumen.porRevisar)}</span>
                </p>
                <div className={styles.accionesHola}>
                  <Pildora
                    href={rutaReporte(alumnoBuscado.matricula)}
                    alto={52}
                    relleno={24}
                    letra={16}
                    peso={650}
                    espacio={10}
                    icono={<ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />}
                    iconoAlFinal
                  >
                    Revisar uno por uno
                  </Pildora>
                  <Pildora
                    variante="contorno"
                    alto={52}
                    relleno={22}
                    letra={16}
                    peso={600}
                    onClick={() => irA('lista')}
                  >
                    Ver la lista
                  </Pildora>
                </div>
              </section>

              {masCostoso ? (
                <FijadosEnInicio
                  fijados={fijados}
                  resumen={resumen}
                  objetivoMasCostoso={masCostoso}
                  alumno={alumnoBuscado}
                  rutaReporte={rutaReporte(alumnoBuscado.matricula)}
                  alQuitar={alternarFijado}
                  alVerAvance={() => irA('avance')}
                  alVerObjetivos={() => irA('objetivos')}
                />
              ) : null}
            </>
          ) : (
            <>
              <h1 className={styles.soloLector}>
                {actividad.nombre}, {rotuloGrupo}
              </h1>
              {peticion ? (
                <div className={styles.peticion}>
                  <div className={styles.burbuja}>{peticion}</div>
                </div>
              ) : null}

              {escena === 'pensando' ? (
                <LineaDeCelestea pensando>{textoPensando(destino, resumen.defendieron)}</LineaDeCelestea>
              ) : null}

              {escena === 'avance' ? (
                <>
                  <LineaDeCelestea>{fraseAvance(resumen)}</LineaDeCelestea>
                  <TarjetaAvance
                    grupo={actividad.grupo}
                    resumen={resumen}
                    sinEntregar={sinEntregar}
                    sinDefensa={sinDefensa}
                    fijado={fijados.avance}
                    alAlternarFijado={() => alternarFijado('avance')}
                  />
                </>
              ) : null}

              {escena === 'ana' ? (
                <>
                  <LineaDeCelestea>{fraseAlumno(alumnoBuscado)}</LineaDeCelestea>
                  <TarjetaAlumno
                    alumno={alumnoBuscado}
                    grupo={actividad.grupo}
                    objetivos={actividad.objetivos}
                    rutaReporte={rutaReporte(alumnoBuscado.matricula)}
                    rutaPartes={rutaReporteDirecto(alumnoBuscado.matricula)}
                    alDescargarTrabajo={() => descargarTrabajo(alumnoBuscado)}
                    fijado={fijados.ana}
                    alAlternarFijado={() => alternarFijado('ana')}
                  />
                </>
              ) : null}

              {escena === 'descarga' ? (
                <>
                  <LineaDeCelestea>{fraseDescarga(descargaLista, resumen.entregaron)}</LineaDeCelestea>
                  <TarjetaDescarga
                    descarga={descarga}
                    entregaron={resumen.entregaron}
                    sinEntregar={resumen.sinEntregar}
                    lista={descargaLista}
                    error={descargaError}
                    alDescargarOtraVez={() => (conectado ? iniciarDescarga() : avisar(`Se descargó ${descarga.archivo}`))}
                  />
                </>
              ) : null}

              {escena === 'objetivos' && masCostoso ? (
                <>
                  <LineaDeCelestea>{fraseObjetivo(masCostoso, resumen.defendieron)}</LineaDeCelestea>
                  <TarjetaObjetivos
                    conteos={conteos}
                    fijado={fijados.objetivos}
                    alAlternarFijado={() => alternarFijado('objetivos')}
                  />
                </>
              ) : null}

              {escena === 'lista' ? (
                <>
                  <LineaDeCelestea>{fraseLista(resumen.porRevisar)}</LineaDeCelestea>
                  <TarjetaGrupo
                    grupo={actividad.grupo}
                    secciones={secciones}
                    abiertas={abiertas}
                    alAlternarSeccion={alternarSeccion}
                    rutaReporte={rutaReporte}
                    rutaReporteDirecto={rutaReporteDirecto}
                    alDescargarTrabajo={descargarTrabajo}
                  />
                </>
              ) : null}

              {escena === 'otro' ? <LineaDeCelestea>{RESPUESTA_DESCONOCIDA}</LineaDeCelestea> : null}

              {escena === 'asistente' ? (
                <RespuestaDelAsistente
                  respuesta={respuesta}
                  pasos={pasos}
                  actividad={actividad}
                  alumnoBuscado={alumnoBuscado}
                  rutaReporte={rutaReporte}
                  rutaReporteDirecto={rutaReporteDirecto}
                  fijados={fijados}
                  alAlternarFijado={alternarFijado}
                  alDescargarTrabajo={(quien) => {
                    const alumno = typeof quien === 'string' ? alumnos.find((a) => a.matricula === quien) : quien;
                    if (alumno) void descargarTrabajo(alumno);
                  }}
                  descarga={{
                    archivo: descarga,
                    lista: descargaLista,
                    error: descargaError,
                    alDescargarOtraVez: iniciarDescarga,
                  }}
                  secciones={{ abiertas, alAlternar: alternarSeccion }}
                  alVerTodo={() => irA('lista')}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {aviso ? (
        <div role="status" className={styles.aviso}>
          <Check size={16} strokeWidth={2.4} aria-hidden="true" className={styles.avisoIcono} />
          <span>{aviso}</span>
        </div>
      ) : null}

      <div aria-hidden="true" className={styles.degradado} />

      <BarraDeCelestea
        variante="inicio"
        abierta={barraAbierta}
        alCambiarAbierta={setBarraAbierta}
        texto={texto}
        alCambiarTexto={setTexto}
        alEnviar={pedir}
        sugerencias={sugerencias}
        alPedirSugerencia={pedir}
        pensando={escena === 'pensando' || asistentePensando || dictado.transcribiendo}
        escuchando={oyendo}
        alAlternarDictado={dictadoReal ? dictado.alternar : conectado ? undefined : alternarDictado}
        placeholder={
          oyendo ? 'Te escucho… toca otra vez para terminar' : dictado.transcribiendo ? 'Escribiendo lo que dijiste…' : 'Pide lo que quieras ver o hacer…'
        }
        etiquetaCampo="Pídele algo a Celestea"
        etiquetaBotonCerrado="Pregúntale a Celestea"
        pie="Celestea responde con los datos de tu grupo. Tú decides."
      />

      <AnuncioDeEscena escena={asistentePensando ? 'pensando' : escena} />
    </>
  );
}

/** Texto para el lector de pantalla: avisa cuando Celestea ya respondió (la tarjeta no se lee entera). */
function AnuncioDeEscena({ escena }: { escena: EscenaProfesor }) {
  const mensaje: Partial<Record<EscenaProfesor, string>> = {
    avance: 'Celestea mostró el avance del grupo.',
    ana: 'Celestea mostró la tarjeta del alumno.',
    descarga: 'Celestea mostró la descarga de trabajos.',
    objetivos: 'Celestea mostró lo que mostró el grupo en cada objetivo.',
    lista: 'Celestea mostró el grupo por estado.',
    otro: 'Celestea no supo hacer esa petición.',
    asistente: 'Celestea respondió.',
  };
  return (
    <p aria-live="polite" className={styles.soloLector}>
      {mensaje[escena] ?? ''}
    </p>
  );
}
