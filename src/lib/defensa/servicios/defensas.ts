import 'server-only';
import type {
  AclaracionCliente,
  BloqueRevisionCliente,
  DefensaCliente,
  EstadoSesionCliente,
  LineaRevisionCliente,
  PeticionAclarar,
  PeticionResponder,
  PreguntaCliente,
  RespuestaDefensa,
  ResumenPracticaCliente,
} from '../../../components/defensa/contrato';
import type {
  ActividadRow,
  DefensaRow,
  MarcaRevision,
  ModoRespuesta,
  ParteAudioRow,
  PlanRow,
  TurnoRow,
} from '../almacen/tipos';
import { clasificarRespuesta } from '../clasificadorTurno';
import { LIMITES, config } from '../config';
import { DefensaError, estadoInvalido, noEncontrado } from '../errores';
import { limpiarTexto } from '../etiquetas';
import { generarSemilla } from '../firmas';
import type { PalabraTranscrita } from '../providers/tipos';
import { aplicarRelleno, construirLineas, elegirHueco, textoDe } from '../transcripcion';
import { buscarPregunta, separarContexto, siguienteTurno, type TurnoPrevio } from '../turnEngine';
import type { SesionAlumno } from './acceso';
import type { Ctx } from './contexto';
import { entregaACliente, entregaVigente } from './entregas';
import { CLAVE_AUDIO_ACLARACION, audioDeTexto, estadoDelPlan } from './planes';

/**
 * La defensa, turno por turno.
 *
 * El navegador solo sabe de UNA pregunta a la vez: la que está esperando respuesta.
 * Quién decide cuál sigue es el motor de turnos (turnEngine.ts) con el plan y la
 * semilla guardados; el modelo, durante la defensa, solo clasifica la respuesta.
 *
 * Reglas de diseño que viven aquí:
 *  - una falla técnica nunca le cuesta la entrega al alumno: el trabajo ya está
 *    entregado y la defensa sigue en el mismo turno al volver, o por escrito;
 *  - siempre se puede escribir en vez de hablar, en cualquier pregunta;
 *  - un silencio nunca corta nada;
 *  - si Celestea no entiende una parte del audio, pregunta solo esa parte (una por
 *    respuesta), el reloj se pausa y la IA nunca llena el hueco: lo llena el alumno;
 *  - el ensayo es privado: usa el mismo motor pero prefiere otras preguntas para la
 *    defensa de verdad, y el profesor no lo ve.
 */

/** Lo que cuenta de un turno para el reloj: sin las pausas largas por una red caída. */
const MAX_TURNO_ACTIVO_MS = 150_000;
/** Un turno "procesando" más viejo que esto se considera atascado y se puede reintentar. */
const PROCESANDO_OBSOLETO_MS = 90_000;
const TIMEOUT_TRANSCRIPCION_MS = 28_000;
const MAX_PARTES_POR_RESPUESTA = 600;
const MAX_INTENTOS_GRABACION = 99;
const PADDING_PARTE_MS = 400;

type Fase = 'respuesta' | 'aclaracion';

// ── Carga y comprobación de dueño ───────────────────────────────────────────

async function cargarDefensa(ctx: Ctx, { alumno }: SesionAlumno, defensaId: string): Promise<DefensaRow> {
  const defensa = await ctx.repo.defensaPorId(defensaId);
  if (!defensa || defensa.alumnoId !== alumno.id) throw noEncontrado();
  return defensa;
}

async function cargarPlan(ctx: Ctx, defensa: DefensaRow): Promise<PlanRow & { plan: NonNullable<PlanRow['plan']> }> {
  const plan = await ctx.repo.planPorId(defensa.planId);
  if (!plan || !plan.plan) throw new DefensaError('plan_no_listo', 409);
  return plan as PlanRow & { plan: NonNullable<PlanRow['plan']> };
}

async function cargarTurno(ctx: Ctx, sesion: SesionAlumno, turnoId: string) {
  const turno = await ctx.repo.turnoPorId(turnoId);
  if (!turno) throw noEncontrado();
  const defensa = await cargarDefensa(ctx, sesion, turno.defensaId);
  return { turno, defensa };
}

// ── Estado hacia el navegador ───────────────────────────────────────────────

function entre(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, Number.isFinite(valor) ? valor : minimo));
}

async function aPreguntaCliente(ctx: Ctx, turno: TurnoRow): Promise<PreguntaCliente> {
  return {
    turnoId: turno.id,
    numero: turno.numero,
    contexto: turno.contextoTexto,
    pregunta: turno.preguntaTexto,
    audioUrl: turno.audioPreguntaRuta
      ? await ctx.archivos.urlFirmadaDescarga('audio', turno.audioPreguntaRuta, LIMITES.enlaceAudioSegundos).catch(() => null)
      : null,
    repeticiones: turno.repeticiones,
  };
}

