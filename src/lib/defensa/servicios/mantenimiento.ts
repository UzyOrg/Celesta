import 'server-only';
import { LIMITES } from '../config';
import type { Ctx } from './contexto';
import { cerrarPorInactividad, ultimaActividad } from './defensas';
import { generarReporteDeDefensa } from './reportes';

/**
 * Tareas de limpieza que corren una vez al día (ver vercel.json → crons):
 *
 *  1. El audio se borra a los 7 días de terminada la defensa (el ensayo también).
 *     Las transcripciones, los trabajos y los toques del profesor se quedan hasta
 *     90 días después de cerrar la cohorte; ese borrado es una decisión pendiente.
 *  2. Una defensa en curso que nadie toca hace 24 horas se cierra: "incompleta" si
 *     ya había respuestas, "abandonada" si no. Las incompletas de verdad reciben
 *     su reporte, para que el profesor las vea tal como quedaron.
 *  3. Una entrega que nunca llegó al bucket se descarta y devuelve su envío.
 *  4. Los zips de "descargar todos" duran un día.
 *
 * Es seguro correrla más de una vez: cada paso mira el estado actual.
 */

const MAX_REPORTES_POR_CORRIDA = 10;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export interface ResumenMantenimiento {
  defensasSinAudio: number;
  archivosDeAudioBorrados: number;
  defensasCerradas: number;
  reportesGenerados: number;
  entregasDescartadas: number;
  zipsBorrados: number;
}

export async function ejecutarMantenimiento(ctx: Ctx): Promise<ResumenMantenimiento> {
  const resumen: ResumenMantenimiento = {
    defensasSinAudio: 0,
    archivosDeAudioBorrados: 0,
    defensasCerradas: 0,
    reportesGenerados: 0,
    entregasDescartadas: 0,
    zipsBorrados: 0,
  };
  const ahora = ctx.ahora();

  // 1 · Audio de más de siete días.
  const vencidas = await ctx.repo.defensasConAudioPorBorrar(new Date(ahora.getTime() - LIMITES.audioRetencionMs).toISOString());
  for (const defensa of vencidas) {
    const turnos = await ctx.repo.turnosDeDefensa(defensa.id);
    const rutas = new Set<string>();
    for (const turno of turnos) {
      if (turno.audioRuta) rutas.add(turno.audioRuta);
      for (const parte of await ctx.repo.partesAudio(turno.id)) rutas.add(parte.ruta);
    }
    if (rutas.size > 0) await ctx.archivos.borrar('audio', Array.from(rutas));
    for (const turno of turnos) {
      if (turno.audioRuta) await ctx.repo.actualizarTurno(turno.id, { audioRuta: null });
    }
    await ctx.repo.marcarAudioBorrado([defensa.id], ahora.toISOString());
    resumen.defensasSinAudio += 1;
    resumen.archivosDeAudioBorrados += rutas.size;
    await ctx.eventos.emitir({
      verbo: 'completo_paso',
      evento: 'audio_borrado',
      pasoId: 'mantenimiento',
      actividadId: defensa.actividadId,
      actorId: defensa.alumnoId,
      clave: defensa.id,
      medidas: { defensaId: defensa.id, esEnsayo: defensa.esEnsayo, archivos: rutas.size },
    });
  }

  // 2 · Defensas abandonadas a medias.
  const inactivas = await ctx.repo.defensasEnCursoIniciadasAntes(new Date(ahora.getTime() - LIMITES.inactividadMs).toISOString());
  const porReportar: string[] = [];
  for (const defensa of inactivas) {
    const turnos = await ctx.repo.turnosDeDefensa(defensa.id);
    if (ahora.getTime() - ultimaActividad(defensa, turnos) < LIMITES.inactividadMs) continue;
    const cerrada = await cerrarPorInactividad(ctx, defensa);
    resumen.defensasCerradas += 1;
    if (!cerrada.esEnsayo && cerrada.estado === 'incompleta') porReportar.push(cerrada.id);
  }
  for (const id of porReportar.slice(0, MAX_REPORTES_POR_CORRIDA)) {
    await generarReporteDeDefensa(ctx, id);
    resumen.reportesGenerados += 1;
  }

  // 3 · Entregas que nunca llegaron.
  const pendientes = await ctx.repo.entregasPendientesAntesDe(new Date(ahora.getTime() - LIMITES.entregaPendienteMs).toISOString());
  for (const entrega of pendientes) {
    if (await ctx.archivos.existe('trabajos', entrega.rutaOriginal)) await ctx.archivos.borrar('trabajos', [entrega.rutaOriginal]);
    await ctx.repo.actualizarEntrega(entrega.id, { estado: 'rechazada', motivo: 'no_llego' });
    await ctx.repo.liberarEnvio(entrega.actividadId);
    resumen.entregasDescartadas += 1;
  }

  // 4 · Zips de más de un día. El nombre lleva el momento en que se armó: <actividad>_<milisegundos>.zip
  const zips = await ctx.archivos.listar('trabajos', 'zips');
  const viejos = zips
    .filter((zip) => {
      const armado = Number(/_(\d{10,})\.zip$/.exec(zip.nombre)?.[1]);
      return Number.isFinite(armado) && ahora.getTime() - armado >= UN_DIA_MS;
    })
    .map((zip) => `zips/${zip.nombre}`);
  if (viejos.length > 0) await ctx.archivos.borrar('trabajos', viejos);
  resumen.zipsBorrados = viejos.length;

  return resumen;
}
