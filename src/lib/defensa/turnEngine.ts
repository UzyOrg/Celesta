import 'server-only';
import { PRESUPUESTO_DEFENSA } from './config';
import type { QuestionPlan } from './questionPlan';

/**
 * Motor de turnos de la defensa: función pura.
 *
 * Durante la defensa el modelo solo clasifica; quien decide qué se pregunta
 * después es este código. Con el mismo plan, la misma semilla guardada y el mismo
 * historial, siempre devuelve lo mismo, así que cualquier defensa se puede
 * reconstruir y cualquier decisión se puede explicar.
 *
 * Orden de una defensa:
 *   1. apertura (no se evalúa);
 *   2. un objetivo tras otro, en el orden del profesor: una candidata por
 *      objetivo, elegida al azar con la semilla, y como mucho una repregunta;
 *   3. una pregunta de transferencia;
 *   4. cierre.
 *
 * La repregunta depende de cómo se clasificó la respuesta:
 *   vaga o fuera de tema → se pide un ejemplo concreto;
 *   sólida → se profundiza, pero solo en la modalidad larga;
 *   sin respuesta → no se insiste: un silencio nunca corta ni castiga.
 *
 * Tiempo: pasado el 65 % del presupuesto ya no hay repreguntas. Al agotarlo, si
 * quedan objetivos sin preguntar se salta directo a la transferencia (una sola
 * pregunta que cubre uno de ellos) y se cierra.
 *
 * Turnos: hay un tope por modalidad. Una repregunta solo entra si después caben
 * todos los objetivos pendientes y la transferencia; así, en la modalidad corta
 * cabe una repregunta y en la larga hasta tres.
 */

export type Clase = 'solida' | 'vaga' | 'fuera_de_tema' | 'sin_respuesta';
export type TipoTurno = 'apertura' | 'candidata' | 'seguimiento' | 'transferencia';
export type DuracionDefensa = 'corta' | 'larga';
export type MotivoCierre = 'completo' | 'tiempo' | 'limite_de_turnos';

/** Fracción del presupuesto a partir de la cual ya no se hacen repreguntas. */
export const LIMITE_SUAVE = 0.65;

/** Lo mínimo que el motor necesita del plan; un QuestionPlan completo lo cumple. */
export interface PlanParaMotor {
  opener: string;
  objectives: ReadonlyArray<{
    objective_id: string;
    candidates: ReadonlyArray<{
      id: string;
      question: string;
      followup_if_vague: string;
      followup_if_solid: string;
    }>;
  }>;
  transfer: ReadonlyArray<{ id: string; objective_id: string; question: string }>;
}

/** Un turno ya cerrado. La apertura no lleva clase. */
export interface TurnoPrevio {
  ref: string;
  tipo: TipoTurno;
  objetivoId: string | null;
  clase: Clase | null;
}

export interface EntradaMotor {
  plan: PlanParaMotor;
  semilla: number;
  duracion: DuracionDefensa;
  historial: readonly TurnoPrevio[];
  /** Reloj activo de la defensa hasta ahora, sin las pausas de aclaración. */
  transcurridoMs: number;
  /** Candidatas ya usadas en el ensayo: se prefiere la otra del mismo objetivo. */
  evitar?: readonly string[];
}

export interface TurnoPlaneado {
  ref: string;
  tipo: TipoTurno;
  objetivoId: string | null;
  texto: string;
}

export type Decision =
  | { accion: 'preguntar'; turno: TurnoPlaneado }
  | { accion: 'cerrar'; motivo: MotivoCierre };

/**
 * FNV-1a de 32 bits más la mezcla final de MurmurHash3: simple, estable entre
 * plataformas y sin dependencias. La mezcla final importa: FNV-1a solo conserva
 * el último bit de la clave ("O1" y "O3" darían siempre la misma paridad y "O2"
 * la contraria), y aquí la paridad es justo lo que decide entre dos candidatas.
 */
