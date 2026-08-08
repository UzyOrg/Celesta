"use client";

import type {
  CrearLearningObservation,
  CrearLessonId,
  CrearResponseCategory,
  CrearResponsePartAnswer,
} from './types';

export type CrearStudyPhase = 'initial' | 'waiting_retest' | 'completed';

export interface CrearStoredOutcome {
  branch: string;
  correct: boolean;
  score: number;
  text: string;
  parts?: CrearResponsePartAnswer[];
  mapping?: Record<string, CrearResponseCategory>;
  assisted?: boolean;
  targetCategory?: CrearResponseCategory;
  attempt: number;
  confidence: number;
  submittedAt: number;
}

export interface CrearStudyState {
  studyId: string;
  lessonId: CrearLessonId;
  contentVersion: string;
  /**
   * The token the study was born under. It is remembered rather than re-read
   * from the URL on every load, because a learner who returns to a bare
   * `/crear` would otherwise keep the same progress under a brand new session
   * id — the same study, reported as two different people. Sticky here, and a
   * link that carries a genuinely different token starts a new study instead of
   * splitting one across two identities.
   */
  classToken?: string;
  startedAt: number;
  updatedAt: number;
  phase: CrearStudyPhase;
  stepIndex: number;
  retestDueAt?: number;
  /**
   * Set once `taller_completado` has actually been sent. `phase === 'completed'`
   * alone is not enough to guard the report: it is what gets read back from
   * localStorage on every future page load of an already-finished study, so
   * without this flag every reopen would re-emit the completion event.
   */
  completionReported?: boolean;
  attempts: Record<string, number>;
  firstOutcomes: Record<string, CrearStoredOutcome>;
  latestOutcomes: Record<string, CrearStoredOutcome>;
  awaitingFeedback: Record<string, boolean>;
  assistance: Record<string, boolean>;
  evidenceLedger: CrearLearningObservation[];
}

const STORAGE_PREFIX = 'celesta:crear:study';

function storageKey(lessonId: CrearLessonId): string {
  return `${STORAGE_PREFIX}:${lessonId}`;
}

function makeStudyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `study-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStudyPhase(value: unknown): value is CrearStudyPhase {
  return value === 'initial' || value === 'waiting_retest' || value === 'completed';
}

function isStoredOutcome(value: unknown): value is CrearStoredOutcome {
  if (!isRecord(value)) return false;
  return (
    typeof value.branch === 'string' &&
    typeof value.correct === 'boolean' &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    typeof value.text === 'string' &&
    isNonNegativeInteger(value.attempt) &&
    typeof value.confidence === 'number' &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    isFiniteTimestamp(value.submittedAt) &&
    (value.parts === undefined || Array.isArray(value.parts))
  );
}

function isLearningObservation(value: unknown): value is CrearLearningObservation {
  if (!isRecord(value)) return false;
  const constructs = value.constructs;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    Array.isArray(constructs) &&
    constructs.length === 1 &&
    constructs.every((construct) =>
      construct === 'evidence_comprehension' ||
      construct === 'certainty_calibration' ||
      construct === 'modal_form'
    ) &&
    (value.condition === 'supported' || value.condition === 'independent') &&
    (value.novelty === 'same_case' || value.novelty === 'new_case') &&
    (value.timing === 'immediate' || value.timing === 'delayed') &&
    (value.cueFrame === undefined ||
      value.cueFrame === 'physical_trace' ||
      value.cueFrame === 'presence_unobserved' ||
      value.cueFrame === 'absence_elsewhere') &&
    (value.evidentiary === undefined || typeof value.evidentiary === 'boolean') &&
    typeof value.stepId === 'string' &&
    typeof value.branch === 'string' &&
    typeof value.correct === 'boolean' &&
    typeof value.assisted === 'boolean' &&
    isNonNegativeInteger(value.attempt) &&
    isFiniteTimestamp(value.recordedAt) &&
    (value.statementId === undefined || typeof value.statementId === 'string')
  );
}

function isRecordOf<T>(
  value: unknown,
  predicate: (entry: unknown) => entry is T
): value is Record<string, T> {
  return isRecord(value) && Object.values(value).every(predicate);
}

export function loadCrearStudyState(lessonId: CrearLessonId): CrearStudyState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(storageKey(lessonId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const attempts = parsed.attempts ?? {};
    const firstOutcomes = parsed.firstOutcomes ?? {};
    const latestOutcomes = parsed.latestOutcomes ?? {};
    const awaitingFeedback = parsed.awaitingFeedback ?? {};
    const assistance = parsed.assistance ?? {};
    const evidenceLedger = parsed.evidenceLedger ?? [];
    if (
      parsed.lessonId !== lessonId ||
      typeof parsed.studyId !== 'string' ||
      parsed.studyId.length === 0 ||
      typeof parsed.contentVersion !== 'string' ||
      parsed.contentVersion.length === 0 ||
      (parsed.classToken !== undefined &&
        (typeof parsed.classToken !== 'string' || parsed.classToken.length === 0)) ||
      !isFiniteTimestamp(parsed.startedAt) ||
      !isFiniteTimestamp(parsed.updatedAt) ||
      !isStudyPhase(parsed.phase) ||
      !isNonNegativeInteger(parsed.stepIndex) ||
      (parsed.retestDueAt !== undefined && !isFiniteTimestamp(parsed.retestDueAt)) ||
      (parsed.completionReported !== undefined && typeof parsed.completionReported !== 'boolean') ||
      !isRecordOf(attempts, isNonNegativeInteger) ||
      !isRecordOf(firstOutcomes, isStoredOutcome) ||
      !isRecordOf(latestOutcomes, isStoredOutcome) ||
      !isRecordOf(awaitingFeedback, (value): value is boolean => typeof value === 'boolean') ||
      !isRecordOf(assistance, (value): value is boolean => typeof value === 'boolean') ||
      !Array.isArray(evidenceLedger) ||
      !evidenceLedger.every(isLearningObservation)
    ) {
      return null;
    }

    return {
      studyId: parsed.studyId,
      lessonId,
      contentVersion: parsed.contentVersion,
      ...(parsed.classToken === undefined ? {} : { classToken: parsed.classToken }),
      startedAt: parsed.startedAt,
      updatedAt: parsed.updatedAt,
      phase: parsed.phase,
      stepIndex: parsed.stepIndex,
      ...(parsed.retestDueAt === undefined ? {} : { retestDueAt: parsed.retestDueAt }),
      ...(parsed.completionReported === undefined
        ? {}
        : { completionReported: parsed.completionReported }),
      attempts,
      firstOutcomes,
      latestOutcomes,
      awaitingFeedback,
      assistance,
      evidenceLedger,
    };
  } catch {
    return null;
  }
}

/**
 * `classToken` participates in the identity of a study, not just its metadata.
 * Evidence collected under one token and continued under another describes one
 * learner but ships as two, so a token change starts a clean study rather than
 * splitting the ledger. Nothing is lost server-side: the earlier rows were
 * already delivered under the earlier token.
 */
export function getOrCreateCrearStudyState(
  lessonId: CrearLessonId,
  contentVersion: string,
  classToken?: string
): CrearStudyState {
  const existing = loadCrearStudyState(lessonId);
  if (existing?.contentVersion === contentVersion && existing.classToken === classToken) {
    return existing;
  }

  const now = Date.now();
  const state: CrearStudyState = {
    studyId: makeStudyId(),
    lessonId,
    contentVersion,
    ...(classToken === undefined ? {} : { classToken }),
    startedAt: now,
    updatedAt: now,
    phase: 'initial',
    stepIndex: 0,
    attempts: {},
    firstOutcomes: {},
    latestOutcomes: {},
    awaitingFeedback: {},
    assistance: {},
    evidenceLedger: [],
  };
  saveCrearStudyState(state);
  return state;
}

export function saveCrearStudyState(state: CrearStudyState): CrearStudyState {
  const next = { ...state, updatedAt: Date.now() };
  try {
    localStorage.setItem(storageKey(state.lessonId), JSON.stringify(next));
  } catch {
    // The workshop progress remains the fallback when localStorage is unavailable.
  }
  return next;
}

export function clearCrearStudyState(lessonId: CrearLessonId): void {
  try {
    localStorage.removeItem(storageKey(lessonId));
  } catch {
    // Best-effort reset for supervised pilots.
  }
}
