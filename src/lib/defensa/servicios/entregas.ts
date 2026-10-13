import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type {
  EntregaCliente,
  RespuestaEntregaArchivo,
} from '../../../components/defensa/contrato';
import type { ActividadRow, EntregaRow } from '../almacen/tipos';
import { LIMITES } from '../config';
import { DefensaError, estadoInvalido, noEncontrado } from '../errores';
import { MIME_POR_TIPO, extraerTextoDeArchivo, extraerTextoPegado, type TipoArchivo } from '../extraerTexto';
import { LIMITS as LIMITES_PLAN } from '../questionPlan';
import type { Ctx } from './contexto';
import type { SesionAlumno } from './acceso';

/**
 * Entrega del trabajo.
 *
 * Regla de fondo: una falla técnica nunca le cuesta la entrega al alumno. Por eso
 * el trabajo "cuenta" desde que llega y se confirma, y la defensa puede fallar o
 * hacerse después sin que eso cambie la hora de entrega.
 *
 * El archivo viaja directo al bucket por un enlace firmado de subida (las funciones
 * de Vercel no aceptan cuerpos de más de 4.5 MB), y después una segunda llamada lo
 * confirma: el servidor lo baja, comprueba qué es, le saca el texto y lo da por
 * entregado. Si la subida directa no está disponible o falla, el archivo puede
 * subir por la API hasta 4 MB. El texto pegado se entrega en una sola llamada.
 */

const NOMBRE_MAX = 255;

export function extensionDe(nombre: string): TipoArchivo | null {
  const extension = nombre.toLowerCase().split('.').pop() ?? '';
  return extension === 'pdf' || extension === 'docx' ? extension : null;
}