async function aAclaracionCliente(ctx: Ctx, turno: TurnoRow, plan: PlanRow): Promise<AclaracionCliente | null> {
  const a = turno.aclaracion;
  if (!a || a.estado !== 'pendiente') return null;
  const firmar = (ruta: string | null | undefined) =>
    ruta ? ctx.archivos.urlFirmadaDescarga('audio', ruta, LIMITES.enlaceAudioSegundos).catch(() => null) : Promise.resolve(null);
  return {
    turnoId: turno.id,
    numero: turno.numero,
    antes: a.antes,
    despues: a.despues,
    vozUrl: await firmar(plan.audios[CLAVE_AUDIO_ACLARACION]),
    audioUrl: await firmar(turno.audioRuta),
    desdeMs: Math.max(0, a.inicioMs - PADDING_PARTE_MS),
    hastaMs: a.finMs + PADDING_PARTE_MS,
  };
}

function lineasDeRevision(turno: TurnoRow, marcas: readonly MarcaRevision[]): LineaRevisionCliente[] {
  return construirLineas(turno.id, turno.transcripcion ?? []).map((linea) => ({
    id: linea.id,
    tiempo: linea.tiempo,
    segmentos: linea.segmentos,
    aclarada: linea.aclarada,
    marcada: marcas.some((m) => m.turnoId === turno.id && m.linea === linea.id),
  }));
}

function construirRevision(turnos: readonly TurnoRow[], marcas: readonly MarcaRevision[]): BloqueRevisionCliente[] {
  return turnos
    .filter((t) => t.estado === 'cerrado' && (t.textoRespuesta ?? '').trim().length > 0 && t.modoRespuesta !== null)
    .map((t) => {
      const bloque: BloqueRevisionCliente = {
        turnoId: t.id,
        numero: t.numero,
        contexto: t.contextoTexto,
        pregunta: t.preguntaTexto,
        modo: t.modoRespuesta ?? 'escrito',
      };
      if (t.modoRespuesta === 'voz' && (t.transcripcion?.length ?? 0) > 0) bloque.lineas = lineasDeRevision(t, marcas);
      else bloque.porEscrito = t.textoRespuesta ?? '';
      return bloque;
    });
}

async function aDefensaCliente(ctx: Ctx, defensa: DefensaRow, plan: PlanRow, turnos: readonly TurnoRow[]): Promise<DefensaCliente> {
  const aclarando = turnos.find((t) => t.estado === 'aclarando');
  const abierto = turnos.find((t) => t.estado === 'esperando' || t.estado === 'procesando');
  const enCurso = defensa.estado === 'en_curso';
  const terminada = defensa.estado === 'por_revisar' || defensa.estado === 'entregada' || defensa.estado === 'incompleta';
  return {
    id: defensa.id,
    esEnsayo: defensa.esEnsayo,
    estado: defensa.estado,
    respondidas: turnos.filter((t) => t.estado === 'cerrado' && t.modoRespuesta !== null).length,
    pregunta: enCurso && !aclarando && abierto ? await aPreguntaCliente(ctx, abierto) : null,
    aclaracion: enCurso && aclarando ? await aAclaracionCliente(ctx, aclarando, plan) : null,
    revision: terminada ? construirRevision(turnos, defensa.marcasRevision) : null,
    entregadaEn: defensa.entregadaEn,
    estresRespondido: defensa.nivelEstres !== null,
  };
}

async function estadoDeDefensa(ctx: Ctx, defensa: DefensaRow): Promise<DefensaCliente> {
  const [plan, turnos] = await Promise.all([ctx.repo.planPorId(defensa.planId), ctx.repo.turnosDeDefensa(defensa.id)]);
  if (!plan) throw new DefensaError('plan_no_listo', 409);
  return aDefensaCliente(ctx, defensa, plan, turnos);
}

/** Todo lo que la pantalla necesita para continuar donde se quedó, incluso en otro dispositivo. */
export async function obtenerEstadoSesion(ctx: Ctx, sesion: SesionAlumno): Promise<EstadoSesionCliente> {
  const { alumno } = sesion;
  const { estado: plan, entrega } = await estadoDelPlan(ctx, alumno.id);

  const vigente = async (esEnsayo: boolean, estados: readonly DefensaRow['estado'][]): Promise<DefensaCliente | null> => {
    if (!entrega) return null;
    const defensa = await ctx.repo.ultimaDefensa(alumno.id, esEnsayo);
    if (!defensa || defensa.entregaId !== entrega.id || !estados.includes(defensa.estado)) return null;
    return estadoDeDefensa(ctx, defensa);
  };

  return {
    alumno: { nombre: alumno.nombre, matricula: alumno.matricula, modo: alumno.modoPreferido },
    entrega: entrega ? entregaACliente(entrega) : null,
    plan,
    defensa: await vigente(false, ['en_curso', 'por_revisar', 'entregada', 'incompleta']),
    ensayo: await vigente(true, ['en_curso', 'por_revisar']),
  };
}

// ── Turnos ──────────────────────────────────────────────────────────────────

function turnosCerrados(turnos: readonly TurnoRow[]): TurnoRow[] {
  return turnos.filter((t) => t.estado === 'cerrado');
}

/** Reloj activo: cada turno cuenta lo que tardó en responder, con tope, y la aclaración no entra. */
function relojActivoMs(turnos: readonly TurnoRow[]): number {
  return turnosCerrados(turnos).reduce((suma, t) => {
    if (!t.respondidoEn) return suma;
    return suma + entre(Date.parse(t.respondidoEn) - Date.parse(t.preguntadoEn), 0, MAX_TURNO_ACTIVO_MS);
  }, 0);
}

