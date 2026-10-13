import 'server-only';
import type { LearningEventInsertRow } from '../../events/ingestPolicy';
import type { PalabraTranscrita } from '../providers/tipos';
import type { Objective, QuestionPlan } from '../questionPlan';
import type { CitaVerificada, NivelReporte } from '../reporte';
import type { Clase, DuracionDefensa, TipoTurno } from '../turnEngine';

/**
 * Lo que las defensas guardan, en tipos del dominio (camelCase), y las dos
 * interfaces que lo guardan: el repositorio (filas) y el almacén de archivos
 * (buckets). Hay una implementación para Supabase y otra en memoria que solo
 * existe fuera de producción, para desarrollar y probar sin base de datos.
 *
 * Cada campo es la columna de las tablas defensa_* de
 * supabase/migrations/20261013_defensa_oral_piloto.sql, pasada a camelCase.
 */

export type ModoRespuesta = 'voz' | 'escrito';
export type Dispositivo = 'android' | 'ios' | 'escritorio' | 'otro';
export type Registro = 'tu' | 'usted';
export type EstadoEntrega = 'pendiente' | 'lista' | 'sin_texto' | 'rechazada' | 'error';
export type EstadoPlan = 'generando' | 'listo' | 'no_corresponde' | 'error';
export type EstadoDefensa = 'en_curso' | 'por_revisar' | 'entregada' | 'abandonada' | 'incompleta';
export type EstadoTurno = 'esperando' | 'procesando' | 'aclarando' | 'cerrado';
export type EstadoReporte = 'generando' | 'listo' | 'error';
export type TipoConsentimiento = 'aviso_privacidad' | 'transferencia_internacional' | 'mayor_de_edad';
export type TipoToque = 'antes' | 'despues';
export type ValorToque = 'si' | 'parte' | 'no' | 'no_se';

/** Los dos buckets privados. */
export type Bucket = 'trabajos' | 'audio';

/** Un objetivo de la actividad. Los apodos son opcionales y solo los usa la pantalla del profesor. */
export interface ObjetivoActividad extends Objective {
  /** Versión corta para las gráficas del grupo. */
  corto?: string;
  /** Cómo se nombra en una frase: "El de la muestra". */
  alias?: string;
  /** El tema, para completar "explicaron ...": "su muestra". */
  tema?: string;
}

export interface ActividadRow {
  id: string;
  tokenGrupo: string;
  nombre: string;
  curso: string;
  grupo: string;
  profesorNombre: string;
  profesorRef: string | null;
  consigna: string;
  rubrica: string | null;
  ejemplosDocente: string | null;
  contextoCurso: string | null;
  registro: Registro;
  objetivos: ObjetivoActividad[];
  duracion: DuracionDefensa;
  fechaLimite: string;
  limiteEnvios: number;
  enviosUsados: number;
  enlaceActivo: boolean;
  accesoVersion: number;
  cohorteCerradaEn: string | null;
  creadaEn: string;
  actualizadaEn: string;
}

export type NuevaActividad = Omit<ActividadRow, 'id' | 'enviosUsados' | 'accesoVersion' | 'cohorteCerradaEn' | 'creadaEn' | 'actualizadaEn'>;

