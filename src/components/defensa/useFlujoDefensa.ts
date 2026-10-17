'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DefensaCliente,
  EntregaCliente,
  EstadoPlanCliente,
  EstadoSesionCliente,
  ResumenPracticaCliente,
} from './contrato';
import { ErrorDeApi, api, conReintentos, subirDirectoAlBucket } from './clienteApi';
import { ColaSubida, type ResultadoDeSubida } from './colaSubida';
import { Grabador } from './grabador';
import {
  ErrorDeMicrofono,
  UMBRAL_VOZ,
  mensajeDeMicrofono,
  type MotivoSinMicrofono,
  crearMedidor,
  evaluarPrueba,
  microfonoSoportado,
  pedirMicrofono,
  soltarMicrofono,
  type Medidor,
} from './microfono';
import {
  indiceDePaso,
  leerBandera,
  normalizarPaso,
  pasoAlcanzable,
  pasoDeRespaldo,
  type ContextoDeAlcance,
  type ModoDeRespuesta,
  type PasoAlumnoId,
} from './pasos';
import type { EstadoPruebaMicrofono } from './PantallaHola';
import type { Aceptaciones } from './PantallaPermisos';
import { Reproductor } from './reproductor';
import { borrarSesion, guardarSesion, leerSesion, type SesionGuardada } from './sesionLocal';
import type { ActividadAlumno, BloqueRevision, TrabajoEntregado } from './types';
import { construirUrl } from './urlFlujo';
import type { ModoDeHistorial } from './urlFlujo';
import type { DireccionDeEntrada } from './MarcoAlumno';
import { diaYMes, horaMexico, selloAccesible } from './formatear';
import { bloquesDeRevision, contextoDeAlcance, defensaEnPantalla, estaViva, pasoDeDefensa, pasoDeReanudacion } from './reanudar';

/**
 * Todo lo que el flujo del alumno hace con el mundo exterior: la sesión, la entrega, el
 * plan, la defensa turno por turno, el micrófono, la grabación por partes, el audio y
 * la manera de retomar donde se quedó. `FlujoAlumno` solo dibuja lo que este hook dice.
 *
 * Reglas que se cuidan aquí:
 *  - una falla técnica nunca le cuesta la entrega: el trabajo ya está entregado y la
 *    defensa se retoma en el mismo turno, también desde otro teléfono;
 *  - siempre se puede escribir en vez de hablar, en cualquier pregunta y sin explicar por qué;
 *  - el audio y el micrófono arrancan solo después de un toque;
 *  - un silencio nunca corta: a los 30 segundos solo aparece un aviso amable;
 *  - el plan de preguntas no existe en el navegador: solo se conoce la pregunta en curso.
 */

const MS_PRUEBA_MICROFONO = 5_000;
const MS_ENTRE_CONSULTAS_DEL_PLAN = 2_000;
const MS_MAXIMO_ESPERA_DEL_PLAN = 3 * 60_000;
const MS_VACIAR_COLA = 25_000;
const MAX_ARCHIVO_BYTES = 20 * 1024 * 1024;

const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface OpcionesFlujo {
  pasoInicial: PasoAlumnoId;
  ensayoInicial: boolean;
  modoInicial: ModoDeRespuesta;
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDeApi) return error.message;
  return 'Algo salió raro. Inténtalo otra vez.';
}

function mimeDelArchivo(nombre: string): string | null {
  const extension = nombre.toLowerCase().split('.').pop();
  if (extension === 'pdf') return MIME_PDF;
  if (extension === 'docx') return MIME_DOCX;
  return null;
}

function tituloDe(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, '') || nombre;
}

function detalleDeLaEntrega(entrega: EntregaCliente): string {
  if (entrega.paginas) return `${entrega.paginas} ${entrega.paginas === 1 ? 'página' : 'páginas'}`;
  return `${entrega.palabras} palabras`;
}

interface Grabacion {
  grabador: Grabador;
  cola: ColaSubida;
  intento: number;
  turnoId: string;
  /** Resultado de detener la grabación, guardado por si "Listo" se tiene que reintentar. */
  detenida: { totalPartes: number; mime: string; duracionMs: number } | null;
}