/** Sin carpetas ni caracteres raros: es lo que ve el profesor y lo que se guarda al descargar. */
export function nombreSeguro(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? nombre;
  const limpio = base
    .replace(new RegExp('[\\u0000-\\u001F\\u007F<>:"|?*]', 'g'), '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOMBRE_MAX);
  return limpio || 'trabajo';
}

export function entregaACliente(entrega: EntregaRow): EntregaCliente {
  return {
    id: entrega.id,
    version: entrega.version,
    tipo: entrega.tipo,
    nombre: entrega.tipo === 'texto' ? 'Texto pegado' : entrega.nombreArchivo,
    paginas: entrega.paginas,
    palabras: entrega.palabras ?? 0,
    entregadaEn: entrega.listaEn ?? entrega.creadaEn,
    tardia: entrega.tardia,
  };
}

function pasadoElPlazo(actividad: ActividadRow, ahora: Date): boolean {
  return ahora.getTime() > Date.parse(actividad.fechaLimite);
}

/** Cuenta un envío del enlace; si no se puede, dice por qué (desactivado o límite). */
async function reservarEnvio(ctx: Ctx, actividad: ActividadRow): Promise<void> {
  if (await ctx.repo.reservarEnvio(actividad.id)) return;
  const actual = await ctx.repo.actividadPorId(actividad.id);
  throw new DefensaError(actual && !actual.enlaceActivo ? 'enlace_inactivo' : 'limite_envios', 403);
}

async function cerrarDefensasDeVersionesAnteriores(ctx: Ctx, alumnoId: string, entregaVigente: EntregaRow): Promise<void> {
  // "Sube otra versión antes de defender: se usa la última y se rehacen las preguntas."
  for (const esEnsayo of [false, true]) {
    const enCurso = await ctx.repo.defensaEnCurso(alumnoId, esEnsayo);
    if (!enCurso || enCurso.entregaId === entregaVigente.id) continue;
    const ahora = ctx.ahora().toISOString();
    const turnos = await ctx.repo.turnosDeDefensa(enCurso.id);
    const respondidas = turnos.filter((t) => t.estado === 'cerrado').length;
    await ctx.repo.actualizarDefensa(enCurso.id, { estado: 'abandonada', terminadaEn: ahora });
    await ctx.eventos.emitir({
      verbo: 'abandono_taller',
      evento: 'abandono',
      pasoId: esEnsayo ? 'ensayo' : 'defensa',
      actividadId: entregaVigente.actividadId,
      actorId: alumnoId,
      clave: enCurso.id,
      medidas: { defensaId: enCurso.id, esEnsayo, motivo: 'sustituida', respondidas },
    });
  }
}

export async function iniciarEntregaArchivo(
  ctx: Ctx,
  { alumno, actividad }: SesionAlumno,
  datos: { nombre: string; bytes: number; mime: string },
): Promise<RespuestaEntregaArchivo> {
  const tipo = extensionDe(datos.nombre);
  if (!tipo) throw new DefensaError('formato_no_aceptado', 415);
  if (!Number.isInteger(datos.bytes) || datos.bytes <= 0) throw new DefensaError('solicitud_invalida', 400);
  if (datos.bytes > LIMITES.archivoBytes) throw new DefensaError('demasiado_grande', 413);

  await reservarEnvio(ctx, actividad);
  const ahora = ctx.ahora();
  const ruta = `${actividad.id}/${alumno.id}/${randomUUID()}.${tipo}`;
  try {
    const entrega = await ctx.repo.crearEntrega({
      alumnoId: alumno.id,
      actividadId: actividad.id,
      tipo: 'archivo',
      nombreArchivo: nombreSeguro(datos.nombre),
      mime: MIME_POR_TIPO[tipo],
      bytes: datos.bytes,
      rutaOriginal: ruta,
      tardia: pasadoElPlazo(actividad, ahora),
      creadaEn: ahora.toISOString(),
    });
    const subida = await ctx.archivos.urlFirmadaSubida('trabajos', ruta);
    return { entregaId: entrega.id, subida, maxBytesPorApi: LIMITES.archivoPorApiBytes };
  } catch (error) {
    await ctx.repo.liberarEnvio(actividad.id);
    throw error;
  }
}

/** Respaldo: el archivo llega por la API (hasta 4 MB) cuando la subida directa no sirve. */
export async function subirArchivoPorApi(
  ctx: Ctx,
  { alumno }: SesionAlumno,
  entregaId: string,
  bytes: Uint8Array,
): Promise<void> {
  const entrega = await ctx.repo.entregaPorId(entregaId);
  if (!entrega || entrega.alumnoId !== alumno.id) throw noEncontrado();
  if (entrega.tipo !== 'archivo' || entrega.estado !== 'pendiente') throw estadoInvalido();
  if (bytes.byteLength === 0) throw new DefensaError('archivo_no_llego', 400);
  if (bytes.byteLength > LIMITES.archivoPorApiBytes) throw new DefensaError('demasiado_grande', 413);
  const tipo = extensionDe(entrega.nombreArchivo) ?? 'pdf';
  await ctx.archivos.subir('trabajos', entrega.rutaOriginal, bytes, MIME_POR_TIPO[tipo]);
}

export async function entregarTextoPegado(
  ctx: Ctx,
  { alumno, actividad }: SesionAlumno,
  texto: string,
): Promise<EntregaCliente> {
  const extraido = extraerTextoPegado(texto);
  if (extraido.palabras < LIMITES_PLAN.workMinWords) throw new DefensaError('trabajo_corto', 422);

  await reservarEnvio(ctx, actividad);
  const ahora = ctx.ahora();
  const ruta = `${actividad.id}/${alumno.id}/${randomUUID()}.txt`;
  try {
    const bytes = new TextEncoder().encode(extraido.texto);
    await ctx.archivos.subir('trabajos', ruta, bytes, 'text/plain');
    const creada = await ctx.repo.crearEntrega({
      alumnoId: alumno.id,
      actividadId: actividad.id,
      tipo: 'texto',
      nombreArchivo: 'texto-pegado.txt',
      mime: 'text/plain',
      bytes: bytes.byteLength,
      rutaOriginal: ruta,
      tardia: pasadoElPlazo(actividad, ahora),
      creadaEn: ahora.toISOString(),
    });
    const lista = await ctx.repo.actualizarEntrega(creada.id, {
      estado: 'lista',
      textoExtraido: extraido.texto,
      palabras: extraido.palabras,
      hashSha256: createHash('sha256').update(bytes).digest('hex'),
      listaEn: ahora.toISOString(),
    });
    await cerrarDefensasDeVersionesAnteriores(ctx, alumno.id, lista);
    await emitirEntrega(ctx, lista);
    return entregaACliente(lista);
  } catch (error) {
    await ctx.repo.liberarEnvio(actividad.id);
    throw error;
  }
}

async function emitirEntrega(ctx: Ctx, entrega: EntregaRow): Promise<void> {
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'entrega',
    pasoId: 'entrega',
    actividadId: entrega.actividadId,
    actorId: entrega.alumnoId,
    clave: entrega.id,
    medidas: {
      entregaId: entrega.id,
      version: entrega.version,
      tipo: entrega.tipo,
      estado: entrega.estado,
      motivo: entrega.motivo,
      bytes: entrega.bytes,
      paginas: entrega.paginas,
      palabras: entrega.palabras,
      tardia: entrega.tardia,
    },
  });
}

