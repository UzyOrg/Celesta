import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FIRST_WRITE_WINS_UPSERT_OPTIONS, type LearningEventInsertRow } from '../../events/ingestPolicy';
import { config } from '../config';
import { DefensaError } from '../errores';
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
 * Implementación de Supabase. Solo el servidor la usa, con la llave de servicio;
 * las tablas y los buckets están cerrados al navegador (ver la migración).
 *
 * Las columnas son las de las tablas defensa_* en snake_case; los tipos del
 * dominio son las mismas en camelCase. Solo se convierten las claves de primer
 * nivel: lo que va dentro de una columna jsonb se guarda y se lee tal cual.
 */

const TABLAS = {
  actividades: 'defensa_actividades',
  alumnos: 'defensa_alumnos',
  consentimientos: 'defensa_consentimientos',
  entregas: 'defensa_entregas',
  planes: 'defensa_planes',
  defensas: 'defensa_defensas',
  turnos: 'defensa_turnos',
  partes: 'defensa_audio_partes',
  reportes: 'defensa_reportes',
  toques: 'defensa_toques_profesor',
  tiempos: 'defensa_tiempos_revision',
} as const;

const BUCKETS: Readonly<Record<Bucket, string>> = {
  trabajos: 'defensa-trabajos',
  audio: 'defensa-audio',
};

type Fila = Record<string, unknown>;

const aCamel = (clave: string) => clave.replace(/_([a-z0-9])/g, (_, letra: string) => letra.toUpperCase());
const aSnake = (clave: string) => clave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);

function deFila<T>(fila: unknown): T {
  const salida: Fila = {};
  for (const [clave, valor] of Object.entries(fila as Fila)) salida[aCamel(clave)] = valor;
  return salida as T;
}

function aColumnas(datos: object): Fila {
  const salida: Fila = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== undefined) salida[aSnake(clave)] = valor;
  }
  return salida;
}

interface ErrorBd {
  code?: string;
  message?: string;
}

/** Un fallo de base de datos llega al cliente como un error genérico; el código queda en el registro. */
function fallar(operacion: string, error: ErrorBd | null): never {
  console.error('defensa_bd', { operacion, codigo: error?.code ?? 'desconocido' });
  throw new DefensaError('proveedor_fallo', 503);
}

const UNICO_REPETIDO = '23505';

