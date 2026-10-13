import 'server-only';
import { createHash } from 'node:crypto';
import type { EstadoPlanCliente } from '../../../components/defensa/contrato';
import type { ActividadRow, EntregaRow, PlanRow } from '../almacen/tipos';
import type { MensajeLlm, RespuestaJson } from '../providers/tipos';
import {
  PROMPT_VERSION,
  QUESTION_PLAN_SYSTEM,
  buildQuestionPlanUser,
  prepareWorkText,
  questionPlanJsonSchema,
  repairMessage,
  validateQuestionPlan,
  validateQuestionPlanInput,
  type Issue,
  type QuestionPlan,
  type QuestionPlanInput,
  type ValidationResult,
} from '../questionPlan';
import type { Ctx } from './contexto';
import { entregaVigente } from './entregas';
import type { SesionAlumno } from './acceso';

/**
 * El plan de preguntas de una entrega.
 *
 * Se arma mientras el alumno hace la prueba de micrófono: el modelo lee el trabajo
 * y propone preguntas, el código las valida (anclas literales, una sola pregunta,
 * longitud para voz...), y si algo no pasa se reintenta una vez con el motivo. Cada
 * pregunta se sintetiza UNA vez y se guarda; durante la defensa no se sintetiza nada.
 *
 * El plan guardado nunca sale del servidor: el navegador solo recibe la pregunta del
 * turno en curso.
 */

/** Un plan "generando" más viejo que esto se da por atascado y se puede retomar. */
const PLAN_OBSOLETO_MS = 120_000;
const MAX_INTENTOS = 3;
const PRESUPUESTO_TOTAL_MS = 52_000;
const TIMEOUT_TTS_MS = 14_000;
const CONCURRENCIA_TTS = 5;

export const CLAVE_AUDIO_ACLARACION = 'fija:aclaracion';

export function fraseDeAclaracion(registro: 'tu' | 'usted'): string {
  return registro === 'usted'
    ? 'No le entendí una parte, está en su pantalla.'
    : 'No te entendí una parte, está en tu pantalla.';
}

/** Identifica el texto de una pregunta para encontrar su audio; texto igual, audio igual. */
export function huellaDeTexto(texto: string): string {
  return createHash('sha1').update(texto.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);
}

export function audioDeTexto(plan: Pick<PlanRow, 'audios'>, texto: string): string | null {
  return plan.audios[huellaDeTexto(texto)] ?? null;
}

export interface ResultadoPreparacion {
  estado: EstadoPlanCliente;
  /** Trabajo largo por hacer (generar el plan); null si no hay nada que lanzar. */
  trabajo: (() => Promise<void>) | null;
}

/**
 * Deja el plan listo para generarse, sin esperar: crea la fila si no existe y
 * devuelve el trabajo pendiente. La ruta decide si lo espera o lo manda al
 * segundo plano; llamarlo dos veces seguidas no genera dos planes.
 */
export async function prepararPlan(ctx: Ctx, sesion: SesionAlumno): Promise<ResultadoPreparacion> {
  const entrega = await entregaVigente(ctx, sesion.alumno.id);
  if (!entrega) return { estado: 'sin_entrega', trabajo: null };

  const ahora = ctx.ahora();
  const { plan, creado } = await ctx.repo.crearPlanSiNoExiste(entrega.id, PROMPT_VERSION, ahora.toISOString());

  if (creado) {
    await ctx.repo.actualizarPlan(plan.id, { intentos: 1 });
    return { estado: 'generando', trabajo: () => generarPlan(ctx, sesion.actividad, entrega, plan.id) };
  }
  if (plan.estado === 'listo' || plan.estado === 'no_corresponde') return { estado: plan.estado, trabajo: null };

  const edad = ahora.getTime() - Date.parse(plan.creadoEn);
  if (plan.estado === 'generando' && edad < PLAN_OBSOLETO_MS) return { estado: 'generando', trabajo: null };
  if (plan.intentos >= MAX_INTENTOS) return { estado: 'error', trabajo: null };

  // Falló, o se quedó atascado: el alumno (o la propia pantalla) pide otro intento.
  await ctx.repo.actualizarPlan(plan.id, { estado: 'generando', creadoEn: ahora.toISOString(), intentos: plan.intentos + 1 });
  return { estado: 'generando', trabajo: () => generarPlan(ctx, sesion.actividad, entrega, plan.id) };
}