export interface AlumnoRow {
  id: string;
  actividadId: string;
  matricula: string;
  nombre: string;
  modoPreferido: ModoRespuesta | null;
  dispositivo: Dispositivo | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface EntregaRow {
  id: string;
  alumnoId: string;
  actividadId: string;
  version: number;
  tipo: 'archivo' | 'texto';
  nombreArchivo: string;
  mime: string;
  bytes: number;
  paginas: number | null;
  palabras: number | null;
  rutaOriginal: string;
  estado: EstadoEntrega;
  motivo: string | null;
  textoExtraido: string | null;
  hashSha256: string | null;
  tardia: boolean;
  creadaEn: string;
  listaEn: string | null;
}

export type NuevaEntrega = Pick<
  EntregaRow,
  'alumnoId' | 'actividadId' | 'tipo' | 'nombreArchivo' | 'mime' | 'bytes' | 'rutaOriginal' | 'tardia' | 'creadaEn'
> & { estado?: EstadoEntrega };

export interface PlanRow {
  id: string;
  entregaId: string;
  estado: EstadoPlan;
  promptVersion: string;
  proveedor: string | null;
  modelo: string | null;
  /** NUNCA sale del servidor. */
  plan: QuestionPlan | null;
  problemas: Array<{ severity: string; path: string; message: string }>;
  objetivosSinEvidencia: string[];
  /** Huella del texto de la pregunta → ruta del audio en el bucket de audio. */
  audios: Record<string, string>;
  intentos: number;
  creadoEn: string;
  listoEn: string | null;
}

export interface MarcaRevision {
  turnoId: string;
  linea: string;
}

export interface DefensaRow {
  id: string;
  alumnoId: string;
  actividadId: string;
  entregaId: string;
  planId: string;
  esEnsayo: boolean;
  estado: EstadoDefensa;
  semilla: number;
  duracion: DuracionDefensa;
  dispositivo: Dispositivo | null;
  tardia: boolean;
  iniciadaEn: string;
  terminadaEn: string | null;
  entregadaEn: string | null;
  duracionActivaMs: number;
  aclaracionMs: number;
  marcasRevision: MarcaRevision[];
  nivelEstres: number | null;
  estresEn: string | null;
  audioBorradoEn: string | null;
}

export type NuevaDefensa = Pick<
  DefensaRow,
  'alumnoId' | 'actividadId' | 'entregaId' | 'planId' | 'esEnsayo' | 'semilla' | 'duracion' | 'dispositivo' | 'tardia' | 'iniciadaEn'
>;

export interface AclaracionTurno {
  estado: 'pendiente' | 'aclarada' | 'no_entendido';
  indiceInicio: number;
  indiceFin: number;
  inicioMs: number;
  finMs: number;
  antes: string;
  despues: string;
  modo?: ModoRespuesta;
  texto?: string;
  duracionMs?: number;
}

export interface TurnoRow {
  id: string;
  defensaId: string;
  numero: number;
  tipo: TipoTurno;
  preguntaRef: string;
  objetivoId: string | null;
  contextoTexto: string;
  preguntaTexto: string;
  audioPreguntaRuta: string | null;
  estado: EstadoTurno;
  modoRespuesta: ModoRespuesta | null;
  textoRespuesta: string | null;
  transcripcion: PalabraTranscrita[] | null;
  clase: Clase | null;
  claseFuente: 'modelo' | 'regla' | null;
  audioRuta: string | null;
  audioMime: string | null;
  duracionAudioMs: number | null;
  duracionRespuestaMs: number | null;
  silencios: number;
  repeticiones: number;
  aclaracion: AclaracionTurno | null;
  preguntadoEn: string;
  respondidoEn: string | null;
}

export type NuevoTurno = Pick<
  TurnoRow,
  'defensaId' | 'numero' | 'tipo' | 'preguntaRef' | 'objetivoId' | 'contextoTexto' | 'preguntaTexto' | 'audioPreguntaRuta' | 'preguntadoEn'
>;

export interface ParteAudioRow {
  turnoId: string;
  indice: number;
  ruta: string;
  bytes: number;
}

/** Lo que se guarda del reporte, ya verificado. */
export interface ReporteGuardado {
  version: 1;
  generadoEn: string;
  resumen: string;
  objetivos: Array<{
    objetivoId: string;
    nivel: NivelReporte;
    razon: string;
    faltante: string;
    citas: CitaVerificada[];
  }>;
}

export interface ReporteRow {
  id: string;
  defensaId: string;
  estado: EstadoReporte;
  promptVersion: string;
  proveedor: string | null;
  modelo: string | null;
  reporte: ReporteGuardado | null;
  citasDescartadas: number;
  creadoEn: string;
}

export interface ToqueRow {
  defensaId: string;
  tipo: TipoToque;
  valor: ValorToque;
  creadoEn: string;
}

export interface TiempoRevisionRow {
  id: string;
  defensaId: string;
  abiertoEn: string;
  actualizadoEn: string;
  activoMs: number;
}

/** Todo lo que el profesor ve de un alumno, junto. */
export interface AlumnoConEstado {
  alumno: AlumnoRow;
  /** Todas las versiones, de la más antigua a la más reciente. */
  entregas: EntregaRow[];
  /** Defensas reales (sin ensayos), de la más antigua a la más reciente. */
  defensas: DefensaRow[];
  reportes: ReporteRow[];
  toques: ToqueRow[];
}

// ── Repositorio ─────────────────────────────────────────────────────────────

export interface RepoDefensa {
  // Actividades
  crearActividad(datos: NuevaActividad): Promise<ActividadRow>;
  actividadPorTokenGrupo(token: string): Promise<ActividadRow | null>;
  actividadPorId(id: string): Promise<ActividadRow | null>;
  actualizarActividad(
    id: string,
    parche: Partial<Pick<ActividadRow, 'enlaceActivo' | 'accesoVersion' | 'cohorteCerradaEn' | 'limiteEnvios'>>,
  ): Promise<ActividadRow>;
  /** Cuenta un envío de forma atómica; false si el enlace está desactivado o llegó al límite. */
  reservarEnvio(actividadId: string): Promise<boolean>;
  liberarEnvio(actividadId: string): Promise<void>;