function aTurnoPrevio(t: TurnoRow): TurnoPrevio {
  return { ref: t.preguntaRef, tipo: t.tipo, objetivoId: t.objetivoId, clase: t.clase };
}

/** Las candidatas que ya se usaron en el ensayo: la defensa de verdad prefiere las otras. */
async function candidatasDelEnsayo(ctx: Ctx, defensa: DefensaRow): Promise<string[]> {
  if (defensa.esEnsayo) return [];
  const ensayo = await ctx.repo.ultimaDefensa(defensa.alumnoId, true);
  if (!ensayo || ensayo.entregaId !== defensa.entregaId) return [];
  const turnos = await ctx.repo.turnosDeDefensa(ensayo.id);
  return turnos.filter((t) => t.tipo === 'candidata').map((t) => t.preguntaRef);
}

/**
 * Pide al motor la siguiente pregunta y la crea; si ya no hay más, deja la defensa
 * lista para revisar. Si dos solicitudes avanzan a la vez, la segunda encuentra
 * el turno que creó la primera.
 */
async function avanzar(ctx: Ctx, defensaActual: DefensaRow, plan: PlanRow & { plan: NonNullable<PlanRow['plan']> }): Promise<DefensaRow> {
  let defensa = defensaActual;
  const turnos = await ctx.repo.turnosDeDefensa(defensa.id);
  if (turnos.some((t) => t.estado !== 'cerrado')) return defensa;

  const transcurridoMs = relojActivoMs(turnos);
  const decision = siguienteTurno({
    plan: plan.plan,
    semilla: defensa.semilla,
    duracion: defensa.duracion,
    historial: turnos.map(aTurnoPrevio),
    transcurridoMs,
    evitar: await candidatasDelEnsayo(ctx, defensa),
  });

  const ahora = ctx.ahora().toISOString();
  if (decision.accion === 'cerrar') {
    defensa = await ctx.repo.actualizarDefensa(defensa.id, {
      estado: 'por_revisar',
      terminadaEn: ahora,
      duracionActivaMs: transcurridoMs,
    });
    return defensa;
  }

  const { contexto, pregunta } = separarContexto(decision.turno.texto);
  try {
    const turno = await ctx.repo.crearTurno({
      defensaId: defensa.id,
      numero: turnos.length + 1,
      tipo: decision.turno.tipo,
      preguntaRef: decision.turno.ref,
      objetivoId: decision.turno.objetivoId,
      contextoTexto: contexto,
      preguntaTexto: pregunta,
      audioPreguntaRuta: audioDeTexto(plan, decision.turno.texto),
      preguntadoEn: ahora,
    });
    await ctx.eventos.emitir({
      verbo: 'completo_paso',
      evento: 'pregunta',
      pasoId: `pregunta-${turno.numero}`,
      actividadId: defensa.actividadId,
      actorId: defensa.alumnoId,
      clave: turno.id,
      medidas: {
        defensaId: defensa.id,
        turnoId: turno.id,
        numero: turno.numero,
        ref: turno.preguntaRef,
        tipo: turno.tipo,
        objetivoId: turno.objetivoId,
        semilla: defensa.semilla,
        esEnsayo: defensa.esEnsayo,
      },
    });
  } catch (error) {
    if (!(error instanceof DefensaError) || error.codigo !== 'ocupado') throw error;
  }
  return defensa;
}

// ── Iniciar ─────────────────────────────────────────────────────────────────

export async function iniciarDefensa(
  ctx: Ctx,
  sesion: SesionAlumno,
  opciones: { ensayo: boolean },
): Promise<RespuestaDefensa> {
  const { alumno, actividad } = sesion;
  const entrega = await entregaVigente(ctx, alumno.id);
  if (!entrega) throw new DefensaError('sin_entrega', 409);
  const plan = await ctx.repo.planDeEntrega(entrega.id);
  if (!plan || plan.estado !== 'listo' || !plan.plan) throw new DefensaError('plan_no_listo', 409);
  const planListo = plan as PlanRow & { plan: NonNullable<PlanRow['plan']> };

  // Retomar lo que ya hay: la defensa de verdad se hace una vez por versión del trabajo.
  const enCurso = await ctx.repo.defensaEnCurso(alumno.id, opciones.ensayo);
  if (enCurso && enCurso.entregaId === entrega.id) return { defensa: await estadoDeDefensa(ctx, enCurso) };

  if (!opciones.ensayo) {
    const previa = await ctx.repo.ultimaDefensa(alumno.id, false);
    if (previa && previa.entregaId === entrega.id && previa.estado !== 'abandonada') {
      return { defensa: await estadoDeDefensa(ctx, previa) };
    }
  }

  const ahora = ctx.ahora();
  let defensa: DefensaRow;
  try {
    defensa = await ctx.repo.crearDefensa({
      alumnoId: alumno.id,
      actividadId: actividad.id,
      entregaId: entrega.id,
      planId: plan.id,
      esEnsayo: opciones.ensayo,
      semilla: generarSemilla(),
      duracion: actividad.duracion,
      dispositivo: alumno.dispositivo,
      tardia: ahora.getTime() > Date.parse(actividad.fechaLimite),
      iniciadaEn: ahora.toISOString(),
    });
  } catch (error) {
    // Dos toques seguidos en "Empezar": la segunda solicitud encuentra la defensa de la primera.
    if (error instanceof DefensaError && error.codigo === 'ocupado') {
      const existente = await ctx.repo.defensaEnCurso(alumno.id, opciones.ensayo);
      if (existente) return { defensa: await estadoDeDefensa(ctx, existente) };
    }
    throw error;
  }

  await ctx.eventos.emitir({
    verbo: 'inicio_taller',
    evento: 'defensa_inicio',
    pasoId: opciones.ensayo ? 'ensayo' : 'defensa',
    actividadId: actividad.id,
    actorId: alumno.id,
    clave: defensa.id,
    medidas: {
      defensaId: defensa.id,
      entregaId: entrega.id,
      esEnsayo: opciones.ensayo,
      semilla: defensa.semilla,
      duracion: defensa.duracion,
      dispositivo: defensa.dispositivo,
      modo: alumno.modoPreferido,
      tardia: defensa.tardia,
    },
  });
  await avanzar(ctx, defensa, planListo);
  return { defensa: await estadoDeDefensa(ctx, (await ctx.repo.defensaPorId(defensa.id)) ?? defensa) };
}

