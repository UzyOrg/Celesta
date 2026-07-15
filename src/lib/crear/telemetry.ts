"use client";

import { trackEvent } from '@/lib/track';
import type { CrearFase, CrearTelemetryResult } from './types';

interface TrackCrearAnswerInput {
  tallerId: string;
  pasoId: string;
  fase: CrearFase;
  correcto: boolean;
  rama: string;
  texto?: string;
  score?: number;
  checksum?: string;
  intento?: number;
  studyId?: string;
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

  if (input.texto && input.texto.trim().length > 0) {
    result.texto = input.texto.trim();
  }

  if (typeof input.score === 'number') {
    result.score = input.score;
  }

  if (typeof input.intento === 'number') {
    result.intento = input.intento;
  }

  if (input.studyId) {
    result.studyId = input.studyId;
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

export async function trackCrearHint(input: TrackCrearStepInput & { rama: string }): Promise<void> {
  await trackEvent('solicito_pista', {
    tallerId: input.tallerId,
    pasoId: input.pasoId,
    result: { rama: input.rama, ...(input.studyId ? { studyId: input.studyId } : {}) },
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