  // Alumnos
  upsertAlumno(datos: {
    actividadId: string;
    matricula: string;
    nombre: string;
    modo: ModoRespuesta | null;
    dispositivo: Dispositivo | null;
    ahora: string;
  }): Promise<{ alumno: AlumnoRow; nuevo: boolean }>;
  alumnoPorId(id: string): Promise<AlumnoRow | null>;
  /** Busca sin crear: lo usa la entrada cuando el enlace ya está desactivado. */
  alumnoPorMatricula(actividadId: string, matricula: string): Promise<AlumnoRow | null>;
  actualizarModoAlumno(id: string, modo: ModoRespuesta, ahora: string): Promise<void>;
  guardarConsentimientos(
    alumnoId: string,
    items: ReadonlyArray<{ tipo: TipoConsentimiento; aceptado: boolean; versionAviso: string }>,
    ahora: string,
  ): Promise<void>;

  // Entregas
  /** Asigna la siguiente versión del alumno. */
  crearEntrega(datos: NuevaEntrega): Promise<EntregaRow>;
  entregaPorId(id: string): Promise<EntregaRow | null>;
  /** La última versión, en cualquier estado. */
  ultimaEntrega(alumnoId: string): Promise<EntregaRow | null>;
  /** La última versión que ya tiene texto: la que se defiende aunque haya un intento posterior rechazado. */
  ultimaEntregaLista(alumnoId: string): Promise<EntregaRow | null>;
  actualizarEntrega(id: string, parche: Partial<Omit<EntregaRow, 'id' | 'alumnoId' | 'actividadId' | 'version'>>): Promise<EntregaRow>;

  // Planes
  planPorId(id: string): Promise<PlanRow | null>;
  planDeEntrega(entregaId: string): Promise<PlanRow | null>;
  crearPlanSiNoExiste(
    entregaId: string,
    promptVersion: string,
    ahora: string,
  ): Promise<{ plan: PlanRow; creado: boolean }>;
  actualizarPlan(id: string, parche: Partial<Omit<PlanRow, 'id' | 'entregaId'>>): Promise<PlanRow>;

  // Defensas
  defensaPorId(id: string): Promise<DefensaRow | null>;
  defensaEnCurso(alumnoId: string, esEnsayo: boolean): Promise<DefensaRow | null>;
  /** La defensa o el ensayo más reciente del alumno, en cualquier estado. */
  ultimaDefensa(alumnoId: string, esEnsayo: boolean): Promise<DefensaRow | null>;
  crearDefensa(datos: NuevaDefensa): Promise<DefensaRow>;
  actualizarDefensa(id: string, parche: Partial<Omit<DefensaRow, 'id' | 'alumnoId' | 'actividadId'>>): Promise<DefensaRow>;
  defensasDeAlumno(alumnoId: string): Promise<DefensaRow[]>;