/** El estado del plan de la entrega vigente, sin tocar nada. */
export async function estadoDelPlan(ctx: Ctx, alumnoId: string): Promise<{ estado: EstadoPlanCliente; entrega: EntregaRow | null; plan: PlanRow | null }> {
  const entrega = await entregaVigente(ctx, alumnoId);
  if (!entrega) return { estado: 'sin_entrega', entrega: null, plan: null };
  const plan = await ctx.repo.planDeEntrega(entrega.id);
  if (!plan) return { estado: 'generando', entrega, plan: null };
  const obsoleto = plan.estado === 'generando' && ctx.ahora().getTime() - Date.parse(plan.creadoEn) >= PLAN_OBSOLETO_MS;
  return { estado: obsoleto ? 'error' : plan.estado, entrega, plan };
}

function entradaDelPlan(actividad: ActividadRow, textoDelTrabajo: string): QuestionPlanInput {
  return {
    assignmentInstructions: actividad.consigna,
    // El modelo solo ve el id y el texto; los apodos que usa la pantalla del profesor no salen de aquí.
    objectives: actividad.objetivos.map((o) => ({ id: o.id, text: o.text })),
    rubric: actividad.rubrica ?? undefined,
    teacherExamples: actividad.ejemplosDocente ?? undefined,
    courseContext: actividad.contextoCurso ?? undefined,
    register: actividad.registro,
    workText: textoDelTrabajo,
  };
}

async function conConcurrencia<T>(items: readonly T[], limite: number, hacer: (item: T) => Promise<void>): Promise<void> {
  let siguiente = 0;
  const obreros = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (siguiente < items.length) {
      const actual = items[siguiente];
      siguiente += 1;
      await hacer(actual as T);
    }
  });
  await Promise.all(obreros);
}

function textosParaVoz(plan: QuestionPlan): string[] {
  const textos = [plan.opener];
  for (const objetivo of plan.objectives) {
    for (const c of objetivo.candidates) textos.push(c.question, c.followup_if_vague, c.followup_if_solid);
  }
  for (const t of plan.transfer) textos.push(t.question);
  return Array.from(new Set(textos.filter((t) => t.trim().length > 0)));
}

function aProblemas(issues: readonly Issue[]): PlanRow['problemas'] {
  return issues.map((i) => ({ severity: i.severity, path: i.path, message: i.message.slice(0, 400) }));
}

/**
 * Genera el plan de una entrega. No lanza: cualquier falla deja el plan en
 * "error" (con el motivo en `problemas`) para que el alumno pueda pedir otro
 * intento sin perder su entrega.
 */
