"use client";

import { trackEvent, type TrackEventResult } from '@/lib/track';
import type { CrearConstructState } from './constructState';
import type {
  CrearBaselineGate,
  CrearClassifierSource,
  CrearFase,
  CrearLearningOpportunity,
  CrearResponseCategory,
  CrearResponsePartAnswer,
  CrearTelemetryResult,
} from './types';

interface TrackCrearProductionReading {
  expressedCategory?: CrearResponseCategory | null;
  formWellFormed?: boolean;
  subjectPresent?: boolean;
  certaintyConsistent?: boolean;
}

interface TrackCrearAnswerInput {
  tallerId: string;
  pasoId: string;
  fase: CrearFase;
  correcto: boolean;
  rama: string;
  texto?: string;
  partes?: CrearResponsePartAnswer[];
  mapping?: Record<string, CrearResponseCategory>;
  assisted?: boolean;
  targetCategory?: CrearResponseCategory;
  statementId?: string;
  score?: number;
  latencyMs?: number;
  checksum?: string;
  intento?: number;
  attempt?: number;
  studyId?: string;
  classifierSource?: CrearClassifierSource;
  classifierAgreed?: boolean;
  baselineGate?: CrearBaselineGate;
  observed?: boolean;
  shownOrder?: string[];
  learningOpportunity?: CrearLearningOpportunity;
  classToken?: string;
}

type TrackCrearAnswerPayload = TrackCrearAnswerInput & TrackCrearProductionReading;

interface TrackCrearStepInput {
  tallerId: string;
  pasoId: string;
  checksum?: string;
  studyId?: string;
  /**
   * Without it `class_token` lands null, and every teacher-facing read filters
   * on that column — the rows exist and nothing can retrieve them. See
   * `docs/adr/0008`.
   */
  classToken?: string;
}

export async function trackCrearAnswer(input: TrackCrearAnswerPayload): Promise<void> {
  const result: CrearTelemetryResult = {
    fase: input.fase,
    correcto: input.correcto,
    rama: input.rama,
  };

  const partes = input.partes
    ?.map((part) => ({
      ...part,
      texto: part.texto.trim(),
    }))
    .filter((part) => part.texto.length > 0);
  const texto = input.texto?.trim() || partes?.map((part) => part.texto).join('\n');

  if (texto) {
    result.texto = texto;
  }

  if (partes && partes.length > 0) {
    result.partes = partes;
  }

  if (input.mapping) {
    result.mapping = input.mapping;
  }

  if (typeof input.assisted === 'boolean') {
    result.assisted = input.assisted;
  }

  if (input.targetCategory) {
    result.targetCategory = input.targetCategory;
  }

  if (input.statementId) {
    result.statementId = input.statementId;
  }

  if (typeof input.score === 'number') {
    result.score = input.score;
  }

  if (typeof input.latencyMs === 'number' && Number.isFinite(input.latencyMs)) {
    result.latencyMs = Math.max(0, Math.round(input.latencyMs));
  }

  const attempt = input.attempt ?? input.intento;
  if (typeof attempt === 'number') {
    result.attempt = attempt;
    result.intento = attempt;
  }

  if (input.studyId) {
    result.studyId = input.studyId;
  }

  if (input.classifierSource) {
    result.classifierSource = input.classifierSource;
  }

  if (typeof input.classifierAgreed === 'boolean') {
    result.classifierAgreed = input.classifierAgreed;
  }

  if (input.baselineGate) {
    result.baselineGate = input.baselineGate;
  }

  if (typeof input.observed === 'boolean') {
    result.observed = input.observed;
  }

  if (input.shownOrder && input.shownOrder.length > 0) {
    result.shownOrder = input.shownOrder;
  }

  /**
   * The structural reading of a production attempt. `expressedCategory` is
   * explicitly allowed to be `null` — "no past modal appeared at all" is a
   * finding, and dropping it would make it indistinguishable from a step that
   * never ran the reading.
   */
  if (input.expressedCategory !== undefined) {
    result.expressedCategory = input.expressedCategory;
  }

  if (typeof input.formWellFormed === 'boolean') {
    result.formWellFormed = input.formWellFormed;
  }

  if (typeof input.subjectPresent === 'boolean') {
    result.subjectPresent = input.subjectPresent;
  }

  if (typeof input.certaintyConsistent === 'boolean') {
    result.certaintyConsistent = input.certaintyConsistent;
  }

  if (input.learningOpportunity) {
    result.learningOpportunity = input.learningOpportunity;
  }

  await trackEvent('envio_respuesta', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result,
    checksum: input.checksum,
    classToken: input.classToken,
  });
}

