import type {
  CrearLearningObservation,
  CrearLearningOpportunity,
} from './types';

interface BuildCrearLearningObservationsInput {
  stepId: string;
  opportunity?: CrearLearningOpportunity;
  branch: string;
  correct: boolean;
  assisted: boolean;
  attempt: number;
  statementId?: string;
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
  return opportunity.constructs.map((construct) => ({
    ...opportunity,
    constructs: [construct],
    stepId: input.stepId,
    branch: input.branch,
    correct: input.correct,
    assisted: input.assisted,
    attempt: input.attempt,
    recordedAt,
    ...(input.statementId ? { statementId: input.statementId } : {}),
  }));
}
