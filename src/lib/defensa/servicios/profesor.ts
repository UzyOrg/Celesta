import 'server-only';
import { zipSync } from 'fflate';
import type {
  PeticionAudioParte,
  PeticionDescarga,
  PeticionTiempoRevision,
  PeticionToque,
  RespuestaAudioParte,
  RespuestaDescarga,
} from '../../../components/defensa/contrato';
import type { PreguntaDefensa } from '../../../components/defensa/types';
import { alumnosEnEstado, colaDeRevision, ordenarAlumnos } from '../../../components/revision/derivados';
import { marcaCorta, marcaDeFecha } from '../../../components/revision/fechas';
import type {
  Alumno,
  BloqueReporte,
  DatosGrupo,
  DatosReporte,
  EvidenciaObjetivo,
  FragmentoReporte,
  LineaReporte,
  Objetivo,
  ParteParaOir,
  ReporteAlumno,
  RespuestaReporte,
  TurnoAdicionalReporte,
} from '../../../components/revision/types';
import type {
  ActividadRow,
  AlumnoConEstado,
  DefensaRow,
  EntregaRow,
  ReporteRow,
  TurnoRow,
} from '../almacen/tipos';
import { LIMITES } from '../config';
import { DefensaError, noEncontrado } from '../errores';
import type { NivelReporte } from '../reporte';
import { construirLineas, type LineaTranscrita } from '../transcripcion';
import type { Ctx } from './contexto';
import { extensionDe, nombreSeguro } from './entregas';

/**
 * Lo que ve el profesor, armado con datos reales y con la misma forma que usa su
 * interfaz (components/revision/types.ts): el grupo, el reporte de un alumno, las
 * descargas con enlaces que caducan, los dos toques por reporte y el tiempo que
 * pasa leyéndolo.
 *
 * El profesor no ve el ensayo, ni nada que el alumno todavía no entregó. Y nada de
 * lo que sale de aquí lleva notas, porcentajes ni sospechas.
 */

const DEFENSA_VISIBLE: ReadonlyArray<DefensaRow['estado']> = ['entregada', 'incompleta'];
const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_REVISION_ACTIVA_MS = 4 * 60 * 60 * 1000;
const RELLENO_PARTE_MS = 300;

// ── Pequeñas ayudas ─────────────────────────────────────────────────────────

const SIN_MARCAS = new RegExp('[\\u0300-\\u036f]', 'g');

export function aSlug(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(SIN_MARCAS, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'sin-nombre'
  );
}

