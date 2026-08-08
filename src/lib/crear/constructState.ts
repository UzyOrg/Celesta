import type {
  CrearLearningConstruct,
  CrearLearningObservation,
} from './types';

/**
 * What the evidence for one construct is allowed to support. Derived, never
 * authored, and never written by hand.
 *
 * - `unproven` — no baseline, or nothing correct after it. The default.
 * - `preexisting` — the learner already had it before instruction. The lesson
 *   may still have helped, but this data cannot say so.
 * - `supported_only` — demonstrated with the guide available.
 * - `independent_only` — demonstrated alone, on a new case, same session.
 * - `durable` — demonstrated alone, on a new case, after the delay.
 */
export type CrearConstructClaim =
  | 'unproven'
  | 'preexisting'
  | 'supported_only'
  | 'independent_only'
  | 'durable';

export interface CrearConstructState {
  construct: CrearLearningConstruct;
  /** Pre-instruction measure: independent, same case, immediate. */
  baseline?: CrearLearningObservation;
  supported?: CrearLearningObservation;
  /** Independent, new case, same session. */
  independent?: CrearLearningObservation;
  /** Independent, new case, after the retest delay. */
  delayed?: CrearLearningObservation;
  /**
   * Branch ids of every incorrect first attempt, in the order they happened.
   * A branch names what fired *in one step*; a misunderstanding persists
   * across steps. Mapping branches to stable shapes is what will later let the
   * analysis say "confuses certainty with possibility" instead of "fell into
   * branch 3 at step 8". That mapping can wait — the field cannot, or the
   * first learners' data will not be comparable with the next ones'.
   */
  errorShapes: string[];
  claim: CrearConstructClaim;
}

/**
 * Only the first attempt counts. The product allows retry so the learner can
 * recover the thread; the measure is what they produced before feedback.
 */
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

/** A demonstration only counts as independent if nothing helped produce it. */
function demonstrated(observation?: CrearLearningObservation): boolean {
  return Boolean(observation?.correct && !observation.assisted);
}

function deriveClaim(
  state: Omit<CrearConstructState, 'claim'>
): CrearConstructClaim {
  /**
   * No baseline, no claim — this is the rule that makes a missing
   * pre-instruction measure loud instead of silent. A post-only result cannot
   * separate "the lesson taught it" from "they arrived knowing it", and with
   * n≈5 and no control group the baseline is the only attribution mechanism
   * the study has.
   */
  if (!state.baseline) return 'unproven';

  /**
   * The baseline was already correct. Everything after it is consistent with a
   * learner who never needed the lesson, so no amount of later success can be
   * attributed to it. This is the distinction the baseline exists to draw; the
   * aggregation has to honour it or the measure changes nothing.
   */
  if (demonstrated(state.baseline)) return 'preexisting';

  if (demonstrated(state.delayed)) return 'durable';
  if (demonstrated(state.independent)) return 'independent_only';
  if (state.supported?.correct) return 'supported_only';
  return 'unproven';
}

/**
 * Turns the append-only observation log into state per construct.
 *
 * A log answers "what happened at step 8". What the pilot needs to answer is
 * "what does this person know, under what conditions did they show it, and did
 * it hold" — which is a relation *between* observations of the same construct,
 * and today lives implicitly in row order. This computes it.
 *
 * Observations declared `evidentiary: false` are dropped entirely. They stay
 * in the ledger as process data and are barred from every claim, which is the
 * whole point of the flag: a construct measured once, assisted, on the same
 * case produces rows that look like evidence and are not.
 *
 * Pure: no clock, no storage, no UI. Same ledger in, same states out.
 */
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
    ): CrearLearningObservation | undefined => firstAttempt(observations.filter(predicate));

    const partial: Omit<CrearConstructState, 'claim'> = {
      construct,
      baseline: pick(
        (observation) =>
          observation.condition === 'independent' &&
          observation.novelty === 'same_case' &&
          observation.timing === 'immediate'
      ),
      supported: pick((observation) => observation.condition === 'supported'),
      independent: pick(
        (observation) =>
          observation.condition === 'independent' &&
          observation.novelty === 'new_case' &&
          observation.timing === 'immediate'
      ),
      delayed: pick(
        (observation) =>
          observation.condition === 'independent' && observation.timing === 'delayed'
      ),
      errorShapes: Array.from(
        new Set(
          observations
            .filter((observation) => observation.attempt <= 1 && !observation.correct)
            .sort((a, b) => a.recordedAt - b.recordedAt)
            .map((observation) => observation.branch)
        )
      ),
    };

    return { ...partial, claim: deriveClaim(partial) };
  });
}