export function useFlujoDefensa(actividad: ActividadAlumno, opciones: OpcionesFlujo) {
  /* ------------------------------ estado ------------------------------ */
  const [paso, setPaso] = useState<PasoAlumnoId>(opciones.pasoInicial);
  const [direccion, setDireccion] = useState<DireccionDeEntrada>('ninguna');
  const [modo, setModo] = useState<ModoDeRespuesta>(opciones.modoInicial);
  const [ensayoPedido, setEnsayoPedido] = useState(opciones.ensayoInicial);

  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [aceptaciones, setAceptaciones] = useState<Aceptaciones>([false, false, false]);

  const [estado, setEstado] = useState<EstadoSesionCliente | null>(null);
  const [haySesion, setHaySesion] = useState(false);
  const [defensa, setDefensa] = useState<DefensaCliente | null>(null);
  const [resumenPractica, setResumenPractica] = useState<ResumenPracticaCliente[] | null>(null);

  const [restaurando, setRestaurando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [estadoMicrofono, setEstadoMicrofono] = useState<EstadoPruebaMicrofono>('escuchando');
  const [microfonoListo, setMicrofonoListo] = useState(false);
  const [preguntando, setPreguntando] = useState(false);
  const [grabandoAclaracion, setGrabandoAclaracion] = useState(false);
  const aclaracionPorEscrito = useRef(false);
  const [oyendoParte, setOyendoParte] = useState(false);
  const [puedeHablar, setPuedeHablar] = useState(false);
  /**
   * La persona quería hablar pero el micrófono no abrió, así que responde escribiendo. Celestea sigue
   * diciendo las preguntas en voz alta (las bocinas no dependen del micrófono). Quien ELIGE escribir
   * no entra aquí: ahí todo queda en silencio.
   */
  const [vozSinMicrofono, setVozSinMicrofono] = useState(false);

  const [textos, setTextos] = useState<Record<string, string>>({});
  const [aclaracionTexto, setAclaracionTexto] = useState('');
  const [marcas, setMarcas] = useState<Record<string, boolean>>({});
  const [reinicioSilencio, setReinicioSilencio] = useState(0);

  /* ------------------------------- refs ------------------------------- */
  const pasoActual = useRef(paso);
  pasoActual.current = paso;
  const historial = useRef<ModoDeHistorial>('ninguno');
  const primerRender = useRef(true);
  const sesionRef = useRef<SesionGuardada | null>(null);
  const [reproductor] = useState(() => new Reproductor());
  const streamRef = useRef<MediaStream | null>(null);
  const grabacionRef = useRef<Grabacion | null>(null);
  const intentosPorTurno = useRef<Map<string, number>>(new Map());
  const ultimaVoz = useRef(0);
  const inicioEscucha = useRef(0);
  const motivoMicrofono = useRef<MotivoSinMicrofono | null>(null);
  /** La última pregunta cuya voz ya se dijo sola: si el modo cambia a media pregunta no se repite. */
  const preguntaLeida = useRef<string | null>(null);
  const vivo = useRef({ modo, defensa, estado, vozSinMicrofono });
  vivo.current = { modo, defensa, estado, vozSinMicrofono };

  const ensayo = defensa ? defensa.esEnsayo : ensayoPedido;
  const contexto = useMemo(() => contextoDeAlcance(estado, haySesion, defensa), [estado, haySesion, defensa]);
  const pasoVisible: PasoAlumnoId = pasoAlcanzable(paso, contexto) ? paso : pasoDeRespaldo(contexto);
  const planEstado: EstadoPlanCliente = estado?.plan ?? 'sin_entrega';
  const turnoActual = defensa?.pregunta?.turnoId ?? defensa?.aclaracion?.turnoId ?? null;

  /* ---------------------------- navegación ---------------------------- */
  const irA = useCallback(
    (destino: PasoAlumnoId, opcionesIr: { reemplazar?: boolean; direccion?: DireccionDeEntrada } = {}) => {
      const mismo = destino === pasoActual.current;
      const sentido: DireccionDeEntrada =
        opcionesIr.direccion ?? (mismo ? 'ninguna' : indiceDePaso(destino) >= indiceDePaso(pasoActual.current) ? 'der' : 'izq');
      historial.current = opcionesIr.reemplazar || mismo ? 'reemplazar' : 'empujar';
      setDireccion(sentido);
      setPaso(destino);
      setError(null);
    },
    [],
  );

  const cambiarModo = useCallback(
    (nuevo: ModoDeRespuesta, causa: 'eleccion' | 'falla' = 'eleccion') => {
      historial.current = 'reemplazar';
      setModo(nuevo);
      // Pasar a escribir por una falla del micrófono no apaga la voz de Celestea; elegirlo sí.
      setVozSinMicrofono(nuevo === 'escrito' && causa === 'falla');
      if (sesionRef.current) {
        sesionRef.current = { ...sesionRef.current, modo: nuevo };
        guardarSesion(actividad.token, sesionRef.current);
      }
    },
    [actividad.token],
  );

  // El paso y las banderas viven en la dirección: se escribe con la API del historial, sin pedir nada al servidor.
  useEffect(() => {
    if (historial.current === 'ninguno') return;
    const url = construirUrl(window.location, paso, ensayo, modo);
    if (historial.current === 'empujar') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    historial.current = 'ninguno';
  }, [paso, ensayo, modo]);

  // "Atrás" y "adelante" del navegador. Si el paso al que vuelve ya no existe, la pantalla muestra el de respaldo.
  useEffect(() => {
    const alRecorrerHistorial = () => {
      const parametros = new URLSearchParams(window.location.search);
      const destino = normalizarPaso(parametros.get('paso') ?? undefined);
      historial.current = 'ninguno';
      setDireccion(indiceDePaso(destino) >= indiceDePaso(pasoActual.current) ? 'der' : 'izq');
      setPaso(destino);
      setEnsayoPedido(leerBandera(parametros.get('ensayo') ?? undefined));
      setModo(parametros.get('modo') === 'escrito' ? 'escrito' : 'voz');
    };
    window.addEventListener('popstate', alRecorrerHistorial);
    return () => window.removeEventListener('popstate', alRecorrerHistorial);
  }, []);

  // Si se pidió un paso al que todavía no se puede llegar, la dirección se corrige al que sí.
  useEffect(() => {
    if (restaurando || pasoVisible === paso) return;
    historial.current = 'reemplazar';
    setPaso(pasoVisible);
  }, [restaurando, pasoVisible, paso]);

  /* ----------------------- estado que viene del servidor ----------------------- */
  const aplicarEstado = useCallback((nuevo: EstadoSesionCliente, reanudar: boolean) => {
    setEstado(nuevo);
    const enPantalla = defensaEnPantalla(nuevo);
    setDefensa(enPantalla);
    if (reanudar) {
      const ctx = contextoDeAlcance(nuevo, true, enPantalla);
      if (!pasoAlcanzable(pasoActual.current, ctx) || pasoActual.current === 'inicio') {
        const destino = pasoDeReanudacion(nuevo);
        historial.current = 'reemplazar';
        setDireccion('ninguna');
        setPaso(destino);
      }
    }
  }, []);

  /** Deja la defensa nueva también en el estado de la sesión, en el lugar que le toca (ensayo o real). */
  const guardarDefensa = useCallback((nueva: DefensaCliente) => {
    setDefensa(nueva);
    setEstado((previo) => (previo ? (nueva.esEnsayo ? { ...previo, ensayo: nueva } : { ...previo, defensa: nueva }) : previo));
  }, []);

  /** Si el servidor dice que la sesión ya no sirve, se borra y se pide entrar de nuevo. */
  const manejarError = useCallback(
    (causa: unknown): string => {
      if (causa instanceof ErrorDeApi && causa.codigo === 'no_autorizado' && sesionRef.current) {
        borrarSesion(actividad.token);
        sesionRef.current = null;
        setHaySesion(false);
        return 'Tu sesión terminó. Vuelve a entrar con tu nombre y tu matrícula: tu trabajo sigue ahí.';
      }
      return mensajeDeError(causa);
    },
    [actividad.token],
  );

  // Al abrir el enlace: si este teléfono ya tiene una sesión, se retoma donde se quedó.
  useEffect(() => {
    const guardada = leerSesion(actividad.token);
    if (!guardada) {
      setRestaurando(false);
      return undefined;
    }
    let cancelado = false;
    (async () => {
      try {
        const recibido = await conReintentos(() => api.estado(guardada.sesion), { intentos: 3 });
        if (cancelado) return;
        sesionRef.current = guardada;
        setHaySesion(true);
        setNombre(guardada.nombre);
        setMatricula(guardada.matricula);
        setModo(guardada.modo);
        aplicarEstado(recibido, true);
      } catch (causa) {
        if (causa instanceof ErrorDeApi && causa.codigo === 'no_autorizado') borrarSesion(actividad.token);
      } finally {
        if (!cancelado) setRestaurando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [actividad.token, aplicarEstado]);

  const sesion = () => sesionRef.current?.sesion ?? '';

  /** Vuelve a leer el estado del servidor (el plan, la entrega, la defensa) sin mover de pantalla. */
  const refrescarEstado = useCallback(async () => {
    if (!sesionRef.current) return null;
    const recibido = await api.estado(sesionRef.current.sesion);
    setEstado(recibido);
    return recibido;
  }, []);

  /* -------------------------------- entrada -------------------------------- */
  const empezar = () => {
    if (restaurando) return;
    if (haySesion && estado) {
      irA(pasoDeReanudacion(estado));
      return;
    }
    if (!actividad.enlaceActivo) {
      setError('Este enlace está desactivado. Pregúntale a tu profe.');
      return;
    }
    irA('quien');
  };

  const aceptarPermisos = async () => {
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const r = await api.iniciarSesion({
        token: actividad.token,
        nombre,
        matricula,
        consentimientos: {
          avisoPrivacidad: aceptaciones[0],
          transferenciaInternacional: aceptaciones[1],
          mayorDeEdad: aceptaciones[2],
        },
        modo,
      });
      const guardada: SesionGuardada = { sesion: r.sesion, expiraEn: r.expiraEn, nombre: r.estado.alumno.nombre, matricula: r.estado.alumno.matricula, modo };
      sesionRef.current = guardada;
      guardarSesion(actividad.token, guardada);
      setHaySesion(true);
      setNombre(r.estado.alumno.nombre);
      setMatricula(r.estado.alumno.matricula);
      aplicarEstado(r.estado, false);
      // Quien ya tenía avance (otro teléfono, otra vez en la fila) sigue donde iba.
      irA(r.estado.entrega ? pasoDeReanudacion(r.estado) : 'voz');
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  /* ------------------------------ el trabajo ------------------------------ */
  const alEntregar = useCallback(
    (entrega: EntregaCliente, destino: PasoAlumnoId) => {
      setEstado((previo) =>
        previo ? { ...previo, entrega, plan: 'generando', defensa: null, ensayo: null } : previo,
      );
      setDefensa(null);
      setResumenPractica(null);
      irA(destino);
    },
    [irA],
  );

  const elegirArchivo = async (archivo: File) => {
    if (ocupado) return;
    setError(null);
    const mime = mimeDelArchivo(archivo.name);
    if (!mime) {
      setError('Solo PDF o Word (.docx). Si lo tienes en otro formato, pega el texto.');
      return;
    }
    if (archivo.size === 0 || archivo.size > MAX_ARCHIVO_BYTES) {
      setError(archivo.size === 0 ? 'Ese archivo está vacío.' : 'Ese archivo pesa más de 20 MB. Pega el texto o sube una versión más ligera.');
      return;
    }
    setOcupado(true);
    try {
      // El navegador a veces no sabe el tipo de un .docx: se fija según la extensión.
      const cuerpo = new Blob([archivo], { type: mime });
      const inicio = await api.entregaArchivo(sesion(), { nombre: archivo.name, bytes: archivo.size, mime });
      let subido = inicio.subida ? await subirDirectoAlBucket(inicio.subida, cuerpo) : false;
      if (!subido) {
        // Respaldo: subir por la API (hasta 4 MB).
        if (archivo.size > inicio.maxBytesPorApi) {
          setError('No pudimos subir el archivo. Revisa tu conexión, o pega el texto de tu trabajo.');
          return;
        }
        await conReintentos(() => api.subirArchivoPorApi(sesion(), inicio.entregaId, cuerpo), { intentos: 3 });
        subido = true;
      }
      const confirmada = await conReintentos(() => api.confirmarEntrega(sesion(), inicio.entregaId), { intentos: 2 });
      alEntregar(confirmada.entrega, 'archivo');
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  const pegarTexto = async (texto: string) => {
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      const r = await api.entregaTexto(sesion(), texto);
      alEntregar(r.entrega, 'entregado');
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  /* ----------------------- el plan de preguntas ----------------------- */
  // Mientras se arma, se pregunta cada 2 segundos cómo va. Si no avanza, se vuelve a pedir una vez.
  useEffect(() => {
    if (!haySesion || !estado?.entrega || estado.plan !== 'generando') return undefined;
    let cancelado = false;
    const inicio = Date.now();
    let reintentado = false;
    const tick = async () => {
      if (cancelado) return;
      try {
        if (!reintentado && Date.now() - inicio > 8_000) {
          reintentado = true;
          await api.plan(sesion());
        }
        const recibido = await api.estado(sesion());
        if (cancelado) return;
        setEstado((previo) => (previo ? { ...previo, plan: recibido.plan, entrega: recibido.entrega ?? previo.entrega } : recibido));
        if (recibido.plan === 'generando' && Date.now() - inicio > MS_MAXIMO_ESPERA_DEL_PLAN) {
          setEstado((previo) => (previo ? { ...previo, plan: 'error' } : previo));
        }
      } catch {
        // Sin red por un momento: se vuelve a preguntar en el siguiente turno.
      }
    };
    const intervalo = window.setInterval(() => void tick(), MS_ENTRE_CONSULTAS_DEL_PLAN);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
    // sesion() lee una ref: no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haySesion, estado?.entrega?.id, estado?.plan]);

  const reintentarPlan = async () => {
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const r = await api.plan(sesion());
      setEstado((previo) => (previo ? { ...previo, plan: r.plan } : previo));
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  /* ----------------------- micrófono y prueba de voz ----------------------- */
  const abrirMicrofono = async (): Promise<boolean> => {
    if (streamRef.current && streamRef.current.getAudioTracks().some((pista) => pista.readyState === 'live')) return true;
    try {
      streamRef.current = await pedirMicrofono();
      setMicrofonoListo(true);
      return true;
    } catch (causa) {
      streamRef.current = null;
      setMicrofonoListo(false);
      const motivo = causa instanceof ErrorDeMicrofono ? causa.motivo : 'ocupado';
      motivoMicrofono.current = motivo;
      // Solo el motivo, nunca nada de la persona: sirve para saber qué le pasó al navegador.
      console.warn('defensa_microfono', motivo);
      return false;
    }
  };

  /** El mensaje de por qué no abrió el micrófono la última vez, con lo que hay que hacer. */
  const mensajeDelMicrofono = () => mensajeDeMicrofono(motivoMicrofono.current ?? 'no_soportado');

  const seguirDeEntregado = async () => {
    if (ocupado) return;
    if (modo === 'escrito' || !microfonoSoportado()) {
      if (modo === 'voz') {
        motivoMicrofono.current = typeof window !== 'undefined' && window.isSecureContext === false ? 'inseguro' : 'no_soportado';
        cambiarModo('escrito', 'falla');
      }
      void reproductor.desbloquear();
      irA('respira');
      return;
    }
    setOcupado(true);
    // Este toque es el que autoriza el micrófono y el audio (iOS lo exige).
    void reproductor.desbloquear();
    const abierto = await abrirMicrofono();
    setEstadoMicrofono(abierto ? 'escuchando' : 'sin_microfono');
    setOcupado(false);
    irA('hola');
  };

  // Cinco segundos oyendo el micrófono: dice si se oye bien o si hay ruido o poco volumen.
  const sinMicrofono = estadoMicrofono === 'sin_microfono';
  useEffect(() => {
    if (pasoVisible !== 'hola' || !streamRef.current || sinMicrofono) return undefined;
    setEstadoMicrofono('escuchando');
    const muestras: number[] = [];
    let medidor: Medidor | null = null;
    let cerrado = false;
    const cerrar = () => {
      cerrado = true;
      medidor?.cerrar();
    };
    medidor = crearMedidor(streamRef.current, (nivel) => {
      if (cerrado) return;
      muestras.push(nivel);
      if (evaluarPrueba(muestras) === 'bien') {
        setEstadoMicrofono('bien');
        cerrar();
      }
    });
    const final = window.setTimeout(() => {
      if (cerrado) return;
      const resultado = evaluarPrueba(muestras);
      setEstadoMicrofono(resultado === 'bien' ? 'bien' : resultado);
      cerrar();
    }, MS_PRUEBA_MICROFONO);
    return () => {
      window.clearTimeout(final);
      cerrar();
    };
  }, [pasoVisible, sinMicrofono]);

  const escribirDesdeHola = () => {
    // Si el micrófono no estaba bien, escribir es consecuencia de la falla y la voz de Celestea sigue; si estaba bien, es una elección.
    cambiarModo('escrito', estadoMicrofono === 'bien' || estadoMicrofono === 'escuchando' ? 'eleccion' : 'falla');
    irA('respira');
  };

  const seguirDeHola = () => {
    if (estadoMicrofono === 'sin_microfono') cambiarModo('escrito', 'falla');
    irA('respira');
  };

  /* --------------------------- grabación por partes --------------------------- */
  const subirParte = useCallback(
    (turnoId: string, intento: number) => async (indice: number, parte: Blob): Promise<ResultadoDeSubida> => {
      try {
        await api.subirParte(sesionRef.current?.sesion ?? '', turnoId, intento, indice, parte);
        return 'listo';
      } catch (causa) {
        // Sin red o sobrecargado: se reintenta. Un rechazo del servidor (turno cerrado, sesión vencida) no.
        if (causa instanceof ErrorDeApi && (causa.esDeRed || causa.status >= 500 || causa.status === 429)) return 'reintentar';
        return 'descartar';
      }
    },
    [],
  );

  const cancelarGrabacion = useCallback(() => {
    const actual = grabacionRef.current;
    if (!actual) return;
    actual.grabador.cancelar();
    actual.cola.limpiar();
    grabacionRef.current = null;
  }, []);

  const iniciarGrabacion = useCallback(
    (turnoId: string): boolean => {
      const stream = streamRef.current;
      if (!stream) return false;
      cancelarGrabacion();
      const intento = Math.min(intentosPorTurno.current.get(turnoId) ?? 0, 99);
      intentosPorTurno.current.set(turnoId, intento + 1);
      const cola = new ColaSubida({ subir: subirParte(turnoId, intento) });
      const grabador = new Grabador(stream, {
        alParte: (indice, parte) => cola.encolar(indice, parte),
        alError: () => {
          // El micrófono se perdió a media respuesta: se sigue por escrito, sin perder el turno.
          cancelarGrabacion();
          setGrabandoAclaracion(false);
          setError('Se perdió el micrófono. Puedes escribir tu respuesta.');
          setModo('escrito');
          setVozSinMicrofono(true);
        },
      });
      grabacionRef.current = { grabador, cola, intento, turnoId, detenida: null };
      grabador.iniciar();
      const ahora = Date.now();
      ultimaVoz.current = ahora;
      inicioEscucha.current = ahora;
      return grabacionRef.current !== null;
    },
    [cancelarGrabacion, subirParte],
  );

  // Cuando hay una pregunta nueva: si se habla, Celestea la dice y, al terminar, se empieza a grabar.
  const enPregunta = pasoVisible === 'pregunta' || pasoVisible === 'silencio';
  const claveDePregunta = defensa?.pregunta && enPregunta ? `${defensa.id}:${defensa.pregunta.turnoId}` : null;
  useEffect(() => {
    const pregunta = vivo.current.defensa?.pregunta;
    if (!claveDePregunta || !pregunta) return undefined;
    // Se graba solo si la persona habla; Celestea dice la pregunta si habla o si quería hablar y el micrófono falló.
    const grabara = vivo.current.modo === 'voz';
    if (!grabara && !vivo.current.vozSinMicrofono) {
      setPreguntando(false);
      return undefined;
    }
    let cancelado = false;
    (async () => {
      if (pregunta.audioUrl && preguntaLeida.current !== claveDePregunta) {
        preguntaLeida.current = claveDePregunta;
        setPreguntando(true);
        await reproductor.reproducir(pregunta.audioUrl);
      }
      if (cancelado) return;
      setPreguntando(false);
      if (!grabara) return;
      // Tras recargar la página el micrófono hay que volver a abrirlo; si el permiso sigue dado, no pregunta nada.
      if (!streamRef.current) await abrirMicrofono();
      if (cancelado) return;
      if (!iniciarGrabacion(pregunta.turnoId)) {
        setError(mensajeDelMicrofono());
        cambiarModo('escrito', 'falla');
      }
    })();
    return () => {
      cancelado = true;
      reproductor.detener();
      setPreguntando(false);
      cancelarGrabacion();
    };
    // Solo cambia con la pregunta y con la modalidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDePregunta, modo]);

  // Sin prisa: si pasa el tiempo sin voz, aparece el aviso amable; si vuelve la voz, desaparece. Nada se corta.
  useEffect(() => {
    if (modo !== 'voz' || !claveDePregunta) return undefined;
    let entroASilencio = false;
    const intervalo = window.setInterval(() => {
      const grabacion = grabacionRef.current;
      if (!grabacion) return;
      const sinVoz = Date.now() - Math.max(ultimaVoz.current, inicioEscucha.current);
      const limite = actividad.segundosSilencio * 1000;
      if (sinVoz >= limite && pasoActual.current === 'pregunta') {
        irA('silencio', { reemplazar: true, direccion: 'ninguna' });
        if (!entroASilencio && vivo.current.defensa?.pregunta) {
          entroASilencio = true;
          void api.marcar(sesion(), vivo.current.defensa.pregunta.turnoId, 'silencio').catch(() => undefined);
        }
      } else if (sinVoz < 2_000 && pasoActual.current === 'silencio') {
        irA('pregunta', { reemplazar: true, direccion: 'ninguna' });
        entroASilencio = false;
      }
    }, 1_000);
    return () => window.clearInterval(intervalo);
  }, [modo, claveDePregunta, reinicioSilencio, actividad.segundosSilencio, irA]);

  // El volumen del micrófono mantiene viva la conversación: mientras haya voz no hay "sin prisa".
  useEffect(() => {
    const stream = streamRef.current;
    if (modo !== 'voz' || !claveDePregunta || !stream) return undefined;
    const medidor = crearMedidor(stream, (nivel) => {
      if (nivel >= UMBRAL_VOZ) ultimaVoz.current = Date.now();
    });
    return () => medidor.cerrar();
  }, [modo, claveDePregunta]);

  /* ------------------------------- responder ------------------------------- */
  const textoDeLaPregunta = defensa?.pregunta ? (textos[defensa.pregunta.turnoId] ?? '') : '';
  const cambiarTexto = (texto: string) => {
    const turno = vivo.current.defensa?.pregunta?.turnoId;
    if (turno) setTextos((previo) => ({ ...previo, [turno]: texto }));
  };

  /** Aplica la respuesta del servidor y lleva a donde sigue: otra pregunta, una aclaración o la revisión. */
  const aplicarDefensa = useCallback(
    (nueva: DefensaCliente) => {
      guardarDefensa(nueva);
      setMarcas((previas) => {
        const siguientes: Record<string, boolean> = { ...previas };
        for (const bloque of nueva.revision ?? []) {
          for (const linea of bloque.lineas ?? []) if (linea.marcada) siguientes[linea.id] = true;
        }
        return siguientes;
      });
      irA(pasoDeDefensa(nueva), { direccion: 'der' });
    },
    [irA, guardarDefensa],
  );

  const terminarRespuesta = async () => {
    const actual = vivo.current.defensa;
    const pregunta = actual?.pregunta;
    if (!actual || !pregunta || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      if (vivo.current.modo === 'escrito') {
        const r = await api.responder(sesion(), pregunta.turnoId, {
          modo: 'escrito',
          texto: textos[pregunta.turnoId] ?? '',
          duracionMs: 0,
          repeticiones: pregunta.repeticiones,
        });
        cancelarGrabacion();
        aplicarDefensa(r.defensa);
        return;
      }

      const grabacion = grabacionRef.current;
      if (!grabacion) {
        setError('No tengo tu grabación. Puedes escribir tu respuesta.');
        return;
      }
      // Al parar sale la última parte; después se espera a que todo esté en el servidor.
      grabacion.detenida ??= await grabacion.grabador.detener();
      const detenida = grabacion.detenida;
      const completa = await grabacion.cola.vaciar(MS_VACIAR_COLA);
      if (!completa) {
        setError('Tu respuesta se está enviando y la conexión va lenta. Lo que dijiste está guardado aquí; toca Listo otra vez en un momento, o escribe.');
        return;
      }
      const enviar = () =>
        api.responder(sesion(), pregunta.turnoId, {
          modo: 'voz',
          intento: grabacion.intento,
          totalPartes: detenida.totalPartes,
          mime: detenida.mime,
          duracionMs: detenida.duracionMs,
          repeticiones: pregunta.repeticiones,
        });
      let r;
      try {
        r = await enviar();
      } catch (causa) {
        // El servidor dice qué partes no le llegaron: se mandan de nuevo desde la memoria y se reintenta una vez.
        if (causa instanceof ErrorDeApi && causa.codigo === 'partes_faltantes') {
          const faltan = (causa.detalle?.faltan as number[] | undefined) ?? [];
          grabacion.cola.reenviar(faltan);
          if (!(await grabacion.cola.vaciar(MS_VACIAR_COLA))) throw causa;
          r = await enviar();
        } else {
          throw causa;
        }
      }
      grabacion.cola.limpiar();
      grabacionRef.current = null;
      aplicarDefensa(r.defensa);
    } catch (causa) {
      // Si no se pudo pasar la voz a texto no se insiste: se sigue por escrito en esa misma pregunta.
      if (causa instanceof ErrorDeApi && causa.codigo === 'transcripcion_fallo') {
        cancelarGrabacion();
        cambiarModo('escrito', 'falla');
      }
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  const escribirEnVezDeHablar = () => {
    cancelarGrabacion();
    reproductor.detener();
    setError(null);
    cambiarModo('escrito');
  };

  const hablarEnVezDeEscribir = async () => {
    setError(null);
    if (!(await abrirMicrofono())) {
      setError(mensajeDelMicrofono());
      return;
    }
    void reproductor.desbloquear();
    cambiarModo('voz');
  };

  const repetirPregunta = () => {
    const pregunta = vivo.current.defensa?.pregunta;
    if (!pregunta) return;
    void api.marcar(sesion(), pregunta.turnoId, 'repeticion').catch(() => undefined);
    setReinicioSilencio((valor) => valor + 1);
    if (pasoActual.current === 'silencio') irA('pregunta', { reemplazar: true, direccion: 'ninguna' });
    if (!pregunta.audioUrl) return;
    // Mientras Celestea repite, no se graba: se descarta lo que hubiera y se empieza de nuevo al terminar.
    cancelarGrabacion();
    setPreguntando(true);
    void reproductor.reproducir(pregunta.audioUrl).then((resultado) => {
      if (resultado === 'detenido') return;
      setPreguntando(false);
      if (vivo.current.modo === 'voz' && vivo.current.defensa?.pregunta?.turnoId === pregunta.turnoId) {
        iniciarGrabacion(pregunta.turnoId);
      }
    });
  };

  /* -------------------------- empezar la defensa -------------------------- */
  const empezarDefensa = async (esEnsayo: boolean) => {
    if (ocupado || planEstado !== 'listo') return;
    // Este toque autoriza el audio de todas las preguntas que vienen (iOS lo exige).
    void reproductor.desbloquear();
    setOcupado(true);
    setError(null);
    try {
      if (vivo.current.modo === 'voz' && !streamRef.current) await abrirMicrofono();
      if (vivo.current.modo === 'voz' && !streamRef.current) cambiarModo('escrito', 'falla');
      const r = await api.iniciarDefensa(sesion(), esEnsayo);
      setEnsayoPedido(esEnsayo);
      setResumenPractica(null);
      setMarcas({});
      guardarDefensa(r.defensa);
      irA(pasoDeDefensa(r.defensa));
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  const salirDeLaDefensa = () => {
    const actual = vivo.current.defensa;
    cancelarGrabacion();
    reproductor.detener();
    if (actual) void api.salir(sesion(), actual.id).catch(() => undefined);
    irA('respira', { direccion: 'izq' });
  };

  /* ------------------------------- aclaración ------------------------------- */
  const claveDeAclaracion = defensa?.aclaracion && pasoVisible === 'aclaracion' ? `${defensa.id}:${defensa.aclaracion.turnoId}` : null;
  useEffect(() => {
    const aclaracion = vivo.current.defensa?.aclaracion;
    if (!claveDeAclaracion || !aclaracion) return undefined;
    setAclaracionTexto('');
    setGrabandoAclaracion(false);
    cancelarGrabacion();
    // Si habla, la voz dice una frase fija; el hueco solo se lee.
    if (vivo.current.modo === 'voz' && aclaracion.vozUrl) void reproductor.reproducir(aclaracion.vozUrl);
    return () => {
      reproductor.detener();
      setOyendoParte(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDeAclaracion]);

  /** La pantalla avisa si se está escribiendo o diciendo esa parte; al escribir se descarta la grabación. */
  const cambiarMedioDeAclaracion = useCallback(
    (escribiendo: boolean) => {
      aclaracionPorEscrito.current = escribiendo;
      if (escribiendo) {
        cancelarGrabacion();
        setGrabandoAclaracion(false);
      }
    },
    [cancelarGrabacion],
  );

  const oirParte = () => {
    const aclaracion = vivo.current.defensa?.aclaracion;
    if (!aclaracion?.audioUrl) return;
    if (oyendoParte) {
      reproductor.detener();
      setOyendoParte(false);
      return;
    }
    setOyendoParte(true);
    void reproductor
      .reproducir(aclaracion.audioUrl, { desdeMs: aclaracion.desdeMs, hastaMs: aclaracion.hastaMs })
      .then(() => setOyendoParte(false));
  };

  const empezarADecirLaParte = async () => {
    const aclaracion = vivo.current.defensa?.aclaracion;
    if (!aclaracion || ocupado) return;
    reproductor.detener();
    setOyendoParte(false);
    setError(null);
    if (!(await abrirMicrofono()) || !iniciarGrabacion(aclaracion.turnoId)) {
      setError(`${mensajeDelMicrofono()} Escribe esa parte.`);
      return;
    }
    setGrabandoAclaracion(true);
  };

  const terminarAclaracion = async () => {
    const aclaracion = vivo.current.defensa?.aclaracion;
    if (!aclaracion || ocupado) return;
    const porEscrito = aclaracionPorEscrito.current;
    setOcupado(true);
    setError(null);
    try {
      if (porEscrito || !grabacionRef.current) {
        cancelarGrabacion();
        const r = await api.aclarar(sesion(), aclaracion.turnoId, { modo: 'escrito', texto: aclaracionTexto });
        setGrabandoAclaracion(false);
        aplicarDefensa(r.defensa);
        return;
      }
      const grabacion = grabacionRef.current;
      grabacion.detenida ??= await grabacion.grabador.detener();
      const detenida = grabacion.detenida;
      if (!(await grabacion.cola.vaciar(MS_VACIAR_COLA))) {
        setError('La conexión va lenta. Toca Listo otra vez en un momento, o escribe esa parte.');
        return;
      }
      const r = await api.aclarar(sesion(), aclaracion.turnoId, {
        modo: 'voz',
        intento: grabacion.intento,
        totalPartes: detenida.totalPartes,
        mime: detenida.mime,
        duracionMs: detenida.duracionMs,
      });
      grabacion.cola.limpiar();
      grabacionRef.current = null;
      setGrabandoAclaracion(false);
      aplicarDefensa(r.defensa);
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  /* --------------------------- revisar y entregar --------------------------- */
  const alternarMarca = (idLinea: string) => setMarcas((previas) => ({ ...previas, [idLinea]: !previas[idLinea] }));

  const entregarRevision = async () => {
    const actual = vivo.current.defensa;
    if (!actual || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const lista = Object.entries(marcas)
        .filter(([, marcada]) => marcada)
        .map(([linea]) => ({ turnoId: linea.split(':')[0] ?? '', linea }));
      const r = await api.entregarDefensa(sesion(), actual.id, lista);
      if (r.resumenPractica) setResumenPractica(r.resumenPractica);
      guardarDefensa(r.defensa);
      irA('estres');
    } catch (causa) {
      setError(manejarError(causa));
    } finally {
      setOcupado(false);
    }
  };

  const despuesDelEstres = () => {
    const actual = vivo.current.defensa;
    if (actual?.esEnsayo) {
      irA('respira');
      // Un nuevo ensayo o la defensa de verdad parten de cero.
      setDefensa(null);
      setEstado((previo) => (previo ? { ...previo, ensayo: null } : previo));
    } else {
      irA('listo');
    }
  };

  const elegirEstres = async (nivel: number) => {
    const actual = vivo.current.defensa;
    if (actual) {
      try {
        await conReintentos(() => api.estres(sesion(), actual.id, nivel), { intentos: 2, esperaMs: 600 });
      } catch {
        // No se bloquea a nadie por esta pregunta: el siguiente paso es el mismo.
      }
    }
    despuesDelEstres();
  };

  /* ------------------------------- la pantalla ------------------------------- */
  // Título y foco: cada paso nuevo se anuncia y el teclado empieza en su título.
  const pasoAnterior = useRef(pasoVisible);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      pasoAnterior.current = pasoVisible;
      return;
    }
    const mismaPregunta =
      (pasoVisible === 'pregunta' || pasoVisible === 'silencio') && (pasoAnterior.current === 'pregunta' || pasoAnterior.current === 'silencio');
    pasoAnterior.current = pasoVisible;
    if (mismaPregunta) return;
    const titulo = document.querySelector<HTMLElement>('#contenido-defensa h1');
    if (titulo) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
    }
  }, [pasoVisible, claveDePregunta]);

  // Se sabe en el navegador (no en el servidor) si hay micrófono y grabación disponibles.
  useEffect(() => setPuedeHablar(microfonoSoportado()), []);

  // Al salir de la página se suelta el micrófono y el audio.
  useEffect(() => {
    return () => {
      cancelarGrabacion();
      reproductor.liberar();
      soltarMicrofono(streamRef.current);
      streamRef.current = null;
    };
  }, [cancelarGrabacion, reproductor]);

  // La cola reintenta enseguida cuando el navegador avisa que volvió la red.
  useEffect(() => {
    const alVolverLaRed = () => grabacionRef.current?.cola.hayRed();
    window.addEventListener('online', alVolverLaRed);
    return () => window.removeEventListener('online', alVolverLaRed);
  }, []);

  const entrega = estado?.entrega ?? null;
  const trabajo = useMemo<TrabajoEntregado | null>(
    () =>
      entrega
        ? { titulo: tituloDe(entrega.nombre), curso: actividad.curso, archivo: entrega.nombre, detalle: detalleDeLaEntrega(entrega) }
        : null,
    [entrega, actividad.curso],
  );

  return {
    // navegación
    paso: pasoVisible,
    direccion,
    restaurando,
    irA,
    // datos del alumno
    nombre,
    matricula,
    setNombre,
    setMatricula,
    aceptaciones,
    cambiarAceptacion: (indice: 0 | 1 | 2, valor: boolean) =>
      setAceptaciones((previas) => {
        const copia: [boolean, boolean, boolean] = [previas[0], previas[1], previas[2]];
        copia[indice] = valor;
        return copia;
      }),
    modo,
    cambiarModo,
    // estado del servidor
    planEstado,
    entrega,
    trabajo,
    defensa,
    ensayo,
    resumenPractica,
    haySesion,
    // estado de la interfaz
    ocupado,
    error,
    estadoMicrofono,
    microfonoListo,
    preguntando,
    grabandoAclaracion,
    oyendoParte,
    puedeHablar,
    /** La defensa de verdad ya empezó (no el ensayo): el botón la retoma en vez de empezar otra. */
    defensaRealAbierta: estaViva(estado?.defensa ?? null),
    textoDeLaPregunta,
    aclaracionTexto,
    marcas,
    bloquesRevision: bloquesDeRevision(defensa),
    // sellos de entrega
    horaEntrega: entrega ? horaMexico(entrega.entregadaEn) : '',
    fechaEntrega: entrega ? diaYMes(entrega.entregadaEn) : '',
    selloEntrega: entrega ? selloAccesible(entrega.entregadaEn) : '',
    horaDefensa: defensa?.entregadaEn ? horaMexico(defensa.entregadaEn) : '',
    // acciones
    empezar,
    aceptarPermisos,
    elegirArchivo,
    pegarTexto,
    seguirDeEntregado,
    seguirDeHola,
    escribirDesdeHola,
    empezarDefensa,
    reintentarPlan,
    cambiarTexto,
    terminarRespuesta,
    escribirEnVezDeHablar,
    hablarEnVezDeEscribir,
    repetirPregunta,
    salirDeLaDefensa,
    setAclaracionTexto,
    oirParte,
    cambiarMedioDeAclaracion,
    empezarADecirLaParte,
    terminarAclaracion,
    alternarMarca,
    entregarRevision,
    elegirEstres,
    omitirEstres: despuesDelEstres,
    refrescarEstado,
  };
}

export type FlujoDefensa = ReturnType<typeof useFlujoDefensa>;