export function inicialesDe(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

/** "Ana Torres Ruiz" → primer nombre "Ana", nombre corto "Ana Torres". No se adivina nada más. */
function partesDeNombre(nombre: string): { primerNombre: string; nombreCorto: string } {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  return { primerNombre: palabras[0] ?? nombre, nombreCorto: palabras.slice(0, 2).join(' ') || nombre };
}

function minutosYSegundos(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return minutos > 0 ? `${minutos} min ${segundos} s` : `${segundos} s`;
}

function duracionCorta(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function semillaDe(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 9973;
  return (h % 12) + 3;
}

const NIVEL_A_UI: Readonly<Record<NivelReporte, EvidenciaObjetivo>> = {
  explico: 'explico',
  en_parte: 'en-parte',
  no_salio: 'no-salio',
  sin_evidencia: null,
};

function recortar(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1).trimEnd()}…`;
}

export function objetivosParaUi(actividad: ActividadRow): Objetivo[] {
  return actividad.objetivos.slice(0, 3).map((objetivo, indice) => {
    const numero = (indice + 1) as 1 | 2 | 3;
    return {
      id: numero,
      texto: objetivo.text,
      corto: objetivo.corto ?? recortar(objetivo.text, 34),
      alias: objetivo.alias ?? `Objetivo ${numero}`,
      tema: objetivo.tema ?? `el objetivo ${numero}`,
    };
  });
}

function reporteListo(fila: AlumnoConEstado | null, defensa: DefensaRow | null): ReporteRow | null {
  if (!fila || !defensa) return null;
  const reporte = fila.reportes.find((r) => r.defensaId === defensa.id);
  return reporte && reporte.estado === 'listo' && reporte.reporte ? reporte : null;
}

function defensaVisible(fila: AlumnoConEstado): DefensaRow | null {
  const visibles = fila.defensas.filter((d) => DEFENSA_VISIBLE.includes(d.estado));
  return visibles[visibles.length - 1] ?? null;
}

function entregaListaMasReciente(fila: AlumnoConEstado): EntregaRow | null {
  const listas = fila.entregas.filter((e) => e.estado === 'lista');
  return listas[listas.length - 1] ?? null;
}

// ── Partes para oír ─────────────────────────────────────────────────────────

/** Un turno con algo que el profesor querrá oír: una frase que el alumno marcó o una parte que aclaró. */
function parteDeTurno(
  turno: TurnoRow,
  defensa: DefensaRow,
  primerNombre: string,
): { parte: ParteParaOir; lineas: LineaTranscrita[] } | null {
  if (defensa.audioBorradoEn !== null || turno.modoRespuesta !== 'voz' || !turno.audioRuta) return null;
  const lineas = construirLineas(turno.id, turno.transcripcion ?? []);

  const marcada = lineas.find((l) => defensa.marcasRevision.some((m) => m.turnoId === turno.id && m.linea === l.id));
  if (marcada) {
    const desde = Math.max(0, marcada.inicioMs - RELLENO_PARTE_MS);
    const hasta = marcada.finMs + RELLENO_PARTE_MS;
    return {
      lineas,
      parte: {
        id: 'marcada',
        turnoId: turno.id,
        desdeMs: desde,
        hastaMs: hasta,
        descripcion: `${primerNombre} marcó que no lo dijo así. Oye el original.`,
        etiquetaBoton: `Oír la frase que ${primerNombre} marcó`,
        milisegundos: hasta - desde,
        duracion: duracionCorta(hasta - desde),
        semilla: semillaDe(turno.id),
      },
    };
  }

  const a = turno.aclaracion;
  if (a && a.estado !== 'pendiente') {
    const desde = Math.max(0, a.inicioMs - RELLENO_PARTE_MS);
    const hasta = a.finMs + RELLENO_PARTE_MS;
    return {
      lineas,
      parte: {
        id: 'aclarada',
        turnoId: turno.id,
        desdeMs: desde,
        hastaMs: hasta,
        descripcion:
          a.estado === 'aclarada'
            ? `Al grabar no se entendió esta parte; ${primerNombre} la completó. Oye el original.`
            : 'Al grabar no se entendió esta parte y quedó sin completar. Oye el original.',
        etiquetaBoton: 'Oír la parte aclarada',
        milisegundos: hasta - desde,
        duracion: duracionCorta(hasta - desde),
        semilla: semillaDe(turno.id),
      },
    };
  }
  return null;
}

/** La pregunta principal de un objetivo: su candidata o, si no hubo, la transferencia que lo toca. */
function turnoPrincipal(turnos: readonly TurnoRow[], objetivoId: string): TurnoRow | null {
  const propios = turnos.filter((t) => t.objetivoId === objetivoId && t.tipo !== 'apertura');
  return propios.find((t) => t.tipo === 'candidata') ?? propios.find((t) => t.tipo === 'transferencia') ?? null;
}

function cuentaPartesParaOir(actividad: ActividadRow, defensa: DefensaRow, turnos: readonly TurnoRow[], primerNombre: string): number {
  return actividad.objetivos.reduce((cuenta, objetivo) => {
    const principal = turnoPrincipal(turnos, objetivo.id);
    return cuenta + (principal && parteDeTurno(principal, defensa, primerNombre) ? 1 : 0);
  }, 0);
}

// ── El grupo ────────────────────────────────────────────────────────────────

function alumnoParaUi(
  fila: AlumnoConEstado,
  actividad: ActividadRow,
  turnosDeDefensas: ReadonlyMap<string, TurnoRow[]>,
): Alumno {
  const { alumno } = fila;
  const { primerNombre, nombreCorto } = partesDeNombre(alumno.nombre);
  const defensa = defensaVisible(fila);
  const entrega = entregaListaMasReciente(fila);
  const reporte = reporteListo(fila, defensa);
  const turnos = defensa ? (turnosDeDefensas.get(defensa.id) ?? []) : [];
  const marcas = defensa?.marcasRevision.length ?? 0;
  const cuando = defensa ? (defensa.entregadaEn ?? defensa.terminadaEn ?? defensa.iniciadaEn) : null;

  const evidencia: EvidenciaObjetivo[] = reporte?.reporte
    ? actividad.objetivos.map((o) => {
        const encontrado = reporte.reporte?.objetivos.find((r) => r.objetivoId === o.id);
        return encontrado ? NIVEL_A_UI[encontrado.nivel] : null;
      })
    : [];

  return {
    matricula: alumno.matricula,
    defensaId: defensa?.id,
    entregaId: entrega?.id,
    nombreRegistro: alumno.nombre,
    nombre: alumno.nombre,
    primerNombre,
    nombreCorto,
    iniciales: inicialesDe(alumno.nombre),
    entrega: entrega ? marcaDeFecha(new Date(entrega.listaEn ?? entrega.creadaEn)) : null,
    defensa: cuando ? marcaDeFecha(new Date(cuando)) : null,
    evidencia,
    partesParaOir: defensa ? cuentaPartesParaOir(actividad, defensa, turnos, primerNombre) : 0,
    revisado: defensa !== null && fila.toques.some((t) => t.defensaId === defensa.id && t.tipo === 'despues'),
    entregaTardia: entrega?.tardia ?? false,
    defensaTardia: defensa?.tardia ?? false,
    defensaIncompleta: defensa?.estado === 'incompleta',
    subioOtraVersion: fila.entregas.filter((e) => e.estado === 'lista').length > 1,
    duracion: defensa && defensa.duracionActivaMs > 0 ? minutosYSegundos(defensa.duracionActivaMs) : null,
    revisoSuTranscripcion:
      defensa?.entregadaEn
        ? {
            hora: marcaDeFecha(new Date(defensa.entregadaEn)).hora,
            nota: marcas === 0 ? 'No marcó nada' : marcas === 1 ? 'Marcó una frase' : `Marcó ${marcas} frases`,
          }
        : null,
  };
}

export async function datosDelGrupo(ctx: Ctx, actividad: ActividadRow, tokenProfesor: string): Promise<DatosGrupo> {
  const filas = await ctx.repo.listarAlumnosDeActividad(actividad.id);
  const idsDefensas = filas.flatMap((f) => defensaVisible(f)?.id ?? []);
  const turnos = await ctx.repo.turnosDeDefensas(idsDefensas);
  const porDefensa = new Map<string, TurnoRow[]>();
  for (const turno of turnos) porDefensa.set(turno.defensaId, [...(porDefensa.get(turno.defensaId) ?? []), turno]);

  const alumnos = filas.map((fila) => alumnoParaUi(fila, actividad, porDefensa));
  const cierre = marcaDeFecha(new Date(actividad.fechaLimite));
  const bytes = filas.reduce((suma, f) => suma + (entregaListaMasReciente(f)?.bytes ?? 0), 0);

  return {
    conectado: true,
    profesora: {
      nombre: actividad.profesorNombre,
      primerNombre: partesDeNombre(actividad.profesorNombre).primerNombre,
      iniciales: inicialesDe(actividad.profesorNombre),
      rol: 'Docente',
    },
    actividad: {
      token: tokenProfesor,
      nombre: actividad.nombre,
      referencia: 'La actividad',
      curso: actividad.curso,
      grupo: actividad.grupo,
      cierre,
      cierreCorto: marcaCorta(cierre),
      objetivos: objetivosParaUi(actividad),
      totalAlumnos: alumnos.length,
    },
    alumnos,
    // Con datos reales no hay "el alumno de ejemplo": el primero de la cola de revisión, o el primero con defensa.
    alumnoBuscado:
      ordenarAlumnos('por-revisar', alumnosEnEstado(alumnos, 'por-revisar'))[0] ??
      alumnos.find((a) => a.defensa !== null) ??
      alumnos[0] ??
      sinAlumno(),
    otrasActividades: [],
    descarga: {
      archivo: `trabajos-${aSlug(actividad.grupo || actividad.nombre)}-${aSlug(actividad.nombre)}.zip`,
      megabytes: Math.max(1, Math.round(bytes / (1024 * 1024))),
    },
  };
}

function sinAlumno(): Alumno {
  return {
    matricula: '',
    nombreRegistro: '',
    nombre: 'Sin alumnos todavía',
    primerNombre: 'Alumno',
    nombreCorto: 'Sin alumnos',
    iniciales: '–',
    entrega: null,
    defensa: null,
    evidencia: [],
    partesParaOir: 0,
    revisado: false,
    entregaTardia: false,
    defensaTardia: false,
    defensaIncompleta: false,
    subioOtraVersion: false,
    duracion: null,
    revisoSuTranscripcion: null,
  };
}

// ── El reporte de un alumno ─────────────────────────────────────────────────

const ETIQUETA_DE_CLASE: Readonly<Record<NonNullable<TurnoRow['clase']>, string>> = {
  solida: 'Respuesta sólida',
  vaga: 'Respuesta vaga',
  fuera_de_tema: 'Respuesta fuera de tema',
  sin_respuesta: 'Sin respuesta',
};

function lineasParaProfesor(turno: TurnoRow, defensa: DefensaRow): LineaReporte[] {
  return construirLineas(turno.id, turno.transcripcion ?? []).map((linea) => {
    const marcada = defensa.marcasRevision.some((m) => m.turnoId === turno.id && m.linea === linea.id);
    const fragmentos: FragmentoReporte[] = linea.segmentos.map((segmento) => {
      if (segmento.aclarado) return { texto: segmento.texto, resalte: 'recuadro' as const };
      return marcada ? { texto: segmento.texto, resalte: 'subrayado' as const } : { texto: segmento.texto };
    });
    return { tiempo: linea.tiempo, fragmentos };
  });
}

function respuestaDeTurno(turno: TurnoRow, defensa: DefensaRow, primerNombre: string): RespuestaReporte {
  const modo = turno.modoRespuesta ?? 'escrito';
  const respuesta: RespuestaReporte = {
    modo,
    calidad: turno.clase ? ETIQUETA_DE_CLASE[turno.clase] : 'Respuesta',
  };
  if (modo === 'voz' && (turno.transcripcion?.length ?? 0) > 0) respuesta.lineas = lineasParaProfesor(turno, defensa);
  else respuesta.textoEscrito = turno.textoRespuesta ?? '';
  const parte = parteDeTurno(turno, defensa, primerNombre);
  if (parte) respuesta.parteParaOir = parte.parte;
  return respuesta;
}

function adicionalDeTurno(turno: TurnoRow, defensa: DefensaRow, primerNombre: string): TurnoAdicionalReporte {
  const base = respuestaDeTurno(turno, defensa, primerNombre);
  return {
    etiqueta: turno.tipo === 'transferencia' ? 'Transferencia' : 'Repregunta',
    pregunta: `${turno.contextoTexto} ${turno.preguntaTexto}`.trim(),
    modo: base.modo,
    calidad: base.calidad,
    ...(base.lineas ? { lineas: base.lineas } : {}),
    ...(base.textoEscrito !== undefined ? { textoEscrito: base.textoEscrito } : {}),
  };
}

function reporteParaUi(
  actividad: ActividadRow,
  alumno: Alumno,
  defensa: DefensaRow,
  turnos: readonly TurnoRow[],
  fila: ReporteRow | null,
): ReporteAlumno {
  const objetivos = objetivosParaUi(actividad);
  const bloques: BloqueReporte[] = actividad.objetivos.slice(0, 3).map((objetivo, indice): BloqueReporte => {
    const objetivoUi = objetivos[indice] as Objetivo;
    const numero = objetivoUi.id;
    const delObjetivo = turnos.filter((t) => t.objetivoId === objetivo.id && t.tipo !== 'apertura');
    const principal = delObjetivo.find((t) => t.tipo === 'candidata') ?? delObjetivo.find((t) => t.tipo === 'transferencia') ?? null;
    const evaluado = fila?.reporte?.objetivos.find((o) => o.objetivoId === objetivo.id) ?? null;
    const pregunta: PreguntaDefensa = {
      id: `p${numero}` as PreguntaDefensa['id'],
      numero,
      contexto: principal?.contextoTexto ?? '',
      pregunta: principal?.preguntaTexto ?? 'No se hizo una pregunta sobre este objetivo.',
    };

    const respondido = principal !== null && principal.modoRespuesta !== null && (principal.textoRespuesta ?? '').trim().length > 0;
    if (!principal || !respondido) {
      return {
        objetivo: objetivoUi,
        nivel: evaluado ? NIVEL_A_UI[evaluado.nivel] : null,
        pregunta,
        respuesta: null,
        mensajeSinRespuesta: principal ? 'No alcanzó a responder esta pregunta.' : 'No hubo pregunta sobre este objetivo en esta defensa.',
      };
    }

    const respuesta = respuestaDeTurno(principal, defensa, alumno.primerNombre);
    if (evaluado) {
      if (evaluado.faltante) respuesta.faltante = evaluado.faltante;
      if (evaluado.nivel !== 'explico' && evaluado.nivel !== 'sin_evidencia' && evaluado.razon) respuesta.analisis = evaluado.razon;
    }
    const adicionales = delObjetivo
      .filter((t) => t.id !== principal.id && t.modoRespuesta !== null && (t.textoRespuesta ?? '').trim().length > 0)
      .map((t) => adicionalDeTurno(t, defensa, alumno.primerNombre));
    if (adicionales.length > 0) respuesta.adicionales = adicionales;

    return { objetivo: objetivoUi, nivel: evaluado ? NIVEL_A_UI[evaluado.nivel] : null, pregunta, respuesta };
  });

  let aviso: string | undefined;
  if (!fila || fila.estado === 'generando') aviso = `El análisis de Celestea sobre la defensa de ${alumno.primerNombre} se está preparando. Mientras, puedes leer lo que respondió.`;
  else if (fila.estado === 'error') aviso = 'No se pudo preparar el análisis de Celestea. Aquí está lo que respondió, sin niveles.';
  else if (defensa.estado === 'incompleta') aviso = `La defensa de ${alumno.primerNombre} quedó incompleta; el reporte solo cubre lo que alcanzó a responder.`;

  return {
    matricula: alumno.matricula,
    completo: true,
    ...(fila?.reporte?.resumen ? { resumen: fila.reporte.resumen } : {}),
    ...(aviso ? { aviso } : {}),
    audioDisponible: defensa.audioBorradoEn === null,
    bloques,
  };
}

export async function datosDelReporte(
  ctx: Ctx,
  actividad: ActividadRow,
  tokenProfesor: string,
  matricula: string,
): Promise<DatosReporte | null> {
  const grupo = await datosDelGrupo(ctx, actividad, tokenProfesor);
  const alumno = grupo.alumnos.find((a) => a.matricula === matricula.trim().toUpperCase());
  if (!alumno || !alumno.defensa || !alumno.defensaId) return null;

  const [defensa, turnos, reporte] = await Promise.all([
    ctx.repo.defensaPorId(alumno.defensaId),
    ctx.repo.turnosDeDefensa(alumno.defensaId),
    ctx.repo.reporteDeDefensa(alumno.defensaId),
  ]);
  if (!defensa || defensa.actividadId !== actividad.id || defensa.esEnsayo) return null;

  return {
    defensaId: defensa.id,
    grupo,
    alumno,
    reporte: reporteParaUi(actividad, alumno, defensa, turnos, reporte),
    cola: colaDeRevision(grupo.alumnos, alumno.matricula),
  };
}

// ── Descargas ───────────────────────────────────────────────────────────────

function nombreDeDescarga(entrega: EntregaRow, alumno: { matricula: string; nombre: string }): string {
  const extension = entrega.tipo === 'texto' ? 'txt' : (extensionDe(entrega.nombreArchivo) ?? 'pdf');
  return `${alumno.matricula}-${aSlug(alumno.nombre)}-v${entrega.version}.${extension}`;
}

/** Un enlace que caduca para bajar un trabajo, o un zip con el último de cada alumno. */
export async function prepararDescarga(ctx: Ctx, actividad: ActividadRow, peticion: PeticionDescarga): Promise<RespuestaDescarga> {
  const filas = await ctx.repo.listarAlumnosDeActividad(actividad.id);
  const sinEntregar = filas.filter((f) => entregaListaMasReciente(f) === null).length;

  if (peticion.alcance === 'uno') {
    if (!peticion.entregaId) throw new DefensaError('solicitud_invalida', 400);
    const fila = filas.find((f) => f.entregas.some((e) => e.id === peticion.entregaId));
    const entrega = fila?.entregas.find((e) => e.id === peticion.entregaId);
    if (!fila || !entrega || entrega.estado !== 'lista') throw noEncontrado();
    const nombre = nombreDeDescarga(entrega, fila.alumno);
    const url = await ctx.archivos.urlFirmadaDescarga('trabajos', entrega.rutaOriginal, LIMITES.enlaceDescargaSegundos, { nombreDescarga: nombre });
    await emitirDescarga(ctx, actividad, 'uno', 1);
    return { url, nombre, cantidad: 1, sinEntregar };
  }

  const entregas = filas.flatMap((fila) => {
    const entrega = entregaListaMasReciente(fila);
    return entrega ? [{ fila, entrega }] : [];
  });
  if (entregas.length === 0) throw noEncontrado();
  if (entregas.reduce((suma, e) => suma + e.entrega.bytes, 0) > MAX_ZIP_BYTES) throw new DefensaError('demasiado_grande', 413);

  const archivos: Record<string, Uint8Array> = {};
  for (const { fila, entrega } of entregas) {
    const bytes = await ctx.archivos.descargar('trabajos', entrega.rutaOriginal);
    if (bytes) archivos[nombreDeDescarga(entrega, fila.alumno)] = bytes;
  }
  const cantidad = Object.keys(archivos).length;
  if (cantidad === 0) throw new DefensaError('archivo_no_llego', 409);

  // Los PDF y Word ya van comprimidos: se guardan tal cual.
  const zip = zipSync(archivos, { level: 0 });
  const nombre = `trabajos-${aSlug(actividad.grupo || actividad.nombre)}-${aSlug(actividad.nombre)}.zip`;
  const ruta = `zips/${actividad.id}_${ctx.ahora().getTime()}.zip`;
  await ctx.archivos.subir('trabajos', ruta, zip, 'application/zip');
  const url = await ctx.archivos.urlFirmadaDescarga('trabajos', ruta, LIMITES.enlaceDescargaSegundos, { nombreDescarga: nombreSeguro(nombre) });
  await emitirDescarga(ctx, actividad, 'todos', cantidad);
  return { url, nombre, cantidad, sinEntregar };
}

async function emitirDescarga(ctx: Ctx, actividad: ActividadRow, alcance: 'uno' | 'todos', cantidad: number): Promise<void> {
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'descarga',
    pasoId: 'descarga',
    actividadId: actividad.id,
    actorId: actividad.id,
    clave: `${actividad.id}:${ctx.ahora().getTime()}:${alcance}`,
    medidas: { alcance, cantidad },
  });
}

// ── Toques, tiempo de revisión, audio y enlace ──────────────────────────────

async function defensaDeLaActividad(ctx: Ctx, actividad: ActividadRow, defensaId: string): Promise<DefensaRow> {
  const defensa = await ctx.repo.defensaPorId(defensaId);
  if (!defensa || defensa.actividadId !== actividad.id || defensa.esEnsayo) throw noEncontrado();
  return defensa;
}

/** Los dos toques del profesor por reporte: "antes" (¿domina el tema?) y "después" (¿coincide?). */
export async function registrarToqueProfesor(ctx: Ctx, actividad: ActividadRow, peticion: PeticionToque): Promise<void> {
  const defensa = await defensaDeLaActividad(ctx, actividad, peticion.defensaId);
  if (peticion.tipo !== 'antes' && peticion.tipo !== 'despues') throw new DefensaError('solicitud_invalida', 400);
  if (!['si', 'parte', 'no', 'no_se'].includes(peticion.valor)) throw new DefensaError('solicitud_invalida', 400);
  await ctx.repo.registrarToque(defensa.id, peticion.tipo, peticion.valor, ctx.ahora().toISOString());
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'toque_profesor',
    pasoId: `toque-${peticion.tipo}`,
    actividadId: actividad.id,
    actorId: actividad.id,
    clave: `${defensa.id}:${peticion.tipo}:${ctx.ahora().getTime()}`,
    medidas: { defensaId: defensa.id, tipo: peticion.tipo, valor: peticion.valor },
  });
}

/** Cuánto tiempo activo pasa el profesor con un reporte abierto; el primer aviso abre la medición y devuelve su id. */
export async function registrarTiempoRevision(
  ctx: Ctx,
  actividad: ActividadRow,
  peticion: PeticionTiempoRevision,
): Promise<{ aperturaId: string }> {
  const defensa = await defensaDeLaActividad(ctx, actividad, peticion.defensaId);
  const activoMs = Math.round(Math.min(MAX_REVISION_ACTIVA_MS, Math.max(0, Number.isFinite(peticion.activoMs) ? peticion.activoMs : 0)));
  const ahora = ctx.ahora().toISOString();

  if (!peticion.aperturaId) {
    const aperturaId = await ctx.repo.abrirTiempoRevision(defensa.id, ahora);
    if (activoMs > 0) await ctx.repo.actualizarTiempoRevision(aperturaId, defensa.id, activoMs, ahora);
    return { aperturaId };
  }
  const actualizada = await ctx.repo.actualizarTiempoRevision(peticion.aperturaId, defensa.id, activoMs, ahora);
  if (!actualizada) throw noEncontrado();
  if (activoMs > 0) {
    await ctx.eventos.emitir({
      verbo: 'completo_paso',
      evento: 'revision_tiempo',
      pasoId: 'revision',
      actividadId: actividad.id,
      actorId: actividad.id,
      clave: `${peticion.aperturaId}:${activoMs}`,
      medidas: { defensaId: defensa.id, activoMs },
    });
  }
  return { aperturaId: peticion.aperturaId };
}

/** Enlace que caduca para oír el audio original de una respuesta, mientras no se haya borrado. */
export async function urlAudioDeParte(ctx: Ctx, actividad: ActividadRow, peticion: PeticionAudioParte): Promise<RespuestaAudioParte> {
  const defensa = await defensaDeLaActividad(ctx, actividad, peticion.defensaId);
  const turno = await ctx.repo.turnoPorId(peticion.turnoId);
  if (!turno || turno.defensaId !== defensa.id || !turno.audioRuta || defensa.audioBorradoEn !== null) throw noEncontrado();
  const url = await ctx.archivos.urlFirmadaDescarga('audio', turno.audioRuta, LIMITES.enlaceAudioSegundos);
  return { url };
}

/** Desactiva o reactiva el enlace de grupo. Con él desactivado nadie nuevo entra ni entrega. */
export async function cambiarEnlaceDeGrupo(ctx: Ctx, actividad: ActividadRow, activo: boolean): Promise<void> {
  if (actividad.enlaceActivo === activo) return;
  await ctx.repo.actualizarActividad(actividad.id, { enlaceActivo: activo });
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'enlace',
    pasoId: 'enlace',
    actividadId: actividad.id,
    actorId: actividad.id,
    clave: `${actividad.id}:${activo}:${ctx.ahora().getTime()}`,
    medidas: { activo, enviosUsados: actividad.enviosUsados, limiteEnvios: actividad.limiteEnvios },
  });
}

