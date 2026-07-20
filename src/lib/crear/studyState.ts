"use client";

import type { CrearLessonId, CrearResponsePartAnswer } from './types';

export type CrearStudyPhase = 'initial' | 'waiting_retest' | 'completed';

export interface CrearStoredOutcome {
  branch: string;
  correct: boolean;
  score: number;
  text: string;
  parts?: CrearResponsePartAnswer[];
  attempt: number;
  confidence: number;
  submittedAt: number;
}

export interface CrearStudyState {
  studyId: string;
  lessonId: CrearLessonId;
  contentVersion: string;
  startedAt: number;
  updatedAt: number;
  phase: CrearStudyPhase;
  stepIndex: number;
  retestDueAt?: number;
  attempts: Record<string, number>;
  firstOutcomes: Record<string, CrearStoredOutcome>;
  latestOutcomes: Record<string, CrearStoredOutcome>;
  awaitingFeedback: Record<string, boolean>;
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
    if (
      parsed.lessonId !== lessonId ||
      typeof parsed.studyId !== 'string' ||
      parsed.studyId.length === 0 ||
      typeof parsed.contentVersion !== 'string' ||
      parsed.contentVersion.length === 0 ||
      !isFiniteTimestamp(parsed.startedAt) ||
      !isFiniteTimestamp(parsed.updatedAt) ||
      !isStudyPhase(parsed.phase) ||
      !isNonNegativeInteger(parsed.stepIndex) ||
      (parsed.retestDueAt !== undefined && !isFiniteTimestamp(parsed.retestDueAt)) ||
      !isRecordOf(attempts, isNonNegativeInteger) ||
      !isRecordOf(firstOutcomes, isStoredOutcome) ||
      !isRecordOf(latestOutcomes, isStoredOutcome) ||
      !isRecordOf(awaitingFeedback, (value): value is boolean => typeof value === 'boolean')
    ) {
      return null;
    }

    return {
      studyId: parsed.studyId,
      lessonId,
      contentVersion: parsed.contentVersion,
      startedAt: parsed.startedAt,
      updatedAt: parsed.updatedAt,
      phase: parsed.phase,
      stepIndex: parsed.stepIndex,
      ...(parsed.retestDueAt === undefined ? {} : { retestDueAt: parsed.retestDueAt }),
      attempts,
      firstOutcomes,
      latestOutcomes,
      awaitingFeedback,
    };
  } catch {
    return null;
  }
}

export function getOrCreateCrearStudyState(
  lessonId: CrearLessonId,
  contentVersion: string
): CrearStudyState {
  const existing = loadCrearStudyState(lessonId);
  if (existing?.contentVersion === contentVersion) return existing;

  const now = Date.now();
  const state: CrearStudyState = {
    studyId: makeStudyId(),
    lessonId,
    contentVersion,
    startedAt: now,
    updatedAt: now,
    phase: 'initial',
    stepIndex: 0,
    attempts: {},
    firstOutcomes: {},
    latestOutcomes: {},
    awaitingFeedback: {},
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
