export type LearningVisualMode = 'reflect' | 'supported' | 'solo';

export const LEARNING_VISUAL_STAGES = [
  'arrival',
  'precheck',
  'precheck-production',
  'contrast',
  'prism',
  'guided-map',
  'transfer-bridge',
  'transfer',
  'transfer-check-certainty',
  'transfer-production',
  'close',
  'retest-certainty',
  'retest-production',
] as const;

export type LearningVisualStage = (typeof LEARNING_VISUAL_STAGES)[number];

/**
 * The bridge inherits the outgoing supported mode. It is a transition in the
 * lesson, not a fourth visual mode, so the support rail stays continuous until
 * the learner reaches the first independent measurement.
 */
export const LEARNING_VISUAL_MODE_BY_STAGE = {
  arrival: 'reflect',
  precheck: 'solo',
  'precheck-production': 'solo',
  contrast: 'reflect',
  prism: 'reflect',
  'guided-map': 'supported',
  'transfer-bridge': 'supported',
  transfer: 'supported',
  'transfer-check-certainty': 'solo',
  'transfer-production': 'solo',
  close: 'reflect',
  'retest-certainty': 'solo',
  'retest-production': 'solo',
} as const satisfies Record<LearningVisualStage, LearningVisualMode>;

export const SCAFFOLD_WITHDRAW_MOTION = {
  durationMs: 300,
  reducedDurationMs: 120,
  ease: [0.16, 1, 0.3, 1] as const,
} as const;

interface ScaffoldWithdrawMotion {
  exit: {
    opacity: number;
    scaleY: number;
  };
  transition: {
    duration: number;
    ease: typeof SCAFFOLD_WITHDRAW_MOTION.ease;
  };
}

export function getLearningVisualMode(stepId: string): LearningVisualMode {
  if (stepId in LEARNING_VISUAL_MODE_BY_STAGE) {
    return LEARNING_VISUAL_MODE_BY_STAGE[stepId as LearningVisualStage];
  }

  return 'reflect';
}

export function getScaffoldWithdrawMotion(
  prefersReducedMotion: boolean
): ScaffoldWithdrawMotion {
  return {
    exit: {
      opacity: 0,
      scaleY: prefersReducedMotion ? 1 : 0.08,
    },
    transition: {
      duration:
        (prefersReducedMotion
          ? SCAFFOLD_WITHDRAW_MOTION.reducedDurationMs
          : SCAFFOLD_WITHDRAW_MOTION.durationMs) / 1000,
      ease: SCAFFOLD_WITHDRAW_MOTION.ease,
    },
  };
}
