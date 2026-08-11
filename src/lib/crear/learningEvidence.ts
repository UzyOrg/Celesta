import type {
  CrearCueFrame,
  CrearLearningObservation,
  CrearLearningOpportunity,
} from './types';

interface BuildCrearLearningObservationsInput {
  stepId: string;
  opportunity?: CrearLearningOpportunity;
  branch: string;
  correct: boolean;
  observed?: boolean;
  assisted: boolean;
  attempt: number;
  statementId?: string;
  /**
   * Per-item frame, for steps that probe several. It overrides the step-level
   * frame so a three-clue map records what each clue actually was instead of
   * one label smeared across all three.
   */
  cueFrame?: CrearCueFrame;
  recordedAt?: number;
}

/**
 * Expands one authored learning opportunity into construct-level observations.
 * This is deliberately descriptive: it records evidence without pretending to
 * diagnose mastery from a single response.
 */
export function buildCrearLearningObservations(
  input: BuildCrearLearningObservationsInput
): CrearLearningObservation[] {
  if (!input.opportunity) return [];

  const recordedAt = input.recordedAt ?? Date.now();
  const opportunity = input.opportunity;
  const cueFrame = input.cueFrame ?? opportunity.cueFrame;
  return opportunity.constructs.map((construct) => ({
    ...opportunity,
    constructs: [construct],
    stepId: input.stepId,
    branch: input.branch,
    correct: input.correct,
    ...(typeof input.observed === 'boolean' ? { observed: input.observed } : {}),
    assisted: input.assisted,
    attempt: input.attempt,
    recordedAt,
    ...(cueFrame ? { cueFrame } : {}),
    ...(input.statementId ? { statementId: input.statementId } : {}),
  }));
}
