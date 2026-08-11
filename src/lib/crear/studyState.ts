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
  /**
   * Participant identity inside a cohort. Two learners can legitimately use
   * the same class token on one shared phone; without this field the second
   * learner inherits the first learner's studyId, answers and evidence ledger.
   */
  participantCode?: string;
  startedAt: number;
  updatedAt: number;
  phase: CrearStudyPhase;
  stepIndex: number;
  retestDueAt?: number;
  /** Server-signed proof that D1 finished and the server clock set D7. */
  retestTicket?: string;
  /**
   * Set once `taller_completado` is durably queued or accepted by the server.
   * `phase === 'completed'` alone is not enough to guard the report: it is what
   * gets read back from localStorage on every future page load of an already-
   * finished study, so without this flag every reopen would re-emit the event.
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
const MAX_STATE_RECORD_ENTRIES = 500;
const MAX_EVIDENCE_OBSERVATIONS = 1_000;
const MAX_STORED_TEXT_LENGTH = 8_192;

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

function isResponseCategory(value: unknown): value is CrearResponseCategory {
  return value === 'casi_seguro' || value === 'posible' || value === 'imposible';
}

function isResponsePartAnswer(value: unknown): value is CrearResponsePartAnswer {
  return (
    isRecord(value) &&
    isResponseCategory(value.categoria) &&
    typeof value.texto === 'string' &&
    value.texto.length <= MAX_STORED_TEXT_LENGTH &&
    (value.rama === undefined || (typeof value.rama === 'string' && value.rama.length <= 160))
  );
}

function isCategoryMapping(value: unknown): value is Record<string, CrearResponseCategory> {
  return (
    isRecord(value) &&
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(
      ([key, category]) => key.length > 0 && key.length <= 160 && isResponseCategory(category)
    )
  );
}

function isStoredOutcome(value: unknown): value is CrearStoredOutcome {
  if (!isRecord(value)) return false;
  return (
    typeof value.branch === 'string' &&
    value.branch.length > 0 &&
    value.branch.length <= 160 &&
    typeof value.correct === 'boolean' &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    typeof value.text === 'string' &&
    value.text.length <= MAX_STORED_TEXT_LENGTH &&
    isNonNegativeInteger(value.attempt) &&
    typeof value.confidence === 'number' &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    isFiniteTimestamp(value.submittedAt) &&
    (value.parts === undefined || (
      Array.isArray(value.parts) &&
      value.parts.length <= 10 &&
      value.parts.every(isResponsePartAnswer)
    )) &&
    (value.mapping === undefined || isCategoryMapping(value.mapping)) &&
    (value.assisted === undefined || typeof value.assisted === 'boolean') &&
    (value.targetCategory === undefined || isResponseCategory(value.targetCategory))
  );
}

function isLearningObservation(value: unknown): value is CrearLearningObservation {
  if (!isRecord(value)) return false;
  const constructs = value.constructs;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 160 &&
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
    value.stepId.length > 0 &&
    value.stepId.length <= 160 &&
    typeof value.branch === 'string' &&
    value.branch.length > 0 &&
    value.branch.length <= 160 &&
    typeof value.correct === 'boolean' &&
    (value.observed === undefined || typeof value.observed === 'boolean') &&
    typeof value.assisted === 'boolean' &&
    isNonNegativeInteger(value.attempt) &&
    isFiniteTimestamp(value.recordedAt) &&
    (value.statementId === undefined || (
      typeof value.statementId === 'string' && value.statementId.length <= 160
    ))
  );
}

function isRecordOf<T>(
  value: unknown,
  predicate: (entry: unknown) => entry is T
): value is Record<string, T> {
  return (
    isRecord(value) &&
    Object.keys(value).length <= MAX_STATE_RECORD_ENTRIES &&
    Object.entries(value).every(
      ([key, entry]) => key.length > 0 && key.length <= 160 && predicate(entry)
    )
  );
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
      parsed.studyId.length > 128 ||
      typeof parsed.contentVersion !== 'string' ||
      parsed.contentVersion.length === 0 ||
      parsed.contentVersion.length > 160 ||
      (parsed.classToken !== undefined &&
        (typeof parsed.classToken !== 'string' ||
          parsed.classToken.length === 0 ||
          parsed.classToken.length > 64)) ||
      (parsed.participantCode !== undefined &&
        (typeof parsed.participantCode !== 'string' ||
          parsed.participantCode.length === 0 ||
          parsed.participantCode.length > 64)) ||
      !isFiniteTimestamp(parsed.startedAt) ||
      !isFiniteTimestamp(parsed.updatedAt) ||
      !isStudyPhase(parsed.phase) ||
      !isNonNegativeInteger(parsed.stepIndex) ||
      (parsed.retestDueAt !== undefined && !isFiniteTimestamp(parsed.retestDueAt)) ||
      (parsed.retestTicket !== undefined &&
        (typeof parsed.retestTicket !== 'string' || parsed.retestTicket.length > 4096)) ||
      (parsed.completionReported !== undefined && typeof parsed.completionReported !== 'boolean') ||
      !isRecordOf(attempts, isNonNegativeInteger) ||
      !isRecordOf(firstOutcomes, isStoredOutcome) ||
      !isRecordOf(latestOutcomes, isStoredOutcome) ||
      !isRecordOf(awaitingFeedback, (value): value is boolean => typeof value === 'boolean') ||
      !isRecordOf(assistance, (value): value is boolean => typeof value === 'boolean') ||
      !Array.isArray(evidenceLedger) ||
      evidenceLedger.length > MAX_EVIDENCE_OBSERVATIONS ||
      !evidenceLedger.every(isLearningObservation)
    ) {
      return null;
    }

    return {
      studyId: parsed.studyId,
      lessonId,
      contentVersion: parsed.contentVersion,
      ...(parsed.classToken === undefined ? {} : { classToken: parsed.classToken }),
      ...(parsed.participantCode === undefined
        ? {}
        : { participantCode: parsed.participantCode }),
      startedAt: parsed.startedAt,
      updatedAt: parsed.updatedAt,
      phase: parsed.phase,
      stepIndex: parsed.stepIndex,
      ...(parsed.retestDueAt === undefined ? {} : { retestDueAt: parsed.retestDueAt }),
      ...(parsed.retestTicket === undefined ? {} : { retestTicket: parsed.retestTicket }),
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
 * Cohort and participant both belong to the identity of a study, not only its
 * metadata. A token change would split one learner across cohorts; a participant
 * change on a shared phone would do the opposite and merge two learners. Either
 * change starts a clean local study. Nothing already delivered is lost server-side.
 */
export function getOrCreateCrearStudyState(
  lessonId: CrearLessonId,
  contentVersion: string,
  classToken?: string,
  participantCode?: string
): CrearStudyState {
  const existing = loadCrearStudyState(lessonId);
  if (
    existing?.contentVersion === contentVersion &&
    existing.classToken === classToken &&
    existing.participantCode === participantCode
  ) {
    return existing;
  }

  const now = Date.now();
  const state: CrearStudyState = {
    studyId: makeStudyId(),
    lessonId,
    contentVersion,
    ...(classToken === undefined ? {} : { classToken }),
    ...(participantCode === undefined ? {} : { participantCode }),
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