export async function estadoDeUnaDefensa(ctx: Ctx, sesion: SesionAlumno, defensaId: string): Promise<RespuestaDefensa> {
  return { defensa: await estadoDeDefensa(ctx, await cargarDefensa(ctx, sesion, defensaId)) };
}

// ── Audio por partes ────────────────────────────────────────────────────────

/** Índice de una parte dentro de la tabla: la fase y el intento de grabación van dentro. */
export function indiceDeParte(fase: Fase, intento: number, parte: number): number {
  return ((fase === 'aclaracion' ? 100 : 0) + intento) * 1000 + parte;
}

function exigirEntero(valor: unknown, minimo: number, maximo: number): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < minimo || valor > maximo) {
    throw new DefensaError('solicitud_invalida', 400);
  }
  return valor;
}

export async function subirParteAudio(
  ctx: Ctx,
  sesion: SesionAlumno,
  turnoId: string,
  datos: { intento: number; parte: number; bytes: Uint8Array },
): Promise<void> {
  const intento = exigirEntero(datos.intento, 0, MAX_INTENTOS_GRABACION);
  const parte = exigirEntero(datos.parte, 0, MAX_PARTES_POR_RESPUESTA - 1);
  if (datos.bytes.byteLength === 0) throw new DefensaError('solicitud_invalida', 400);
  if (datos.bytes.byteLength > LIMITES.parteAudioBytes) throw new DefensaError('demasiado_grande', 413);

  const { turno, defensa } = await cargarTurno(ctx, sesion, turnoId);
  if (defensa.estado !== 'en_curso') throw estadoInvalido();
  let fase: Fase;
  if (turno.estado === 'esperando' || turno.estado === 'procesando') fase = 'respuesta';
  else if (turno.estado === 'aclarando') fase = 'aclaracion';
  else throw estadoInvalido();

  const indice = indiceDeParte(fase, intento, parte);
  const ruta = `${defensa.id}/${turno.id}/${indice}.parte`;
  await ctx.archivos.subir('audio', ruta, datos.bytes, 'application/octet-stream');
  await ctx.repo.registrarParteAudio(turno.id, indice, ruta, datos.bytes.byteLength, ctx.ahora().toISOString());
}

function mimeSeguro(mime: string | undefined): string {
  const valor = (mime ?? '').toLowerCase().trim();
  return /^audio\/(webm|mp4|ogg|mpeg|wav|x-wav)(;[\w=.,\s-]*)?$/.test(valor) ? valor : 'audio/webm';
}

function extensionDeAudio(mime: string): string {
  if (mime.startsWith('audio/webm')) return 'webm';
  if (mime.startsWith('audio/mp4')) return 'm4a';
  if (mime.startsWith('audio/ogg')) return 'ogg';
  if (mime.startsWith('audio/mpeg')) return 'mp3';
  if (mime.startsWith('audio/wav') || mime.startsWith('audio/x-wav')) return 'wav';
  return 'bin';
}

interface AudioEnsamblado {
  bytes: Uint8Array;
  partes: ParteAudioRow[];
}