  // Turnos
  turnoPorId(id: string): Promise<TurnoRow | null>;
  turnosDeDefensa(defensaId: string): Promise<TurnoRow[]>;
  /** Los turnos de varias defensas de una vez, ordenados por defensa y número. */
  turnosDeDefensas(defensaIds: readonly string[]): Promise<TurnoRow[]>;
  crearTurno(datos: NuevoTurno): Promise<TurnoRow>;
  actualizarTurno(id: string, parche: Partial<Omit<TurnoRow, 'id' | 'defensaId' | 'numero'>>): Promise<TurnoRow>;
  registrarParteAudio(turnoId: string, indice: number, ruta: string, bytes: number, ahora: string): Promise<void>;
  partesAudio(turnoId: string): Promise<ParteAudioRow[]>;

  // Reportes y revisión del profesor
  reporteDeDefensa(defensaId: string): Promise<ReporteRow | null>;
  guardarReporte(datos: Omit<ReporteRow, 'id'>): Promise<ReporteRow>;
  registrarToque(defensaId: string, tipo: TipoToque, valor: ValorToque, ahora: string): Promise<void>;
  toquesDeDefensa(defensaId: string): Promise<ToqueRow[]>;
  /** Abre una medición de tiempo de revisión; devuelve su id. */
  abrirTiempoRevision(defensaId: string, ahora: string): Promise<string>;
  actualizarTiempoRevision(id: string, defensaId: string, activoMs: number, ahora: string): Promise<boolean>;
  tiemposDeRevision(defensaId: string): Promise<TiempoRevisionRow[]>;
  listarAlumnosDeActividad(actividadId: string): Promise<AlumnoConEstado[]>;

  // Mantenimiento
  defensasConAudioPorBorrar(terminadasAntesDe: string): Promise<DefensaRow[]>;
  marcarAudioBorrado(defensaIds: readonly string[], ahora: string): Promise<void>;
  defensasEnCursoIniciadasAntes(antesDe: string): Promise<DefensaRow[]>;
  entregasPendientesAntesDe(antesDe: string): Promise<EntregaRow[]>;

  // Eventos de aprendizaje (tabla existente, sin cambiar su esquema)
  insertarEventos(filas: readonly LearningEventInsertRow[]): Promise<void>;
}

// ── Archivos ────────────────────────────────────────────────────────────────

export interface SubidaFirmada {
  /** Dirección a la que el navegador sube el archivo con PUT y un FormData. */
  url: string;
  expiraEn: number;
}

export interface AlmacenArchivos {
  subir(bucket: Bucket, ruta: string, datos: Uint8Array, mime: string): Promise<void>;
  descargar(bucket: Bucket, ruta: string): Promise<Uint8Array | null>;
  existe(bucket: Bucket, ruta: string): Promise<boolean>;
  /** Archivos directamente dentro de una carpeta (sin entrar en subcarpetas). */
  listar(bucket: Bucket, carpeta: string): Promise<Array<{ nombre: string; creadoEn: string | null }>>;
  borrar(bucket: Bucket, rutas: readonly string[]): Promise<void>;
  /** Enlace de lectura que caduca; `nombreDescarga` fuerza un nombre de archivo al guardar. */
  urlFirmadaDescarga(
    bucket: Bucket,
    ruta: string,
    segundos: number,
    opciones?: { nombreDescarga?: string },
  ): Promise<string>;
  /** Enlace de subida directa al bucket; null si este almacén no la soporta (se sube por la API). */
  urlFirmadaSubida(bucket: Bucket, ruta: string): Promise<SubidaFirmada | null>;
}

export interface AlmacenDefensa {
  repo: RepoDefensa;
  archivos: AlmacenArchivos;
}
