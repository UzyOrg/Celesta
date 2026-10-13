import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import { DefensaError } from '../errores';
import type { LearningEventInsertRow } from '../../events/ingestPolicy';
import type {
  ActividadRow,
  AlmacenArchivos,
  AlmacenDefensa,
  AlumnoConEstado,
  AlumnoRow,
  Bucket,
  DefensaRow,
  EntregaRow,
  ParteAudioRow,
  PlanRow,
  RepoDefensa,
  ReporteRow,
  TiempoRevisionRow,
  ToqueRow,
  TurnoRow,
} from './tipos';

/**
 * Almacén en memoria.
 *
 * Existe para desarrollar la interfaz y correr las pruebas sin Supabase, y se
 * rehúsa a existir en producción (ver tipoDeAlmacen en config.ts): todo lo que
 * guarda se pierde al reiniciar el servidor. Imita las restricciones de las
 * tablas (únicos, versiones, el límite atómico de envíos) para que los servicios
 * se comporten igual con uno u otro almacén.
 */

export interface EstadoMemoria {
  actividades: Map<string, ActividadRow>;
  alumnos: Map<string, AlumnoRow>;
  consentimientos: Array<{ alumnoId: string; tipo: string; aceptado: boolean; versionAviso: string; aceptadoEn: string }>;
  entregas: Map<string, EntregaRow>;
  planes: Map<string, PlanRow>;
  defensas: Map<string, DefensaRow>;
  turnos: Map<string, TurnoRow>;
  partes: ParteAudioRow[];
  reportes: Map<string, ReporteRow>;
  toques: ToqueRow[];
  tiempos: Map<string, TiempoRevisionRow>;
  eventos: LearningEventInsertRow[];
  archivos: Map<string, { datos: Uint8Array; mime: string }>;
}

export function crearEstadoMemoria(): EstadoMemoria {
  return {
    actividades: new Map(),
    alumnos: new Map(),
    consentimientos: [],
    entregas: new Map(),
    planes: new Map(),
    defensas: new Map(),
    turnos: new Map(),
    partes: [],
    reportes: new Map(),
    toques: [],
    tiempos: new Map(),
    eventos: [],
    archivos: new Map(),
  };
}

const CLAVE_GLOBAL = '__celesteaDefensaMemoria';

/** Un solo estado por proceso, compartido por todas las rutas (en desarrollo Next las compila por separado). */
export function estadoMemoriaGlobal(): EstadoMemoria {
  const global = globalThis as unknown as Record<string, EstadoMemoria | undefined>;
  global[CLAVE_GLOBAL] ??= crearEstadoMemoria();
  return global[CLAVE_GLOBAL] as EstadoMemoria;
}

function copia<T>(valor: T): T {
  return structuredClone(valor);
}

function exigir<T>(valor: T | undefined, que: string): T {
  if (valor === undefined) throw new Error(`defensa_memoria: no existe ${que}`);
  return valor;
}

function porFecha<T>(lista: T[], campo: (fila: T) => string): T[] {
  return lista.slice().sort((a, b) => campo(a).localeCompare(campo(b)));
}

// ── Repositorio ─────────────────────────────────────────────────────────────

