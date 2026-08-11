import type {
  CrearLearningConstruct,
  CrearLearningObservation,
} from './types';

export type CrearConstructClaim =
  | 'unproven'
  | 'preexisting'
  | 'supported_only'
  | 'independent_only'
  | 'durable';

export type CrearBaselineStatus =
  | 'unknown'
  | 'not_demonstrated'
  | 'mixed'
  | 'demonstrated';

export interface CrearBaselineSummary {
  status: CrearBaselineStatus;
  observedCount: number;
  correctCount: number;
  totalPresented: number;
  observations: CrearLearningObservation[];
}

export interface CrearConstructState {
  construct: CrearLearningConstruct;
  /** Composite of every pre-instruction item for this construct. */
  baseline?: CrearBaselineSummary;
  supported?: CrearLearningObservation;
  independent?: CrearLearningObservation;
  delayed?: CrearLearningObservation;
  errorShapes: string[];
  claim: CrearConstructClaim;
}

function firstAttempt(
  candidates: CrearLearningObservation[]
): CrearLearningObservation | undefined {
  return candidates.reduce<CrearLearningObservation | undefined>((best, candidate) => {
    if (!best) return candidate;
    if (candidate.attempt !== best.attempt) {
      return candidate.attempt < best.attempt ? candidate : best;
    }
    return candidate.recordedAt < best.recordedAt ? candidate : best;
  }, undefined);
}

function demonstrated(observation?: CrearLearningObservation): boolean {
  return Boolean(
    observation
      && observation.observed !== false
      && observation.correct
      && !observation.assisted
  );
}

function summarizeBaseline(
  candidates: CrearLearningObservation[]
): CrearBaselineSummary | undefined {
  if (candidates.length === 0) return undefined;

  // One first attempt per authored item. `statementId` identifies a multi-item
  // precheck; a single production falls back to its step id.
  const byItem = new Map<string, CrearLearningObservation[]>();
  for (const observation of candidates) {
    const itemId = observation.statementId ?? observation.stepId;
    const entries = byItem.get(itemId) ?? [];
    entries.push(observation);
    byItem.set(itemId, entries);
  }

  // Canonical item order makes the status, counts and resulting claim
  // invariant to presentation order while retaining the real chronology.
  const observations = Array.from(byItem.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, entries]) => firstAttempt(entries))
    .filter((entry): entry is CrearLearningObservation => Boolean(entry));
  const observed = observations.filter((entry) => entry.observed !== false);
  const correctCount = observed.filter(demonstrated).length;
  const observedCount = observed.length;

  let status: CrearBaselineStatus = 'unknown';
  if (observedCount > 0 && observedCount < observations.length) status = 'mixed';
  else if (observedCount > 0 && correctCount === 0) status = 'not_demonstrated';
  else if (observedCount > 0 && correctCount === observedCount) status = 'demonstrated';
  else if (observedCount > 0) status = 'mixed';

  return {
    status,
    observedCount,
    correctCount,
    totalPresented: observations.length,
    observations,
  };
}

function deriveClaim(
  state: Omit<CrearConstructState, 'claim'>
): CrearConstructClaim {
  if (!state.baseline || state.baseline.status === 'unknown') return 'unproven';
  if (state.baseline.status === 'demonstrated') return 'preexisting';

  // Partial prior knowledge cannot support the binary attribution "the lesson
  // created this ability". Preserve it as mixed and leave the claim unproven.
  if (state.baseline.status === 'mixed') return 'unproven';

  if (demonstrated(state.delayed)) return 'durable';
  if (demonstrated(state.independent)) return 'independent_only';
  if (state.supported?.observed !== false && state.supported?.correct) return 'supported_only';
  return 'unproven';
}

export function aggregateCrearConstructStates(
  ledger: readonly CrearLearningObservation[]
): CrearConstructState[] {
  const evidentiary = ledger.filter((observation) => observation.evidentiary !== false);
  const byConstruct = new Map<CrearLearningConstruct, CrearLearningObservation[]>();

  for (const observation of evidentiary) {
    for (const construct of observation.constructs) {
      const entries = byConstruct.get(construct) ?? [];
      entries.push(observation);
      byConstruct.set(construct, entries);
    }
  }

  return Array.from(byConstruct.entries()).map(([construct, observations]) => {
    const pick = (
      predicate: (observation: CrearLearningObservation) => boolean
    ): CrearLearningObservation | undefined => firstAttempt(
      observations.filter(
        (observation) => observation.observed !== false && predicate(observation)
      )
    );

    const baselineCandidates = observations.filter(
      (observation) =>
        observation.condition === 'independent'
        && observation.novelty === 'same_case'
        && observation.timing === 'immediate'
    );
    const partial: Omit<CrearConstructState, 'claim'> = {
      construct,
      baseline: summarizeBaseline(baselineCandidates),
      supported: pick((observation) => observation.condition === 'supported'),
      independent: pick(
        (observation) =>
          observation.condition === 'independent'
          && observation.novelty === 'new_case'
          && observation.timing === 'immediate'
      ),
      delayed: pick(
        (observation) =>
          observation.condition === 'independent' && observation.timing === 'delayed'
      ),
      errorShapes: Array.from(
        new Set(
          observations
            .filter(
              (observation) =>
                observation.observed !== false
                && observation.attempt <= 1
                && !observation.correct
            )
            .sort((a, b) => a.recordedAt - b.recordedAt)
            .map((observation) => observation.branch)
        )
      ),
    };

    return { ...partial, claim: deriveClaim(partial) };
  });
}