/** Junta las partes de una grabación, en orden. Si falta alguna, dice cuáles para que el navegador las reenvíe. */
async function ensamblarAudio(
  ctx: Ctx,
  turno: TurnoRow,
  fase: Fase,
  intento: number,
  totalPartes: number,
): Promise<AudioEnsamblado> {
  if (totalPartes < 1) throw new DefensaError('transcripcion_fallo', 422);
  const registradas = await ctx.repo.partesAudio(turno.id);
  const porIndice = new Map(registradas.map((p) => [p.indice, p]));

  const faltan: number[] = [];
  const elegidas: ParteAudioRow[] = [];
  for (let i = 0; i < totalPartes; i += 1) {
    const parte = porIndice.get(indiceDeParte(fase, intento, i));
    if (parte) elegidas.push(parte);
    else faltan.push(i);
  }
  if (faltan.length > 0) throw new DefensaError('partes_faltantes', 409, { faltan: faltan.slice(0, 50) });

  const trozos: Uint8Array[] = [];
  let total = 0;
  for (const parte of elegidas) {
    const datos = await ctx.archivos.descargar('audio', parte.ruta);
    if (!datos) throw new DefensaError('partes_faltantes', 409, { faltan: [elegidas.indexOf(parte)] });
    total += datos.byteLength;
    if (total > LIMITES.audioRespuestaBytes) throw new DefensaError('demasiado_grande', 413);
    trozos.push(datos);
  }
  const bytes = new Uint8Array(total);
  let desplazamiento = 0;
  for (const trozo of trozos) {
    bytes.set(trozo, desplazamiento);
    desplazamiento += trozo.byteLength;
  }
  return { bytes, partes: registradas };
}

async function borrarPartes(ctx: Ctx, partes: readonly ParteAudioRow[]): Promise<void> {
  if (partes.length === 0) return;
  try {
    await ctx.archivos.borrar('audio', partes.map((p) => p.ruta));
  } catch {
    // Quedan para el borrado de los siete días.
  }
}

// ── Responder ───────────────────────────────────────────────────────────────

export async function responderTurno(
  ctx: Ctx,
  sesion: SesionAlumno,
  turnoId: string,
  peticion: PeticionResponder,
): Promise<RespuestaDefensa> {
  const { turno: inicial, defensa } = await cargarTurno(ctx, sesion, turnoId);
  const plan = await cargarPlan(ctx, defensa);

  // Reintento de algo que ya se procesó: no se hace dos veces, solo se devuelve cómo quedó.
  if (inicial.estado === 'cerrado' || inicial.estado === 'aclarando') {
    return { defensa: await estadoDeDefensa(ctx, defensa) };
  }
  if (defensa.estado !== 'en_curso') throw estadoInvalido();
  const ahora = ctx.ahora();
  if (inicial.estado === 'procesando') {
    const edad = ahora.getTime() - Date.parse(inicial.respondidoEn ?? inicial.preguntadoEn);
    if (edad < PROCESANDO_OBSOLETO_MS) throw new DefensaError('ocupado', 409);
  }
  const modo: ModoRespuesta = peticion.modo === 'voz' ? 'voz' : 'escrito';

  await ctx.repo.actualizarTurno(inicial.id, { estado: 'procesando', respondidoEn: ahora.toISOString() });
  // Si algo falla a medias el alumno puede reintentar o escribir; pero un turno que ya se cerró
  // (o pasó a aclaración) no vuelve atrás, porque ahí la respuesta ya está guardada.
  const volverAEsperar = async () => {
    const actual = await ctx.repo.turnoPorId(inicial.id).catch(() => null);
    if (actual?.estado === 'procesando') {
      await ctx.repo.actualizarTurno(inicial.id, { estado: 'esperando', respondidoEn: null }).catch(() => undefined);
    }
  };

  try {
    let texto: string;
    let palabras: PalabraTranscrita[] | null = null;
    let audioRuta: string | null = null;
    let audioMime: string | null = null;
    let duracionAudioMs: number | null = null;

    if (modo === 'escrito') {
      texto = limpiarTexto(peticion.texto ?? '', LIMITES.respuestaCaracteres);
    } else {
      const intento = exigirEntero(peticion.intento ?? 0, 0, MAX_INTENTOS_GRABACION);
      const total = exigirEntero(peticion.totalPartes ?? 0, 0, MAX_PARTES_POR_RESPUESTA);
      const { bytes, partes } = await ensamblarAudio(ctx, inicial, 'respuesta', intento, total);
      audioMime = mimeSeguro(peticion.mime);
      audioRuta = `${defensa.id}/${inicial.id}/respuesta.${extensionDeAudio(audioMime)}`;
      await ctx.archivos.subir('audio', audioRuta, bytes, audioMime);

      let transcripcion;
      try {
        transcripcion = await ctx.proveedores.stt.transcribir(bytes, audioMime, {
          idioma: config.idiomaStt(),
          timeoutMs: TIMEOUT_TRANSCRIPCION_MS,
        });
      } catch {
        // El alumno no repite nada: el audio ya está guardado y puede reintentar o escribir.
        throw new DefensaError('transcripcion_fallo', 502);
      }
      // Las partes se borran hasta que la transcripción sale bien: si el proveedor falla, el reintento las necesita.
      await borrarPartes(ctx, partes);
      palabras = transcripcion.palabras;
      texto = textoDe(palabras);
      duracionAudioMs = transcripcion.duracionMs;
    }

    // Clase de la respuesta. La apertura no se evalúa.
    const pregunta = buscarPregunta(plan.plan, inicial.preguntaRef);
    let clase = null as TurnoRow['clase'];
    let claseFuente = null as TurnoRow['claseFuente'];
    if (inicial.tipo !== 'apertura') {
      const clasificada = await clasificarRespuesta(ctx.proveedores.llm, {
        pregunta: `${inicial.contextoTexto} ${inicial.preguntaTexto}`.trim(),
        evidencia: pregunta?.evidencia ?? null,
        respuesta: texto,
      });
      clase = clasificada.clase;
      claseFuente = clasificada.fuente;
    }

    // ¿Hay una parte del audio que no se entendió? Solo en voz, en preguntas que se evalúan,
    // y como mucho una por respuesta.
    const hueco =
      modo === 'voz' && palabras && inicial.tipo !== 'apertura' && clase !== 'sin_respuesta'
        ? elegirHueco(palabras, config.umbralConfianza())
        : null;

    const parche = {
      modoRespuesta: modo,
      textoRespuesta: texto,
      transcripcion: palabras,
      clase,
      claseFuente,
      audioRuta,
      audioMime,
      duracionAudioMs,
      duracionRespuestaMs: Math.round(entre(peticion.duracionMs ?? 0, 0, 20 * 60_000)),
      silencios: Math.max(inicial.silencios, Math.round(entre(peticion.silencios ?? 0, 0, 200))),
      repeticiones: Math.max(inicial.repeticiones, Math.round(entre(peticion.repeticiones ?? 0, 0, 200))),
      respondidoEn: ctx.ahora().toISOString(),
    };

    if (hueco) {
      await ctx.repo.actualizarTurno(inicial.id, {
        ...parche,
        estado: 'aclarando',
        aclaracion: {
          estado: 'pendiente',
          indiceInicio: hueco.indiceInicio,
          indiceFin: hueco.indiceFin,
          inicioMs: hueco.inicioMs,
          finMs: hueco.finMs,
          antes: hueco.antes,
          despues: hueco.despues,
        },
      });
      return { defensa: await estadoDeDefensa(ctx, defensa) };
    }

    const cerrado = await ctx.repo.actualizarTurno(inicial.id, { ...parche, estado: 'cerrado' });
    return await cerrarTurnoYAvanzar(ctx, defensa, plan, cerrado);
  } catch (error) {
    await volverAEsperar();
    throw error;
  }
}