export function crearRepoMemoria(estado: EstadoMemoria): RepoDefensa & { estado: EstadoMemoria } {
  const unica = <T>(fila: T | undefined | null): T | null => (fila ? copia(fila) : null);

  return {
    estado,

    // Actividades
    async crearActividad(datos) {
      for (const otra of Array.from(estado.actividades.values())) {
        if (otra.tokenGrupo === datos.tokenGrupo) throw new Error('defensa_memoria: token de grupo repetido');
      }
      const ahora = new Date().toISOString();
      const fila: ActividadRow = {
        ...copia(datos),
        id: randomUUID(),
        enviosUsados: 0,
        accesoVersion: 1,
        cohorteCerradaEn: null,
        creadaEn: ahora,
        actualizadaEn: ahora,
      };
      estado.actividades.set(fila.id, fila);
      return copia(fila);
    },
    async actividadPorTokenGrupo(token) {
      return unica(Array.from(estado.actividades.values()).find((a) => a.tokenGrupo === token));
    },
    async actividadPorId(id) {
      return unica(estado.actividades.get(id));
    },
    async actualizarActividad(id, parche) {
      const fila = exigir(estado.actividades.get(id), 'la actividad');
      Object.assign(fila, copia(parche), { actualizadaEn: new Date().toISOString() });
      return copia(fila);
    },
    async reservarEnvio(actividadId) {
      const fila = exigir(estado.actividades.get(actividadId), 'la actividad');
      if (!fila.enlaceActivo || fila.enviosUsados >= fila.limiteEnvios) return false;
      fila.enviosUsados += 1;
      return true;
    },
    async liberarEnvio(actividadId) {
      const fila = estado.actividades.get(actividadId);
      if (fila) fila.enviosUsados = Math.max(0, fila.enviosUsados - 1);
    },

    // Alumnos
    async upsertAlumno({ actividadId, matricula, nombre, modo, dispositivo, ahora }) {
      const existente = Array.from(estado.alumnos.values()).find(
        (a) => a.actividadId === actividadId && a.matricula === matricula,
      );
      if (existente) {
        if (modo) existente.modoPreferido = modo;
        if (dispositivo) existente.dispositivo = dispositivo;
        existente.actualizadoEn = ahora;
        return { alumno: copia(existente), nuevo: false };
      }
      const fila: AlumnoRow = {
        id: randomUUID(),
        actividadId,
        matricula,
        nombre,
        modoPreferido: modo,
        dispositivo,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      estado.alumnos.set(fila.id, fila);
      return { alumno: copia(fila), nuevo: true };
    },
    async alumnoPorId(id) {
      return unica(estado.alumnos.get(id));
    },
    async alumnoPorMatricula(actividadId, matricula) {
      return unica(Array.from(estado.alumnos.values()).find((a) => a.actividadId === actividadId && a.matricula === matricula));
    },
    async actualizarModoAlumno(id, modo, ahora) {
      const fila = estado.alumnos.get(id);
      if (fila) {
        fila.modoPreferido = modo;
        fila.actualizadoEn = ahora;
      }
    },
    async guardarConsentimientos(alumnoId, items, ahora) {
      for (const item of items) {
        const indice = estado.consentimientos.findIndex(
          (c) => c.alumnoId === alumnoId && c.tipo === item.tipo && c.versionAviso === item.versionAviso,
        );
        const fila = { alumnoId, tipo: item.tipo, aceptado: item.aceptado, versionAviso: item.versionAviso, aceptadoEn: ahora };
        if (indice >= 0) estado.consentimientos[indice] = fila;
        else estado.consentimientos.push(fila);
      }
    },

    // Entregas
    async crearEntrega(datos) {
      const versiones = Array.from(estado.entregas.values())
        .filter((e) => e.alumnoId === datos.alumnoId)
        .map((e) => e.version);
      const fila: EntregaRow = {
        id: randomUUID(),
        alumnoId: datos.alumnoId,
        actividadId: datos.actividadId,
        version: Math.max(0, ...versiones) + 1,
        tipo: datos.tipo,
        nombreArchivo: datos.nombreArchivo,
        mime: datos.mime,
        bytes: datos.bytes,
        paginas: null,
        palabras: null,
        rutaOriginal: datos.rutaOriginal,
        estado: datos.estado ?? 'pendiente',
        motivo: null,
        textoExtraido: null,
        hashSha256: null,
        tardia: datos.tardia,
        creadaEn: datos.creadaEn,
        listaEn: null,
      };
      estado.entregas.set(fila.id, fila);
      return copia(fila);
    },
    async entregaPorId(id) {
      return unica(estado.entregas.get(id));
    },
    async ultimaEntrega(alumnoId) {
      const propias = Array.from(estado.entregas.values()).filter((e) => e.alumnoId === alumnoId);
      return unica(propias.sort((a, b) => b.version - a.version)[0]);
    },
    async ultimaEntregaLista(alumnoId) {
      const propias = Array.from(estado.entregas.values()).filter((e) => e.alumnoId === alumnoId && e.estado === 'lista');
      return unica(propias.sort((a, b) => b.version - a.version)[0]);
    },
    async actualizarEntrega(id, parche) {
      const fila = exigir(estado.entregas.get(id), 'la entrega');
      Object.assign(fila, copia(parche));
      return copia(fila);
    },

    // Planes
    async planPorId(id) {
      return unica(estado.planes.get(id));
    },
    async planDeEntrega(entregaId) {
      return unica(Array.from(estado.planes.values()).find((p) => p.entregaId === entregaId));
    },
    async crearPlanSiNoExiste(entregaId, promptVersion, ahora) {
      const existente = Array.from(estado.planes.values()).find((p) => p.entregaId === entregaId);
      if (existente) return { plan: copia(existente), creado: false };
      const fila: PlanRow = {
        id: randomUUID(),
        entregaId,
        estado: 'generando',
        promptVersion,
        proveedor: null,
        modelo: null,
        plan: null,
        problemas: [],
        objetivosSinEvidencia: [],
        audios: {},
        intentos: 0,
        creadoEn: ahora,
        listoEn: null,
      };
      estado.planes.set(fila.id, fila);
      return { plan: copia(fila), creado: true };
    },
    async actualizarPlan(id, parche) {
      const fila = exigir(estado.planes.get(id), 'el plan');
      Object.assign(fila, copia(parche));
      return copia(fila);
    },

    // Defensas
    async defensaPorId(id) {
      return unica(estado.defensas.get(id));
    },
    async defensaEnCurso(alumnoId, esEnsayo) {
      return unica(
        Array.from(estado.defensas.values()).find(
          (d) => d.alumnoId === alumnoId && d.esEnsayo === esEnsayo && d.estado === 'en_curso',
        ),
      );
    },
    async ultimaDefensa(alumnoId, esEnsayo) {
      const propias = Array.from(estado.defensas.values()).filter(
        (d) => d.alumnoId === alumnoId && d.esEnsayo === esEnsayo,
      );
      return unica(propias.sort((a, b) => b.iniciadaEn.localeCompare(a.iniciadaEn))[0]);
    },
    async crearDefensa(datos) {
      const enCurso = Array.from(estado.defensas.values()).some(
        (d) => d.alumnoId === datos.alumnoId && d.esEnsayo === datos.esEnsayo && d.estado === 'en_curso',
      );
      if (enCurso) throw new DefensaError('ocupado', 409);
      const fila: DefensaRow = {
        id: randomUUID(),
        ...copia(datos),
        estado: 'en_curso',
        terminadaEn: null,
        entregadaEn: null,
        duracionActivaMs: 0,
        aclaracionMs: 0,
        marcasRevision: [],
        nivelEstres: null,
        estresEn: null,
        audioBorradoEn: null,
      };
      estado.defensas.set(fila.id, fila);
      return copia(fila);
    },
    async actualizarDefensa(id, parche) {
      const fila = exigir(estado.defensas.get(id), 'la defensa');
      Object.assign(fila, copia(parche));
      return copia(fila);
    },
    async defensasDeAlumno(alumnoId) {
      return porFecha(
        Array.from(estado.defensas.values()).filter((d) => d.alumnoId === alumnoId),
        (d) => d.iniciadaEn,
      ).map(copia);
    },

    // Turnos
    async turnoPorId(id) {
      return unica(estado.turnos.get(id));
    },
    async turnosDeDefensa(defensaId) {
      return Array.from(estado.turnos.values())
        .filter((t) => t.defensaId === defensaId)
        .sort((a, b) => a.numero - b.numero)
        .map(copia);
    },
    async turnosDeDefensas(defensaIds) {
      const ids = new Set(defensaIds);
      return Array.from(estado.turnos.values())
        .filter((t) => ids.has(t.defensaId))
        .sort((a, b) => a.defensaId.localeCompare(b.defensaId) || a.numero - b.numero)
        .map(copia);
    },
    async crearTurno(datos) {
      const repetido = Array.from(estado.turnos.values()).some(
        (t) => t.defensaId === datos.defensaId && t.numero === datos.numero,
      );
      if (repetido) throw new DefensaError('ocupado', 409);
      const fila: TurnoRow = {
        id: randomUUID(),
        ...copia(datos),
        estado: 'esperando',
        modoRespuesta: null,
        textoRespuesta: null,
        transcripcion: null,
        clase: null,
        claseFuente: null,
        audioRuta: null,
        audioMime: null,
        duracionAudioMs: null,
        duracionRespuestaMs: null,
        silencios: 0,
        repeticiones: 0,
        aclaracion: null,
        respondidoEn: null,
      };
      estado.turnos.set(fila.id, fila);
      return copia(fila);
    },
    async actualizarTurno(id, parche) {
      const fila = exigir(estado.turnos.get(id), 'el turno');
      Object.assign(fila, copia(parche));
      return copia(fila);
    },
    async registrarParteAudio(turnoId, indice, ruta, bytes) {
      const i = estado.partes.findIndex((p) => p.turnoId === turnoId && p.indice === indice);
      const fila: ParteAudioRow = { turnoId, indice, ruta, bytes };
      if (i >= 0) estado.partes[i] = fila;
      else estado.partes.push(fila);
    },
    async partesAudio(turnoId) {
      return estado.partes
        .filter((p) => p.turnoId === turnoId)
        .sort((a, b) => a.indice - b.indice)
        .map(copia);
    },

    // Reportes y revisión
    async reporteDeDefensa(defensaId) {
      return unica(Array.from(estado.reportes.values()).find((r) => r.defensaId === defensaId));
    },
    async guardarReporte(datos) {
      const existente = Array.from(estado.reportes.values()).find((r) => r.defensaId === datos.defensaId);
      const fila: ReporteRow = { ...copia(datos), id: existente?.id ?? randomUUID() };
      estado.reportes.set(fila.id, fila);
      return copia(fila);
    },
    async registrarToque(defensaId, tipo, valor, ahora) {
      const i = estado.toques.findIndex((t) => t.defensaId === defensaId && t.tipo === tipo);
      const fila: ToqueRow = { defensaId, tipo, valor, creadoEn: ahora };
      if (i >= 0) estado.toques[i] = fila;
      else estado.toques.push(fila);
    },
    async toquesDeDefensa(defensaId) {
      return estado.toques.filter((t) => t.defensaId === defensaId).map(copia);
    },
    async abrirTiempoRevision(defensaId, ahora) {
      const fila: TiempoRevisionRow = { id: randomUUID(), defensaId, abiertoEn: ahora, actualizadoEn: ahora, activoMs: 0 };
      estado.tiempos.set(fila.id, fila);
      return fila.id;
    },
    async actualizarTiempoRevision(id, defensaId, activoMs, ahora) {
      const fila = estado.tiempos.get(id);
      if (!fila || fila.defensaId !== defensaId) return false;
      // Solo crece: un reintento viejo no puede achicar lo ya medido.
      fila.activoMs = Math.max(fila.activoMs, activoMs);
      fila.actualizadoEn = ahora;
      return true;
    },
    async tiemposDeRevision(defensaId) {
      return Array.from(estado.tiempos.values()).filter((t) => t.defensaId === defensaId).map(copia);
    },
    async listarAlumnosDeActividad(actividadId): Promise<AlumnoConEstado[]> {
      const alumnos = Array.from(estado.alumnos.values()).filter((a) => a.actividadId === actividadId);
      return alumnos.map((alumno) => {
        const defensas = porFecha(
          Array.from(estado.defensas.values()).filter((d) => d.alumnoId === alumno.id && !d.esEnsayo),
          (d) => d.iniciadaEn,
        );
        const ids = new Set(defensas.map((d) => d.id));
        return copia({
          alumno,
          entregas: Array.from(estado.entregas.values())
            .filter((e) => e.alumnoId === alumno.id)
            .sort((a, b) => a.version - b.version),
          defensas,
          reportes: Array.from(estado.reportes.values()).filter((r) => ids.has(r.defensaId)),
          toques: estado.toques.filter((t) => ids.has(t.defensaId)),
        });
      });
    },

    // Mantenimiento
    async defensasConAudioPorBorrar(terminadasAntesDe) {
      return Array.from(estado.defensas.values())
        .filter((d) => d.audioBorradoEn === null && d.terminadaEn !== null && d.terminadaEn <= terminadasAntesDe)
        .map(copia);
    },
    async marcarAudioBorrado(defensaIds, ahora) {
      for (const id of defensaIds) {
        const fila = estado.defensas.get(id);
        if (fila) fila.audioBorradoEn = ahora;
      }
    },
    async defensasEnCursoIniciadasAntes(antesDe) {
      return Array.from(estado.defensas.values())
        .filter((d) => d.estado === 'en_curso' && d.iniciadaEn < antesDe)
        .map(copia);
    },
    async entregasPendientesAntesDe(antesDe) {
      return Array.from(estado.entregas.values())
        .filter((e) => e.estado === 'pendiente' && e.creadaEn < antesDe)
        .map(copia);
    },

    // Eventos
    async insertarEventos(filas) {
      const vistos = new Set(estado.eventos.map((e) => e.client_event_id));
      for (const fila of filas) {
        if (vistos.has(fila.client_event_id)) continue;
        vistos.add(fila.client_event_id);
        estado.eventos.push(copia(fila));
      }
    },
  };
}

// ── Archivos ────────────────────────────────────────────────────────────────

const RUTA_DESCARGA_DEV = '/api/defensa/archivo-dev';

function firmaDev(clave: string, expira: number): string {
  const secreto = config.secretoFirma() ?? 'sin-secreto';
  return createHmac('sha256', secreto).update(`celestea.defensa.dev.${clave}.${expira}`).digest('base64url');
}

/** Valida un enlace de descarga del almacén en memoria y devuelve la clave del archivo. */
export function verificarEnlaceDev(clave: string, expira: number, firma: string, ahora = Date.now()): boolean {
  if (!Number.isFinite(expira) || ahora >= expira) return false;
  const esperada = Buffer.from(firmaDev(clave, expira));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function leerArchivoDev(estado: EstadoMemoria, clave: string): { datos: Uint8Array; mime: string } | null {
  return estado.archivos.get(clave) ?? null;
}

export function crearArchivosMemoria(estado: EstadoMemoria): AlmacenArchivos {
  const clave = (bucket: Bucket, ruta: string) => `${bucket}/${ruta}`;
  return {
    async subir(bucket, ruta, datos, mime) {
      estado.archivos.set(clave(bucket, ruta), { datos: datos.slice(), mime });
    },
    async descargar(bucket, ruta) {
      const archivo = estado.archivos.get(clave(bucket, ruta));
      return archivo ? archivo.datos.slice() : null;
    },
    async existe(bucket, ruta) {
      return estado.archivos.has(clave(bucket, ruta));
    },
    async listar(bucket, carpeta) {
      const prefijo = `${clave(bucket, carpeta)}/`;
      return Array.from(estado.archivos.keys())
        .filter((k) => k.startsWith(prefijo) && !k.slice(prefijo.length).includes('/'))
        .map((k) => ({ nombre: k.slice(prefijo.length), creadoEn: null }));
    },
    async borrar(bucket, rutas) {
      for (const ruta of rutas) estado.archivos.delete(clave(bucket, ruta));
    },
    async urlFirmadaDescarga(bucket, ruta, segundos) {
      const expira = Date.now() + segundos * 1000;
      const k = clave(bucket, ruta);
      const parametros = new URLSearchParams({ k, e: String(expira), f: firmaDev(k, expira) });
      return `${RUTA_DESCARGA_DEV}?${parametros.toString()}`;
    },
    async urlFirmadaSubida() {
      return null;
    },
  };
}

export function crearAlmacenMemoria(estado: EstadoMemoria = estadoMemoriaGlobal()): AlmacenDefensa & { estado: EstadoMemoria } {
  return { estado, repo: crearRepoMemoria(estado), archivos: crearArchivosMemoria(estado) };
}
