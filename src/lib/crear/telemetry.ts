"use client";

import { trackEvent } from '@/lib/track';
import type {
  CrearFase,
  CrearLearningOpportunity,
  CrearResponseCategory,
  CrearResponsePartAnswer,
  CrearTelemetryResult,
} from './types';

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
  learningOpportunity?: CrearLearningOpportunity;
}

interface TrackCrearStepInput {
  tallerId: string;
  pasoId: string;
  checksum?: string;
  studyId?: string;
}

export async function trackCrearAnswer(input: TrackCrearAnswerInput): Promise<void> {
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

  if (input.learningOpportunity) {
    result.learningOpportunity = input.learningOpportunity;
  }

  await trackEvent('envio_respuesta', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result,
    checksum: input.checksum,
  });
}

export async function trackCrearStart(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('inicio_taller', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
  });
}

export async function trackCrearStepComplete(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('completo_paso', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
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
  });
}

export async function trackCrearComplete(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('taller_completado', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
  });
}

export async function trackCrearAbandon(input: TrackCrearStepInput): Promise<void> {
  await trackEvent('abandono_taller', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: input.studyId ? { studyId: input.studyId } : undefined,
    checksum: input.checksum,
  });
}