/** Registra la respuesta como evento, avanza el motor y devuelve el estado nuevo. */
async function cerrarTurnoYAvanzar(
  ctx: Ctx,
  defensa: DefensaRow,
  plan: PlanRow & { plan: NonNullable<PlanRow['plan']> },
  turno: TurnoRow,
): Promise<RespuestaDefensa> {
  await ctx.eventos.emitir({
    verbo: 'envio_respuesta',
    evento: 'respuesta',
    pasoId: `pregunta-${turno.numero}`,
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: turno.id,
    medidas: {
      defensaId: defensa.id,
      turnoId: turno.id,
      numero: turno.numero,
      ref: turno.preguntaRef,
      tipo: turno.tipo,
      objetivoId: turno.objetivoId,
      fase: defensa.esEnsayo ? 'practica' : 'defensa',
      modo: turno.modoRespuesta,
      clase: turno.clase,
      claseFuente: turno.claseFuente,
      palabras: (turno.textoRespuesta ?? '').trim().split(/\s+/).filter(Boolean).length,
      duracionRespuestaMs: turno.duracionRespuestaMs,
      duracionAudioMs: turno.duracionAudioMs,
      silencios: turno.silencios,
      repeticiones: turno.repeticiones,
      aclaracion: turno.aclaracion?.estado ?? 'ninguna',
      aclaracionMs: turno.aclaracion?.duracionMs ?? 0,
    },
  });
  const actual = (await ctx.repo.defensaPorId(defensa.id)) ?? defensa;
  const despues = await avanzar(ctx, actual, plan);
  return { defensa: await estadoDeDefensa(ctx, despues) };
}

// ── Aclaración puntual ──────────────────────────────────────────────────────