export async function generarPlan(ctx: Ctx, actividad: ActividadRow, entrega: EntregaRow, planId: string): Promise<void> {
  const inicio = ctx.ahora().getTime();
  const restante = () => PRESUPUESTO_TOTAL_MS - (ctx.ahora().getTime() - inicio);
  let proveedor: string | null = null;
  let modelo: string | null = null;
  let intentosLlm = 0;
  let audiosOk = 0;
  let audiosTotal = 0;

  const terminar = async (
    estado: 'error' | 'no_corresponde',
    problemas: PlanRow['problemas'],
    plan: QuestionPlan | null = null,
  ): Promise<void> => {
    await ctx.repo.actualizarPlan(planId, { estado, problemas, plan, proveedor, modelo });
    await emitirPlan(ctx, actividad, entrega, { estado, intentosLlm, audiosOk, audiosTotal, ms: ctx.ahora().getTime() - inicio, sinEvidencia: 0, proveedor, modelo });
  };

  try {
    const preparado = prepareWorkText(entrega.textoExtraido ?? '');
    if (!preparado.ok) {
      return await terminar('error', [{ severity: 'error', path: 'workText', message: 'el trabajo es muy corto' }]);
    }
    const entrada = entradaDelPlan(actividad, preparado.text);
    const deEntrada = validateQuestionPlanInput(entrada);
    if (deEntrada.length > 0) return await terminar('error', aProblemas(deEntrada));

    // ── El modelo propone y el código valida; un reintento con el motivo ──
    const mensajes: MensajeLlm[] = [{ rol: 'user', contenido: buildQuestionPlanUser(entrada) }];
    let resultado: ValidationResult | null = null;
    for (let intento = 0; intento < 2 && restante() > 15_000; intento += 1) {
      intentosLlm += 1;
      let respuesta: RespuestaJson;
      try {
        respuesta = await ctx.proveedores.llm.generarJson({
          tarea: 'plan',
          system: QUESTION_PLAN_SYSTEM,
          mensajes,
          esquema: { nombre: 'plan_de_preguntas', json: questionPlanJsonSchema() },
          maxTokens: 6_000,
          timeoutMs: Math.min(intento === 0 ? 38_000 : 24_000, restante() - 8_000),
        });
      } catch {
        continue;
      }
      proveedor = respuesta.proveedor;
      modelo = respuesta.modelo;
      resultado = validateQuestionPlan(respuesta.json, entrada);
      if (resultado.ok || resultado.plan?.status === 'no_corresponde') break;
      mensajes.push({ rol: 'assistant', contenido: JSON.stringify(respuesta.json) }, { rol: 'user', contenido: repairMessage(resultado.issues) });
    }

    if (!resultado) return await terminar('error', [{ severity: 'error', path: 'modelo', message: 'el modelo no respondió' }]);
    if (resultado.plan?.status === 'no_corresponde') return await terminar('no_corresponde', aProblemas(resultado.issues));

    const plan = resultado.plan;
    const utilizable = plan !== null && plan.status === 'ok' && plan.objectives.some((o) => o.candidates.length > 0);
    if (!plan || !utilizable) return await terminar('error', aProblemas(resultado.issues));

    // ── La voz: cada pregunta se sintetiza una vez y se guarda ──
    const audios: Record<string, string> = {};
    const textos = textosParaVoz(plan);
    audiosTotal = textos.length + 1;
    const sintetizar = async (clave: string, texto: string, ruta: (extension: string) => string): Promise<void> => {
      if (restante() < 3_000) return;
      try {
        const audio = await ctx.proveedores.tts.sintetizar(texto, { timeoutMs: Math.min(TIMEOUT_TTS_MS, restante()) });
        const destino = ruta(audio.extension);
        await ctx.archivos.subir('audio', destino, audio.bytes, audio.mime);
        audios[clave] = destino;
        audiosOk += 1;
      } catch {
        // Sin voz esa pregunta se lee igual: siempre está escrita.
      }
    };
    await sintetizar(CLAVE_AUDIO_ACLARACION, fraseDeAclaracion(actividad.registro), (ext) => `preguntas/${planId}/aclaracion.${ext}`);
    await conConcurrencia(textos, CONCURRENCIA_TTS, (texto) =>
      sintetizar(huellaDeTexto(texto), texto, (ext) => `preguntas/${planId}/${huellaDeTexto(texto)}.${ext}`),
    );

    await ctx.repo.actualizarPlan(planId, {
      estado: 'listo',
      plan,
      problemas: aProblemas(resultado.issues),
      objetivosSinEvidencia: resultado.withoutEvidence,
      audios,
      proveedor,
      modelo,
      listoEn: ctx.ahora().toISOString(),
    });
    await emitirPlan(ctx, actividad, entrega, {
      estado: 'listo',
      intentosLlm,
      audiosOk,
      audiosTotal,
      ms: ctx.ahora().getTime() - inicio,
      sinEvidencia: resultado.withoutEvidence.length,
      proveedor,
      modelo,
    });
  } catch (error) {
    console.error('defensa_plan_fallo', { nombre: error instanceof Error ? error.name : 'desconocido' });
    try {
      await terminar('error', [{ severity: 'error', path: 'plan', message: 'falla interna al armar el plan' }]);
    } catch {
      // Si ni siquiera se puede guardar, el plan queda "generando" y se retoma solo pasado el plazo.
    }
  }
}

async function emitirPlan(
  ctx: Ctx,
  actividad: ActividadRow,
  entrega: EntregaRow,
  datos: {
    estado: string;
    intentosLlm: number;
    audiosOk: number;
    audiosTotal: number;
    ms: number;
    sinEvidencia: number;
    proveedor: string | null;
    modelo: string | null;
  },
): Promise<void> {
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'plan',
    pasoId: 'plan',
    actividadId: actividad.id,
    actorId: entrega.alumnoId,
    clave: `${entrega.id}:${datos.estado}:${datos.intentosLlm}`,
    medidas: {
      entregaId: entrega.id,
      estado: datos.estado,
      promptVersion: PROMPT_VERSION,
      proveedor: datos.proveedor,
      modelo: datos.modelo,
      intentosLlm: datos.intentosLlm,
      objetivosSinEvidencia: datos.sinEvidencia,
      audiosGenerados: datos.audiosOk,
      audiosTotal: datos.audiosTotal,
      ms: datos.ms,
    },
  });
}