function huella(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Elige un índice de 0 a n-1 que depende solo de la semilla y de la clave, nunca
 * del historial: la candidata de un objetivo es la misma sin importar cuántas
 * repreguntas hubo antes. Cambiar esta función cambiaría el resultado de toda
 * defensa ya guardada: hay una prueba que fija valores concretos.
 */
export function elegirIndice(semilla: number, clave: string, n: number): number {
  if (n <= 1) return 0;
  return huella(`${semilla}|${clave}`) % n;
}

function elegirCandidata(
  objetivo: PlanParaMotor['objectives'][number],
  semilla: number,
  evitar: readonly string[],
) {
  const libres = objetivo.candidates.filter((c) => !evitar.includes(c.id));
  const bolsa = libres.length > 0 ? libres : objetivo.candidates;
  return bolsa[elegirIndice(semilla, objetivo.objective_id, bolsa.length)];
}

function elegirTransferencia(plan: PlanParaMotor, semilla: number, objetivosPreguntados: ReadonlySet<string>) {
  if (plan.transfer.length === 0) return undefined;
  // Si algún objetivo se quedó sin preguntar (poco tiempo o sin candidatas), la
  // transferencia que lo toca es la que más evidencia nueva da.
  const sobreSinPreguntar = plan.transfer.filter((t) => !objetivosPreguntados.has(t.objective_id));
  const bolsa = sobreSinPreguntar.length > 0 ? sobreSinPreguntar : plan.transfer;
  return bolsa[elegirIndice(semilla, 'transferencia', bolsa.length)];
}

/**
 * Las preguntas que ya se conocen al empezar una defensa: la apertura, la candidata que la semilla
 * elige en cada objetivo y la transferencia del caso normal (todos los objetivos ya preguntados).
 * No dependen de lo que conteste la persona, así que su voz se puede crear de una vez y en
 * paralelo. Los seguimientos sí dependen de la respuesta, y la transferencia cambia si se acaba el
 * tiempo antes: esas se crean en el momento en que el motor las elige. Solo lee; no cambia
 * ninguna elección del motor.
 */
export function textosPrevisibles(plan: PlanParaMotor, semilla: number, evitar: readonly string[] = []): string[] {
  const textos = [plan.opener];
  const conCandidatas = plan.objectives.filter((o) => o.candidates.length > 0);
  for (const objetivo of conCandidatas) {
    const candidata = elegirCandidata(objetivo, semilla, evitar);
    if (candidata) textos.push(candidata.question);
  }
  const transferencia = elegirTransferencia(plan, semilla, new Set(conCandidatas.map((o) => o.objective_id)));
  if (transferencia) textos.push(transferencia.question);
  return Array.from(new Set(textos.filter((t) => t.trim().length > 0)));
}

function preguntar(turno: TurnoPlaneado): Decision {
  return { accion: 'preguntar', turno };
}

export function siguienteTurno(entrada: EntradaMotor): Decision {
  const { plan, semilla, duracion, historial, transcurridoMs } = entrada;
  const evitar = entrada.evitar ?? [];
  const { presupuestoMs, maxTurnos } = PRESUPUESTO_DEFENSA[duracion];

  if (historial.length >= maxTurnos) return { accion: 'cerrar', motivo: 'limite_de_turnos' };

  // 1 · Apertura.
  if (!historial.some((t) => t.tipo === 'apertura')) {
    return preguntar({ ref: 'apertura', tipo: 'apertura', objetivoId: null, texto: plan.opener });
  }

  const objetivosPreguntados = new Set(
    historial.flatMap((t) => (t.tipo === 'candidata' && t.objetivoId ? [t.objetivoId] : [])),
  );
  const transferenciaHecha = historial.some((t) => t.tipo === 'transferencia');
  const ultimo = historial[historial.length - 1];

  // 2 · Repregunta sobre la candidata que acaba de responderse. Solo si después
  // todavía caben los objetivos que faltan y la transferencia: la cobertura va
  // antes que la profundidad.
  const objetivosPorPreguntar = plan.objectives.filter(
    (o) => o.candidates.length > 0 && !objetivosPreguntados.has(o.objective_id),
  ).length;
  const transferenciaPendiente = !transferenciaHecha && plan.transfer.length > 0 ? 1 : 0;
  const cabeRepregunta = historial.length + 1 + objetivosPorPreguntar + transferenciaPendiente <= maxTurnos;
  if (ultimo && ultimo.tipo === 'candidata' && cabeRepregunta && transcurridoMs < presupuestoMs * LIMITE_SUAVE) {
    const objetivo = plan.objectives.find((o) => o.objective_id === ultimo.objetivoId);
    const candidata = objetivo?.candidates.find((c) => c.id === ultimo.ref);
    if (candidata) {
      if (ultimo.clase === 'vaga' || ultimo.clase === 'fuera_de_tema') {
        return preguntar({
          ref: `${candidata.id}:vaga`,
          tipo: 'seguimiento',
          objetivoId: ultimo.objetivoId,
          texto: candidata.followup_if_vague,
        });
      }
      if (ultimo.clase === 'solida' && duracion === 'larga') {
        return preguntar({
          ref: `${candidata.id}:solida`,
          tipo: 'seguimiento',
          objetivoId: ultimo.objetivoId,
          texto: candidata.followup_if_solid,
        });
      }
    }
  }

  // 3 · Se acabó el tiempo: transferencia (si no se hizo) y cierre.
  if (transcurridoMs >= presupuestoMs) {
    if (!transferenciaHecha) {
      const t = elegirTransferencia(plan, semilla, objetivosPreguntados);
      if (t) return preguntar({ ref: t.id, tipo: 'transferencia', objetivoId: t.objective_id, texto: t.question });
    }
    return { accion: 'cerrar', motivo: 'tiempo' };
  }

  // 4 · El siguiente objetivo que tenga candidatas y no se haya preguntado.
  const pendiente = plan.objectives.find(
    (o) => o.candidates.length > 0 && !objetivosPreguntados.has(o.objective_id),
  );
  if (pendiente) {
    const candidata = elegirCandidata(pendiente, semilla, evitar);
    if (candidata) {
      return preguntar({
        ref: candidata.id,
        tipo: 'candidata',
        objetivoId: pendiente.objective_id,
        texto: candidata.question,
      });
    }
  }

  // 5 · Transferencia.
  if (!transferenciaHecha) {
    const t = elegirTransferencia(plan, semilla, objetivosPreguntados);
    if (t) return preguntar({ ref: t.id, tipo: 'transferencia', objetivoId: t.objective_id, texto: t.question });
  }

  return { accion: 'cerrar', motivo: 'completo' };
}

/** Lo que el plan sabe de una referencia, incluido lo que el alumno nunca ve. */
export interface PreguntaDelPlan {
  ref: string;
  tipo: TipoTurno;
  objetivoId: string | null;
  texto: string;
  /** Qué razonamiento mostraría comprensión. Solo para el clasificador y el reporte. */
  evidencia: string | null;
  /** Fragmento literal del trabajo del que sale la pregunta. */
  ancla: string | null;
}

/** Busca en el plan la pregunta a la que se refiere un turno guardado. */
export function buscarPregunta(plan: QuestionPlan | PlanParaMotor, ref: string): PreguntaDelPlan | null {
  if (ref === 'apertura') {
    return { ref, tipo: 'apertura', objetivoId: null, texto: plan.opener, evidencia: null, ancla: null };
  }
  const [base, sufijo] = ref.split(':') as [string, string | undefined];

  for (const objetivo of plan.objectives) {
    const candidata = objetivo.candidates.find((c) => c.id === base);
    if (!candidata) continue;
    const evidencia = 'evidence' in candidata ? (candidata as { evidence: string }).evidence : null;
    const ancla = 'anchor' in candidata ? ((candidata as { anchor: string | null }).anchor ?? null) : null;
    if (sufijo === 'vaga') {
      return { ref, tipo: 'seguimiento', objetivoId: objetivo.objective_id, texto: candidata.followup_if_vague, evidencia, ancla };
    }
    if (sufijo === 'solida') {
      return { ref, tipo: 'seguimiento', objetivoId: objetivo.objective_id, texto: candidata.followup_if_solid, evidencia, ancla };
    }
    if (sufijo === undefined) {
      return { ref, tipo: 'candidata', objetivoId: objetivo.objective_id, texto: candidata.question, evidencia, ancla };
    }
  }

  const transferencia = plan.transfer.find((t) => t.id === ref);
  if (transferencia && sufijo === undefined) {
    const evidencia = 'evidence' in transferencia ? (transferencia as { evidence: string }).evidence : null;
    const ancla = 'anchor' in transferencia ? (transferencia as { anchor: string }).anchor : null;
    return {
      ref,
      tipo: 'transferencia',
      objetivoId: transferencia.objective_id,
      texto: transferencia.question,
      evidencia,
      ancla,
    };
  }
  return null;
}

/**
 * Separa lo que dice la voz en dos partes para la pantalla: la frase de contexto
 * ("Elegiste una encuesta en línea en vez de entrevistas.") y la pregunta en sí,
 * que empieza en el último ¿. Las dos se leen siempre juntas en el audio.
 */
export function separarContexto(texto: string): { contexto: string; pregunta: string } {
  const limpio = texto.trim();
  const inicio = limpio.lastIndexOf('¿');
  if (inicio <= 0) return { contexto: '', pregunta: limpio };
  return { contexto: limpio.slice(0, inicio).trim(), pregunta: limpio.slice(inicio).trim() };
}