export async function resolverAclaracion(
  ctx: Ctx,
  sesion: SesionAlumno,
  turnoId: string,
  peticion: PeticionAclarar,
): Promise<RespuestaDefensa> {
  const { turno, defensa } = await cargarTurno(ctx, sesion, turnoId);
  if (turno.estado === 'cerrado') return { defensa: await estadoDeDefensa(ctx, defensa) };
  if (defensa.estado !== 'en_curso' || turno.estado !== 'aclarando' || !turno.aclaracion || !turno.transcripcion) {
    throw estadoInvalido();
  }
  const plan = await cargarPlan(ctx, defensa);
  const aclaracion = turno.aclaracion;
  const ahora = ctx.ahora();
  const modo: ModoRespuesta = peticion.modo === 'voz' ? 'voz' : 'escrito';

  // Lo que el alumno puso en el hueco: nada si sigue sin entenderse, y la IA nunca lo inventa.
  let relleno: string | null = null;
  if (modo === 'escrito') {
    const escrito = limpiarTexto(peticion.texto ?? '', LIMITES.aclaracionCaracteres).replace(/\s+/g, ' ');
    relleno = escrito.length > 0 ? escrito : null;
  } else {
    const intento = exigirEntero(peticion.intento ?? 0, 0, MAX_INTENTOS_GRABACION);
    const total = exigirEntero(peticion.totalPartes ?? 0, 0, MAX_PARTES_POR_RESPUESTA);
    const { bytes, partes } = await ensamblarAudio(ctx, turno, 'aclaracion', intento, total);
    const mime = mimeSeguro(peticion.mime);
    try {
      const transcripcion = await ctx.proveedores.stt.transcribir(bytes, mime, {
        idioma: config.idiomaStt(),
        timeoutMs: TIMEOUT_TRANSCRIPCION_MS,
      });
      const confianzaMedia =
        transcripcion.palabras.reduce((suma, p) => suma + p.confianza, 0) / Math.max(1, transcripcion.palabras.length);
      relleno = transcripcion.palabras.length > 0 && confianzaMedia >= config.umbralConfianza() ? textoDe(transcripcion.palabras) : null;
    } catch {
      throw new DefensaError('transcripcion_fallo', 502);
    }
    await borrarPartes(ctx, partes);
  }

  const palabras = aplicarRelleno(turno.transcripcion, aclaracion, relleno);
  const textoFinal = textoDe(palabras);
  const pausaMs = Math.max(0, ahora.getTime() - Date.parse(turno.respondidoEn ?? turno.preguntadoEn));

  // Con el hueco lleno la respuesta puede cambiar de clase; si la clasificación falla se queda la anterior.
  let clase = turno.clase;
  let claseFuente = turno.claseFuente;
  if (relleno !== null && turno.clase !== null && turno.tipo !== 'apertura') {
    const pregunta = buscarPregunta(plan.plan, turno.preguntaRef);
    const nueva = await clasificarRespuesta(ctx.proveedores.llm, {
      pregunta: `${turno.contextoTexto} ${turno.preguntaTexto}`.trim(),
      evidencia: pregunta?.evidencia ?? null,
      respuesta: textoFinal,
    });
    clase = nueva.clase;
    claseFuente = nueva.fuente;
  }

  const cerrado = await ctx.repo.actualizarTurno(turno.id, {
    estado: 'cerrado',
    textoRespuesta: textoFinal,
    transcripcion: palabras,
    clase,
    claseFuente,
    aclaracion: {
      ...aclaracion,
      estado: relleno !== null ? 'aclarada' : 'no_entendido',
      modo,
      ...(relleno !== null ? { texto: relleno } : {}),
      duracionMs: pausaMs,
    },
  });
  await ctx.repo.actualizarDefensa(defensa.id, { aclaracionMs: defensa.aclaracionMs + pausaMs });
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'aclaracion',
    pasoId: `aclaracion-${turno.numero}`,
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: turno.id,
    medidas: {
      defensaId: defensa.id,
      turnoId: turno.id,
      numero: turno.numero,
      modo,
      resultado: relleno !== null ? 'aclarada' : 'no_entendido',
      palabrasDelHueco: aclaracion.indiceFin - aclaracion.indiceInicio + 1,
      pausaMs,
    },
  });
  const actual = (await ctx.repo.defensaPorId(defensa.id)) ?? defensa;
  return cerrarTurnoYAvanzar(ctx, actual, plan, cerrado);
}

// ── Repetir y silencios ─────────────────────────────────────────────────────

export async function marcarTurno(
  ctx: Ctx,
  sesion: SesionAlumno,
  turnoId: string,
  tipo: 'repeticion' | 'silencio',
): Promise<void> {
  const { turno, defensa } = await cargarTurno(ctx, sesion, turnoId);
  if (defensa.estado !== 'en_curso' || turno.estado === 'cerrado') return;
  await ctx.repo.actualizarTurno(turno.id, tipo === 'repeticion' ? { repeticiones: turno.repeticiones + 1 } : { silencios: turno.silencios + 1 });
}

// ── Revisar y entregar ──────────────────────────────────────────────────────

function resumenDePractica(actividad: ActividadRow, turnos: readonly TurnoRow[]): ResumenPracticaCliente[] {
  return actividad.objetivos.flatMap((objetivo) => {
    const propios = turnos.filter((t) => t.objetivoId === objetivo.id && t.tipo !== 'apertura' && t.estado === 'cerrado');
    if (propios.length === 0) return [];
    const logrado = propios.some((t) => t.clase === 'solida');
    return [{ objetivoId: objetivo.id, texto: objetivo.text, resultado: logrado ? ('explico' as const) : ('dudo' as const) }];
  });
}

export interface ResultadoEntrega extends RespuestaDefensa {
  /** Id de la defensa cuando hay que generar su reporte (solo la defensa real). */
  generarReporteDe: string | null;
}

