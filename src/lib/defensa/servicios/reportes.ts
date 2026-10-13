import 'server-only';
import type { DefensaRow, ReporteGuardado, TurnoRow } from '../almacen/tipos';
import { PROMPT_VERSION_REPORTE, generarReporte, type TurnoParaReporte } from '../reporte';
import { buscarPregunta } from '../turnEngine';
import type { Ctx } from './contexto';

/**
 * Genera y guarda el reporte de una defensa real.
 *
 * El modelo propone niveles y citas; el código verifica cada cita contra la
 * transcripción y decide qué niveles se pueden afirmar (ver reporte.ts). Si el
 * modelo falla, el reporte queda en "error" y el profesor ve igualmente las
 * transcripciones, sin niveles.
 *
 * Es seguro llamarlo más de una vez: un reporte listo no se rehace, y uno que
 * sigue "generando" hace pocos minutos lo está haciendo otra solicitud.
 */

const REPORTE_EN_CURSO_MS = 3 * 60_000;

function aTurnoParaReporte(turno: TurnoRow, evidencia: string | null): TurnoParaReporte {
  const respuesta = turno.textoRespuesta ?? '';
  return {
    ref: turno.preguntaRef,
    tipo: turno.tipo,
    objetivoId: turno.objetivoId,
    pregunta: `${turno.contextoTexto} ${turno.preguntaTexto}`.trim(),
    evidencia,
    respuesta,
    modo: turno.modoRespuesta,
    clase: turno.clase,
    respondido: turno.modoRespuesta !== null && respuesta.trim().length > 0,
  };
}

export async function generarReporteDeDefensa(ctx: Ctx, defensaId: string): Promise<void> {
  const defensa: DefensaRow | null = await ctx.repo.defensaPorId(defensaId);
  if (!defensa || defensa.esEnsayo || (defensa.estado !== 'entregada' && defensa.estado !== 'incompleta')) return;

  const ahora = ctx.ahora();
  const previo = await ctx.repo.reporteDeDefensa(defensa.id);
  if (previo?.estado === 'listo') return;
  if (previo?.estado === 'generando' && ahora.getTime() - Date.parse(previo.creadoEn) < REPORTE_EN_CURSO_MS) return;

  const [actividad, plan, turnos] = await Promise.all([
    ctx.repo.actividadPorId(defensa.actividadId),
    ctx.repo.planPorId(defensa.planId),
    ctx.repo.turnosDeDefensa(defensa.id),
  ]);
  if (!actividad || !plan?.plan) return;
  const planListo = plan.plan;

  await ctx.repo.guardarReporte({
    defensaId: defensa.id,
    estado: 'generando',
    promptVersion: PROMPT_VERSION_REPORTE,
    proveedor: null,
    modelo: null,
    reporte: null,
    citasDescartadas: 0,
    creadoEn: ahora.toISOString(),
  });

  const turnosParaReporte = turnos.map((t) => aTurnoParaReporte(t, buscarPregunta(planListo, t.preguntaRef)?.evidencia ?? null));
  let guardado: ReporteGuardado | null = null;
  let proveedor: string | null = null;
  let modelo: string | null = null;
  let descartadas = 0;
  let estado: 'listo' | 'error' = 'error';

  try {
    const generado = await generarReporte(ctx.proveedores.llm, {
      registro: actividad.registro,
      objetivos: actividad.objetivos.map((o) => ({ id: o.id, text: o.text, sinPregunta: plan.objetivosSinEvidencia.includes(o.id) })),
      turnos: turnosParaReporte,
    });
    proveedor = generado.proveedor;
    modelo = generado.modelo;
    descartadas = generado.citasDescartadas;
    guardado = {
      version: 1,
      generadoEn: ctx.ahora().toISOString(),
      resumen: generado.resumen,
      objetivos: generado.objetivos,
    };
    estado = 'listo';
  } catch (error) {
    console.error('defensa_reporte_fallo', { nombre: error instanceof Error ? error.name : 'desconocido' });
  }

  await ctx.repo.guardarReporte({
    defensaId: defensa.id,
    estado,
    promptVersion: PROMPT_VERSION_REPORTE,
    proveedor,
    modelo,
    reporte: guardado,
    citasDescartadas: descartadas,
    creadoEn: ahora.toISOString(),
  });

  const niveles = guardado?.objetivos ?? [];
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'reporte',
    pasoId: 'reporte',
    actividadId: defensa.actividadId,
    actorId: defensa.alumnoId,
    clave: defensa.id,
    medidas: {
      defensaId: defensa.id,
      estado,
      promptVersion: PROMPT_VERSION_REPORTE,
      proveedor,
      modelo,
      citasDescartadas: descartadas,
      explico: niveles.filter((o) => o.nivel === 'explico').length,
      enParte: niveles.filter((o) => o.nivel === 'en_parte').length,
      noSalio: niveles.filter((o) => o.nivel === 'no_salio').length,
      sinEvidencia: niveles.filter((o) => o.nivel === 'sin_evidencia').length,
    },
  });
}