/**
 * Cierra la entrega de un archivo ya subido: lo baja, comprueba qué es, le saca el
 * texto y lo da por entregado. Si no sirve (formato, sin texto, muy corto) se borra
 * del bucket, se devuelve el envío al enlace y se explica por qué.
 */
export async function confirmarEntrega(ctx: Ctx, { alumno, actividad }: SesionAlumno, entregaId: string): Promise<EntregaCliente> {
  const entrega = await ctx.repo.entregaPorId(entregaId);
  if (!entrega || entrega.alumnoId !== alumno.id) throw noEncontrado();
  if (entrega.estado === 'lista') return entregaACliente(entrega);
  if (entrega.estado !== 'pendiente') throw new DefensaError(entrega.motivo === 'trabajo_corto' ? 'trabajo_corto' : 'sin_texto', 422);

  const bytes = await ctx.archivos.descargar('trabajos', entrega.rutaOriginal);
  if (!bytes || bytes.byteLength === 0) throw new DefensaError('archivo_no_llego', 409);

  const rechazar = async (estado: 'sin_texto' | 'rechazada', motivo: string, error: DefensaError): Promise<never> => {
    const fila = await ctx.repo.actualizarEntrega(entrega.id, { estado, motivo });
    await ctx.archivos.borrar('trabajos', [entrega.rutaOriginal]);
    await ctx.repo.liberarEnvio(actividad.id);
    await emitirEntrega(ctx, fila);
    throw error;
  };

  let extraido;
  try {
    extraido = await extraerTextoDeArchivo(bytes);
  } catch (error) {
    if (error instanceof DefensaError && error.codigo === 'sin_texto') return rechazar('sin_texto', error.codigo, error);
    if (error instanceof DefensaError && (error.codigo === 'formato_no_aceptado' || error.codigo === 'demasiado_grande')) {
      return rechazar('rechazada', error.codigo, error);
    }
    throw error;
  }
  if (extraido.palabras < LIMITES_PLAN.workMinWords) {
    return rechazar('rechazada', 'trabajo_corto', new DefensaError('trabajo_corto', 422));
  }

  const ahora = ctx.ahora();
  const lista = await ctx.repo.actualizarEntrega(entrega.id, {
    estado: 'lista',
    bytes: bytes.byteLength,
    paginas: extraido.paginas,
    palabras: extraido.palabras,
    textoExtraido: extraido.texto,
    hashSha256: createHash('sha256').update(bytes).digest('hex'),
    tardia: pasadoElPlazo(actividad, ahora),
    listaEn: ahora.toISOString(),
  });
  await cerrarDefensasDeVersionesAnteriores(ctx, alumno.id, lista);
  await emitirEntrega(ctx, lista);
  return entregaACliente(lista);
}

/** La última versión que ya sirve (lista), que es la que se defiende. Un intento posterior rechazado no la reemplaza. */
export async function entregaVigente(ctx: Ctx, alumnoId: string): Promise<EntregaRow | null> {
  return ctx.repo.ultimaEntregaLista(alumnoId);
}