export function crearClienteServicio(): SupabaseClient {
  const url = config.supabaseUrl();
  const llave = config.supabaseServicio();
  if (!url || !llave) throw new DefensaError('no_configurado', 503);
  return createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function crearRepoSupabase(db: SupabaseClient): RepoDefensa {
  async function uno<T>(operacion: string, consulta: PromiseLike<{ data: unknown; error: ErrorBd | null }>): Promise<T | null> {
    const { data, error } = await consulta;
    if (error) fallar(operacion, error);
    return data ? deFila<T>(data) : null;
  }

  async function exigirUno<T>(operacion: string, consulta: PromiseLike<{ data: unknown; error: ErrorBd | null }>): Promise<T> {
    const fila = await uno<T>(operacion, consulta);
    if (!fila) fallar(operacion, { code: 'sin_fila' });
    return fila;
  }

  async function varios<T>(operacion: string, consulta: PromiseLike<{ data: unknown[] | null; error: ErrorBd | null }>): Promise<T[]> {
    const { data, error } = await consulta;
    if (error) fallar(operacion, error);
    return (data ?? []).map((fila) => deFila<T>(fila));
  }

  async function ejecutar(operacion: string, consulta: PromiseLike<{ error: ErrorBd | null }>): Promise<void> {
    const { error } = await consulta;
    if (error) fallar(operacion, error);
  }

  return {
    // Actividades
    crearActividad: (datos) =>
      exigirUno<ActividadRow>('crearActividad', db.from(TABLAS.actividades).insert(aColumnas(datos)).select().single()),
    actividadPorTokenGrupo: (token) =>
      uno<ActividadRow>('actividadPorTokenGrupo', db.from(TABLAS.actividades).select('*').eq('token_grupo', token).maybeSingle()),
    actividadPorId: (id) =>
      uno<ActividadRow>('actividadPorId', db.from(TABLAS.actividades).select('*').eq('id', id).maybeSingle()),
    actualizarActividad: (id, parche) =>
      exigirUno<ActividadRow>(
        'actualizarActividad',
        db.from(TABLAS.actividades).update({ ...aColumnas(parche), actualizada_en: new Date().toISOString() }).eq('id', id).select().single(),
      ),
    async reservarEnvio(actividadId) {
      const { data, error } = await db.rpc('defensa_reservar_envio', { p_actividad: actividadId });
      if (error) fallar('reservarEnvio', error);
      return data === true;
    },
    async liberarEnvio(actividadId) {
      const { error } = await db.rpc('defensa_liberar_envio', { p_actividad: actividadId });
      if (error) fallar('liberarEnvio', error);
    },

    // Alumnos
    async upsertAlumno({ actividadId, matricula, nombre, modo, dispositivo, ahora }) {
      const buscar = () =>
        uno<AlumnoRow>(
          'upsertAlumno.buscar',
          db.from(TABLAS.alumnos).select('*').eq('actividad_id', actividadId).eq('matricula', matricula).maybeSingle(),
        );
      const existente = await buscar();
      const actualizar = async (id: string): Promise<AlumnoRow> =>
        exigirUno<AlumnoRow>(
          'upsertAlumno.actualizar',
          db
            .from(TABLAS.alumnos)
            .update({ ...(modo ? { modo_preferido: modo } : {}), ...(dispositivo ? { dispositivo } : {}), actualizado_en: ahora })
            .eq('id', id)
            .select()
            .single(),
        );
      if (existente) return { alumno: await actualizar(existente.id), nuevo: false };

      const { data, error } = await db
        .from(TABLAS.alumnos)
        .insert({
          actividad_id: actividadId,
          matricula,
          nombre,
          modo_preferido: modo,
          dispositivo,
          creado_en: ahora,
          actualizado_en: ahora,
        })
        .select()
        .single();
      if (!error) return { alumno: deFila<AlumnoRow>(data), nuevo: true };
      if (error.code !== UNICO_REPETIDO) fallar('upsertAlumno.insertar', error);
      // Dos entradas a la vez con la misma matrícula: la segunda reutiliza la fila de la primera.
      const ganador = await buscar();
      if (!ganador) fallar('upsertAlumno.carrera', error);
      return { alumno: await actualizar(ganador.id), nuevo: false };
    },
    alumnoPorId: (id) => uno<AlumnoRow>('alumnoPorId', db.from(TABLAS.alumnos).select('*').eq('id', id).maybeSingle()),
    alumnoPorMatricula: (actividadId, matricula) =>
      uno<AlumnoRow>(
        'alumnoPorMatricula',
        db.from(TABLAS.alumnos).select('*').eq('actividad_id', actividadId).eq('matricula', matricula).maybeSingle(),
      ),
    actualizarModoAlumno: (id, modo, ahora) =>
      ejecutar('actualizarModoAlumno', db.from(TABLAS.alumnos).update({ modo_preferido: modo, actualizado_en: ahora }).eq('id', id)),
    guardarConsentimientos: (alumnoId, items, ahora) =>
      ejecutar(
        'guardarConsentimientos',
        db.from(TABLAS.consentimientos).upsert(
          items.map((item) => ({
            alumno_id: alumnoId,
            tipo: item.tipo,
            aceptado: item.aceptado,
            version_aviso: item.versionAviso,
            aceptado_en: ahora,
          })),
          { onConflict: 'alumno_id,tipo,version_aviso' },
        ),
      ),

    // Entregas
    async crearEntrega(datos) {
      for (let intento = 0; intento < 4; intento += 1) {
        const ultima = await uno<{ version: number }>(
          'crearEntrega.version',
          db.from(TABLAS.entregas).select('version').eq('alumno_id', datos.alumnoId).order('version', { ascending: false }).limit(1).maybeSingle(),
        );
        const { data, error } = await db
          .from(TABLAS.entregas)
          .insert({ ...aColumnas(datos), version: (ultima?.version ?? 0) + 1, estado: datos.estado ?? 'pendiente' })
          .select()
          .single();
        if (!error) return deFila<EntregaRow>(data);
        // Dos subidas a la vez piden la misma versión: se reintenta con la siguiente.
        if (error.code !== UNICO_REPETIDO) fallar('crearEntrega', error);
      }
      throw new DefensaError('ocupado', 409);
    },
    entregaPorId: (id) => uno<EntregaRow>('entregaPorId', db.from(TABLAS.entregas).select('*').eq('id', id).maybeSingle()),
    ultimaEntrega: (alumnoId) =>
      uno<EntregaRow>(
        'ultimaEntrega',
        db.from(TABLAS.entregas).select('*').eq('alumno_id', alumnoId).order('version', { ascending: false }).limit(1).maybeSingle(),
      ),
    ultimaEntregaLista: (alumnoId) =>
      uno<EntregaRow>(
        'ultimaEntregaLista',
        db.from(TABLAS.entregas).select('*').eq('alumno_id', alumnoId).eq('estado', 'lista').order('version', { ascending: false }).limit(1).maybeSingle(),
      ),
    actualizarEntrega: (id, parche) =>
      exigirUno<EntregaRow>('actualizarEntrega', db.from(TABLAS.entregas).update(aColumnas(parche)).eq('id', id).select().single()),

    // Planes
    planPorId: (id) => uno<PlanRow>('planPorId', db.from(TABLAS.planes).select('*').eq('id', id).maybeSingle()),
    planDeEntrega: (entregaId) =>
      uno<PlanRow>('planDeEntrega', db.from(TABLAS.planes).select('*').eq('entrega_id', entregaId).maybeSingle()),
    async crearPlanSiNoExiste(entregaId, promptVersion, ahora) {
      const { data, error } = await db
        .from(TABLAS.planes)
        .insert({ entrega_id: entregaId, prompt_version: promptVersion, creado_en: ahora })
        .select()
        .single();
      if (!error) return { plan: deFila<PlanRow>(data), creado: true };
      if (error.code !== UNICO_REPETIDO) fallar('crearPlanSiNoExiste', error);
      const existente = await uno<PlanRow>(
        'crearPlanSiNoExiste.buscar',
        db.from(TABLAS.planes).select('*').eq('entrega_id', entregaId).maybeSingle(),
      );
      if (!existente) fallar('crearPlanSiNoExiste.carrera', error);
      return { plan: existente, creado: false };
    },
    actualizarPlan: (id, parche) =>
      exigirUno<PlanRow>('actualizarPlan', db.from(TABLAS.planes).update(aColumnas(parche)).eq('id', id).select().single()),

    // Defensas
    defensaPorId: (id) => uno<DefensaRow>('defensaPorId', db.from(TABLAS.defensas).select('*').eq('id', id).maybeSingle()),
    defensaEnCurso: (alumnoId, esEnsayo) =>
      uno<DefensaRow>(
        'defensaEnCurso',
        db.from(TABLAS.defensas).select('*').eq('alumno_id', alumnoId).eq('es_ensayo', esEnsayo).eq('estado', 'en_curso').maybeSingle(),
      ),
    ultimaDefensa: (alumnoId, esEnsayo) =>
      uno<DefensaRow>(
        'ultimaDefensa',
        db.from(TABLAS.defensas).select('*').eq('alumno_id', alumnoId).eq('es_ensayo', esEnsayo).order('iniciada_en', { ascending: false }).limit(1).maybeSingle(),
      ),
    async crearDefensa(datos) {
      const { data, error } = await db.from(TABLAS.defensas).insert(aColumnas(datos)).select().single();
      if (error?.code === UNICO_REPETIDO) throw new DefensaError('ocupado', 409);
      if (error) fallar('crearDefensa', error);
      return deFila<DefensaRow>(data);
    },
    actualizarDefensa: (id, parche) =>
      exigirUno<DefensaRow>('actualizarDefensa', db.from(TABLAS.defensas).update(aColumnas(parche)).eq('id', id).select().single()),
    defensasDeAlumno: (alumnoId) =>
      varios<DefensaRow>('defensasDeAlumno', db.from(TABLAS.defensas).select('*').eq('alumno_id', alumnoId).order('iniciada_en', { ascending: true })),

    // Turnos
    turnoPorId: (id) => uno<TurnoRow>('turnoPorId', db.from(TABLAS.turnos).select('*').eq('id', id).maybeSingle()),
    turnosDeDefensa: (defensaId) =>
      varios<TurnoRow>('turnosDeDefensa', db.from(TABLAS.turnos).select('*').eq('defensa_id', defensaId).order('numero', { ascending: true })),
    turnosDeDefensas: (defensaIds) =>
      defensaIds.length === 0
        ? Promise.resolve([])
        : varios<TurnoRow>(
            'turnosDeDefensas',
            db.from(TABLAS.turnos).select('*').in('defensa_id', [...defensaIds]).order('defensa_id').order('numero', { ascending: true }),
          ),
    async crearTurno(datos) {
      const { data, error } = await db.from(TABLAS.turnos).insert(aColumnas(datos)).select().single();
      if (error?.code === UNICO_REPETIDO) throw new DefensaError('ocupado', 409);
      if (error) fallar('crearTurno', error);
      return deFila<TurnoRow>(data);
    },
    actualizarTurno: (id, parche) =>
      exigirUno<TurnoRow>('actualizarTurno', db.from(TABLAS.turnos).update(aColumnas(parche)).eq('id', id).select().single()),
    registrarParteAudio: (turnoId, indice, ruta, bytes, ahora) =>
      ejecutar(
        'registrarParteAudio',
        db.from(TABLAS.partes).upsert({ turno_id: turnoId, indice, ruta, bytes, creada_en: ahora }, { onConflict: 'turno_id,indice' }),
      ),
    partesAudio: (turnoId) =>
      varios<ParteAudioRow>('partesAudio', db.from(TABLAS.partes).select('turno_id,indice,ruta,bytes').eq('turno_id', turnoId).order('indice', { ascending: true })),

    // Reportes y revisión
    reporteDeDefensa: (defensaId) =>
      uno<ReporteRow>('reporteDeDefensa', db.from(TABLAS.reportes).select('*').eq('defensa_id', defensaId).maybeSingle()),
    guardarReporte: (datos) =>
      exigirUno<ReporteRow>('guardarReporte', db.from(TABLAS.reportes).upsert(aColumnas(datos), { onConflict: 'defensa_id' }).select().single()),
    registrarToque: (defensaId, tipo, valor, ahora) =>
      ejecutar(
        'registrarToque',
        db.from(TABLAS.toques).upsert({ defensa_id: defensaId, tipo, valor, creado_en: ahora }, { onConflict: 'defensa_id,tipo' }),
      ),
    toquesDeDefensa: (defensaId) =>
      varios<ToqueRow>('toquesDeDefensa', db.from(TABLAS.toques).select('defensa_id,tipo,valor,creado_en').eq('defensa_id', defensaId)),
    async abrirTiempoRevision(defensaId, ahora) {
      const fila = await exigirUno<TiempoRevisionRow>(
        'abrirTiempoRevision',
        db.from(TABLAS.tiempos).insert({ defensa_id: defensaId, abierto_en: ahora, actualizado_en: ahora }).select().single(),
      );
      return fila.id;
    },
    async actualizarTiempoRevision(id, defensaId, activoMs, ahora) {
      const actual = await uno<TiempoRevisionRow>(
        'actualizarTiempoRevision.leer',
        db.from(TABLAS.tiempos).select('*').eq('id', id).eq('defensa_id', defensaId).maybeSingle(),
      );
      if (!actual) return false;
      await ejecutar(
        'actualizarTiempoRevision',
        db.from(TABLAS.tiempos).update({ activo_ms: Math.max(actual.activoMs, activoMs), actualizado_en: ahora }).eq('id', id),
      );
      return true;
    },
    tiemposDeRevision: (defensaId) =>
      varios<TiempoRevisionRow>('tiemposDeRevision', db.from(TABLAS.tiempos).select('*').eq('defensa_id', defensaId)),
    async listarAlumnosDeActividad(actividadId): Promise<AlumnoConEstado[]> {
      const [alumnos, entregas, defensas] = await Promise.all([
        varios<AlumnoRow>('listar.alumnos', db.from(TABLAS.alumnos).select('*').eq('actividad_id', actividadId)),
        varios<EntregaRow>(
          'listar.entregas',
          // El texto extraído pesa y la lista no lo necesita.
          db
            .from(TABLAS.entregas)
            .select('id,alumno_id,actividad_id,version,tipo,nombre_archivo,mime,bytes,paginas,palabras,ruta_original,estado,motivo,hash_sha256,tardia,creada_en,lista_en')
            .eq('actividad_id', actividadId)
            .order('version', { ascending: true }),
        ),
        varios<DefensaRow>(
          'listar.defensas',
          db.from(TABLAS.defensas).select('*').eq('actividad_id', actividadId).eq('es_ensayo', false).order('iniciada_en', { ascending: true }),
        ),
      ]);
      const ids = defensas.map((d) => d.id);
      const [reportes, toques] =
        ids.length === 0
          ? [[] as ReporteRow[], [] as ToqueRow[]]
          : await Promise.all([
              varios<ReporteRow>('listar.reportes', db.from(TABLAS.reportes).select('*').in('defensa_id', ids)),
              varios<ToqueRow>('listar.toques', db.from(TABLAS.toques).select('defensa_id,tipo,valor,creado_en').in('defensa_id', ids)),
            ]);
      return alumnos.map((alumno) => {
        const propias = defensas.filter((d) => d.alumnoId === alumno.id);
        const propiasIds = new Set(propias.map((d) => d.id));
        return {
          alumno,
          entregas: entregas.filter((e) => e.alumnoId === alumno.id).map((e) => ({ ...e, textoExtraido: null })),
          defensas: propias,
          reportes: reportes.filter((r) => propiasIds.has(r.defensaId)),
          toques: toques.filter((t) => propiasIds.has(t.defensaId)),
        };
      });
    },

    // Mantenimiento
    defensasConAudioPorBorrar: (terminadasAntesDe) =>
      varios<DefensaRow>(
        'defensasConAudioPorBorrar',
        db.from(TABLAS.defensas).select('*').is('audio_borrado_en', null).not('terminada_en', 'is', null).lte('terminada_en', terminadasAntesDe).limit(500),
      ),
    async marcarAudioBorrado(defensaIds, ahora) {
      if (defensaIds.length === 0) return;
      await ejecutar('marcarAudioBorrado', db.from(TABLAS.defensas).update({ audio_borrado_en: ahora }).in('id', [...defensaIds]));
    },
    defensasEnCursoIniciadasAntes: (antesDe) =>
      varios<DefensaRow>(
        'defensasEnCursoIniciadasAntes',
        db.from(TABLAS.defensas).select('*').eq('estado', 'en_curso').lt('iniciada_en', antesDe).limit(500),
      ),
    entregasPendientesAntesDe: (antesDe) =>
      varios<EntregaRow>(
        'entregasPendientesAntesDe',
        db.from(TABLAS.entregas).select('*').eq('estado', 'pendiente').lt('creada_en', antesDe).limit(500),
      ),

    // Eventos (tabla existente; ON CONFLICT DO NOTHING para que un reintento no cambie nada)
    async insertarEventos(filas: readonly LearningEventInsertRow[]) {
      if (filas.length === 0) return;
      await ejecutar('insertarEventos', db.from('eventos_de_aprendizaje').upsert([...filas], FIRST_WRITE_WINS_UPSERT_OPTIONS));
    },
  };
}

// ── Archivos ────────────────────────────────────────────────────────────────

export function crearArchivosSupabase(db: SupabaseClient): AlmacenArchivos {
  const cubo = (bucket: Bucket) => db.storage.from(BUCKETS[bucket]);

  return {
    async subir(bucket, ruta, datos, mime) {
      const { error } = await cubo(bucket).upload(ruta, datos, { contentType: mime, upsert: true });
      if (error) fallar('archivos.subir', { code: (error as { statusCode?: string }).statusCode });
    },
    async descargar(bucket, ruta) {
      const { data, error } = await cubo(bucket).download(ruta);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    async existe(bucket, ruta) {
      const separador = ruta.lastIndexOf('/');
      const carpeta = separador >= 0 ? ruta.slice(0, separador) : '';
      const nombre = separador >= 0 ? ruta.slice(separador + 1) : ruta;
      const { data, error } = await cubo(bucket).list(carpeta, { search: nombre, limit: 20 });
      if (error) fallar('archivos.existe', { code: (error as { statusCode?: string }).statusCode });
      return (data ?? []).some((archivo) => archivo.name === nombre);
    },
    async listar(bucket, carpeta) {
      const { data, error } = await cubo(bucket).list(carpeta, { limit: 1000 });
      if (error) fallar('archivos.listar', { code: (error as { statusCode?: string }).statusCode });
      return (data ?? [])
        .filter((archivo) => archivo.id !== null)
        .map((archivo) => ({ nombre: archivo.name, creadoEn: archivo.created_at ?? null }));
    },
    async borrar(bucket, rutas) {
      for (let i = 0; i < rutas.length; i += 100) {
        const { error } = await cubo(bucket).remove(rutas.slice(i, i + 100) as string[]);
        if (error) fallar('archivos.borrar', { code: (error as { statusCode?: string }).statusCode });
      }
    },
    async urlFirmadaDescarga(bucket, ruta, segundos, opciones) {
      const { data, error } = await cubo(bucket).createSignedUrl(
        ruta,
        segundos,
        opciones?.nombreDescarga ? { download: opciones.nombreDescarga } : undefined,
      );
      if (error || !data?.signedUrl) fallar('archivos.urlDescarga', { code: (error as { statusCode?: string } | null)?.statusCode });
      return data.signedUrl;
    },
    async urlFirmadaSubida(bucket, ruta) {
      const { data, error } = await cubo(bucket).createSignedUploadUrl(ruta);
      if (error || !data?.signedUrl) fallar('archivos.urlSubida', { code: (error as { statusCode?: string } | null)?.statusCode });
      // Las URL firmadas de subida duran dos horas en Supabase.
      return { url: data.signedUrl, expiraEn: Date.now() + 2 * 60 * 60 * 1000 };
    },
  };
}

export function crearAlmacenSupabase(): AlmacenDefensa {
  const db = crearClienteServicio();
  return { repo: crearRepoSupabase(db), archivos: crearArchivosSupabase(db) };
}