export async function trackCrearStart(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('inicio_taller', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
    classToken: input.classToken,
  });
}

export async function trackCrearStepComplete(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('completo_paso', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
    classToken: input.classToken,
  });
}

export async function trackCrearRetestScheduled(
  input: TrackCrearStepInput & { retestDelayHours: number }
): Promise<TrackEventResult> {
  return trackEvent('completo_paso', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: {
      ...(input.studyId ? { studyId: input.studyId } : {}),
      milestone: 'day1_complete',
      retestDelayHours: input.retestDelayHours,
    },
    checksum: input.checksum,
    classToken: input.classToken,
    clientEventId: input.studyId
      ? `crear:${input.studyId}:day1_complete`
      : undefined,
  });
}

export type CrearMarketProbeMoment = 'day1' | 'day7';
export type CrearMarketProbeStage = 'opened' | 'objective_selected' | 'registered';

export async function trackCrearMarketSignal(
  input: TrackCrearStepInput & {
    moment: CrearMarketProbeMoment;
    stage: CrearMarketProbeStage;
    objective?: string;
    reminderAccepted?: boolean;
  }
): Promise<void> {
  await trackEvent('completo_paso', {
    tallerId: input.tallerId,
    pasoId: `market-probe-${input.moment}`,
    result: {
      ...(input.studyId ? { studyId: input.studyId } : {}),
      marketSignal: 'next_challenge',
      moment: input.moment,
      stage: input.stage,
      ...(input.objective ? { objective: input.objective } : {}),
      ...(typeof input.reminderAccepted === 'boolean'
        ? { reminderAccepted: input.reminderAccepted }
        : {}),
    },
    checksum: input.checksum,
    classToken: input.classToken,
  });
}

/**
 * The rewrite offered on the Day 7 closing screen, after the learner has already
 * been shown her own Day 1 sentence. It is practice, not measurement: by then
 * she has seen the answer, so scoring it would say nothing about retention.
 *
 * It lands on its own `paso_id` and carries no `rama`, `score` or `correcto`,
 * so no retention query can pick it up by accident.
 */
export async function trackCrearRewrite(
  input: TrackCrearStepInput & { texto: string; moment: 'day7' }
): Promise<void> {
  await trackEvent('envio_respuesta', {
    tallerId: input.tallerId,
    pasoId: `rewrite-${input.moment}`,
    result: {
      ...(input.studyId ? { studyId: input.studyId } : {}),
      texto: input.texto,
      moment: input.moment,
      practice: true,
      scored: false,
    },
    checksum: input.checksum,
    classToken: input.classToken,
    clientEventId: input.studyId
      ? `crear:${input.studyId}:rewrite-${input.moment}`
      : undefined,
  });
}

export async function trackCrearHint(
  input: TrackCrearStepInput & {
    rama: string;
    statementId?: string;
    learningOpportunityId?: string;
  }
): Promise<void> {
  await trackEvent('solicito_pista', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: {
      rama: input.rama,
      ...(input.statementId ? { statementId: input.statementId } : {}),
      ...(input.learningOpportunityId
        ? { learningOpportunityId: input.learningOpportunityId }
        : {}),
      ...(input.studyId ? { studyId: input.studyId } : {}),
    },
    checksum: input.checksum,
    classToken: input.classToken,
  });
}

/** Final D7 receipt. Eligibility is already server-owned via day1_complete. */
export async function trackCrearComplete(
  input: TrackCrearStepInput & {
    retestDueAt?: number;
    /**
     * Per-construct projection of the whole ledger, for the same reason as
     * `retestDueAt`: the ledger lives in `localStorage` and a shared classroom
     * device can lose it. Derived, never authored, so it can always be
     * recomputed from the observation rows and can never disagree with them.
     */
    constructStates?: CrearConstructState[];
  }
): Promise<TrackEventResult> {
  const result = {
    ...(input.studyId ? { studyId: input.studyId } : {}),
    ...(typeof input.retestDueAt === 'number' ? { retestDueAt: input.retestDueAt } : {}),
    ...(input.constructStates?.length ? { constructStates: input.constructStates } : {}),
  };
  return trackEvent('taller_completado', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: Object.keys(result).length > 0 ? result : undefined,
    checksum: input.checksum,
    classToken: input.classToken,
    clientEventId: input.studyId
      ? `crear:${input.studyId}:day7_complete`
      : undefined,
  });
}

export async function trackCrearAbandon(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('abandono_taller', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
    classToken: input.classToken,
  });
}
