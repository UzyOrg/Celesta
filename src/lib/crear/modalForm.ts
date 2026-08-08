import { containsSignal, normalizeText } from './localClassifier';
import type { CrearProductionTarget, CrearResponseCategory } from './types';

/**
 * Modal phrases per certainty, authored here rather than in the lesson because
 * they are the grammar of the language, not content of the case. Negated forms
 * are listed first so a tie at the same position resolves to the longer
 * phrase: "could not have" must never be read as `could`.
 */
const CATEGORY_MODALS: ReadonlyArray<readonly [CrearResponseCategory, readonly string[]]> = [
  ['imposible', ["can't", 'cannot', 'can not', "couldn't", 'could not']],
  ['casi_seguro', ['must']],
  ['posible', ['might', 'may', 'could']],
];

export interface CrearModalFormReading {
  /**
   * The certainty the written sentence *expresses*, independent of whether it
   * is the certainty the evidence supports. `null` when no past modal appears.
   */
  expressedCategory: CrearResponseCategory | null;
  /** `modal + have + authored participle`, in that order, with nothing between. */
  wellFormed: boolean;
  /** The authored subject — the name or an accepted pronoun — appears as a whole word. */
  subjectPresent: boolean;
}

function indexOfTokens(tokens: string[], phrase: string[]): number {
  if (phrase.length === 0) return -1;
  for (let index = 0; index + phrase.length <= tokens.length; index += 1) {
    if (phrase.every((token, offset) => tokens[index + offset] === token)) return index;
  }
  return -1;
}

/**
 * Reads the two constructs the production steps measure as two independent
 * bits, so neither can be inferred from the other.
 *
 * The classifier branch decides which *authored feedback* the learner sees; it
 * cannot decide what was learned. A sentence like "Nora must have worked on
 * the model" is a calibration error carried by a flawless `modal + have +
 * participle`, and scoring it from the branch marked the form wrong. Form is
 * therefore read structurally here, and calibration is read from the modal the
 * learner actually chose.
 *
 * The match is deliberately strict: `have` immediately after the modal and an
 * authored participle immediately after `have`. An intervening adverb reads as
 * not-well-formed. That is a stricter rule than a teacher would apply, but it
 * is the same rule for every learner and every session, which is what makes
 * the day 1 / day 7 comparison mean something.
 */
export function readModalForm(
  text: string,
  target: CrearProductionTarget
): CrearModalFormReading {
  const normalized = normalizeText(text);
  const tokens = normalized.split(' ').filter(Boolean);
  const subjectPresent = target.subject.some((subject) => containsSignal(normalized, subject));

  let best: { at: number; length: number; category: CrearResponseCategory } | null = null;
  for (const [category, modals] of CATEGORY_MODALS) {
    for (const modal of modals) {
      const phrase = normalizeText(modal).split(' ').filter(Boolean);
      const at = indexOfTokens(tokens, phrase);
      if (at === -1) continue;
      if (!best || at < best.at || (at === best.at && phrase.length > best.length)) {
        best = { at, length: phrase.length, category };
      }
    }
  }

  if (!best) return { expressedCategory: null, wellFormed: false, subjectPresent };

  const afterModal = best.at + best.length;
  const participle = tokens[afterModal + 1];
  const wellFormed =
    tokens[afterModal] === 'have' &&
    participle !== undefined &&
    target.participles.some((candidate) => normalizeText(candidate) === participle);

  return { expressedCategory: best.category, wellFormed, subjectPresent };
}