export async function entregarDefensa(
  ctx: Ctx,
  sesion: SesionAlumno,
  defensaId: string,
  marcas: ReadonlyArray<{ turnoId: string; linea: string }>,
): Promise<ResultadoEntrega> {
  const defensa = await cargarDefensa(ctx, sesion, defensaId);
  const plan = await ctx.repo.planPorId(defensa.planId);
  if (!plan) throw new DefensaError('plan_no_listo', 409);
  const turnos = await ctx.repo.turnosDeDefensa(defensa.id);

  if (defensa.estado === 'entregada') {
    return { defensa: await aDefensaCliente(ctx, defensa, plan, turnos), generarReporteDe: null, ...(defensa.esEnsayo ? { resumenPractica: resumenDePractica(sesion.actividad, turnos) } : {}) };
  }
  if (defensa.estado !== 'por_revisar') throw estadoInvalido();

  // Solo cuentan las marcas de líneas que de verdad existen en esta defensa.
  const lineasValidas = new Set(
    turnos.flatMap((t) => construirLineas(t.id, t.transcripcion ?? []).map((l) => `${t.id}|${l.id}`)),
  );
  const marcasValidas: MarcaRevision[] = [];
  for (const marca of marcas) {
    if (!lineasValidas.has(`${marca.turnoId}|${marca.linea}`)) continue;
    if (!marcasValidas.some((m) => m.turnoId === marca.turnoId && m.linea === marca.linea)) marcasValidas.push({ ...marca });
  }

  const ahora = ctx.ahora().toISOString();
  const entregada = await ctx.repo.actualizarDefensa(defensa.id, { estado: 'entregada', entregadaEn: ahora, marcasRevision: marcasValidas });
  await ctx.eventos.emitir({
    verbo: 'taller_completado',
    evento: 'defensa_fin',
    pasoId: defensa.esEnsayo ? 'ensayo' : 'defensa',
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: defensa.id,
    medidas: {
      defensaId: defensa.id,
      esEnsayo: defensa.esEnsayo,
      estado: 'entregada',
      preguntas: turnos.length,
      respondidas: turnos.filter((t) => t.modoRespuesta !== null).length,
      duracionActivaMs: defensa.duracionActivaMs,
      aclaracionMs: defensa.aclaracionMs,
      aclaraciones: turnos.filter((t) => t.aclaracion !== null).length,
      marcas: marcasValidas.length,
      porEscrito: turnos.filter((t) => t.modoRespuesta === 'escrito').length,
      tardia: defensa.tardia,
    },
  });

  return {
    defensa: await aDefensaCliente(ctx, entregada, plan, turnos),
    generarReporteDe: defensa.esEnsayo ? null : defensa.id,
    ...(defensa.esEnsayo ? { resumenPractica: resumenDePractica(sesion.actividad, turnos) } : {}),
  };
}

export async function registrarEstres(ctx: Ctx, sesion: SesionAlumno, defensaId: string, nivel: number): Promise<void> {
  const defensa = await cargarDefensa(ctx, sesion, defensaId);
  const valor = exigirEntero(nivel, 0, 4);
  if (defensa.estado !== 'entregada') throw estadoInvalido();
  await ctx.repo.actualizarDefensa(defensa.id, { nivelEstres: valor, estresEn: ctx.ahora().toISOString() });
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'estres',
    pasoId: 'estres',
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: defensa.id,
    medidas: { defensaId: defensa.id, esEnsayo: defensa.esEnsayo, nivel: valor },
  });
}

/** El alumno salió de la defensa: se mide, pero la defensa queda abierta para retomarla en el mismo turno. */
export async function registrarSalida(ctx: Ctx, sesion: SesionAlumno, defensaId: string): Promise<void> {
  const defensa = await cargarDefensa(ctx, sesion, defensaId);
  if (defensa.estado !== 'en_curso') return;
  const turnos = await ctx.repo.turnosDeDefensa(defensa.id);
  await ctx.eventos.emitir({
    verbo: 'abandono_taller',
    evento: 'abandono',
    pasoId: defensa.esEnsayo ? 'ensayo' : 'defensa',
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: `${defensa.id}:salio:${ctx.ahora().getTime()}`,
    medidas: { defensaId: defensa.id, esEnsayo: defensa.esEnsayo, motivo: 'salio', respondidas: turnosCerrados(turnos).length },
  });
}

/**
 * Cierra una defensa en curso que nadie toca hace tiempo. Si ya había respuestas
 * queda "incompleta" y así la ve el profesor; si no, "abandonada".
 */
export async function cerrarPorInactividad(ctx: Ctx, defensa: DefensaRow): Promise<DefensaRow> {
  const turnos = await ctx.repo.turnosDeDefensa(defensa.id);
  const respondidas = turnos.filter((t) => t.modoRespuesta !== null).length;
  const estado = respondidas > 0 ? 'incompleta' : 'abandonada';
  const cerrada = await ctx.repo.actualizarDefensa(defensa.id, {
    estado,
    terminadaEn: ctx.ahora().toISOString(),
    duracionActivaMs: relojActivoMs(turnos),
  });
  await ctx.eventos.emitir({
    verbo: 'abandono_taller',
    evento: 'abandono',
    pasoId: defensa.esEnsayo ? 'ensayo' : 'defensa',
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: `${defensa.id}:inactividad`,
    medidas: { defensaId: defensa.id, esEnsayo: defensa.esEnsayo, motivo: 'inactividad', respondidas, estado },
  });
  return cerrada;
}

/** Última actividad de una defensa: la más reciente entre sus preguntas y sus respuestas. */
export function ultimaActividad(defensa: DefensaRow, turnos: readonly TurnoRow[]): number {
  return turnos.reduce(
    (maximo, t) => Math.max(maximo, Date.parse(t.preguntadoEn), t.respondidoEn ? Date.parse(t.respondidoEn) : 0),
    Date.parse(defensa.iniciadaEn),
  );
}

