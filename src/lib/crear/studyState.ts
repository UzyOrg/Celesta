"use client";

import type { CrearLessonId } from './types';

export type CrearStudyPhase = 'initial' | 'waiting_retest' | 'completed';

export interface CrearStoredOutcome {
  branch: string;
  correct: boolean;
  score: number;
  text: string;
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

export function loadCrearStudyState(lessonId: CrearLessonId): CrearStudyState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(storageKey(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrearStudyState;
    if (parsed.lessonId !== lessonId || !parsed.studyId || !parsed.contentVersion) return null;
    return {
      ...parsed,
      attempts: parsed.attempts ?? {},
      firstOutcomes: parsed.firstOutcomes ?? {},
      latestOutcomes: parsed.latestOutcomes ?? {},
      awaitingFeedback: parsed.awaitingFeedback ?? {},
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
