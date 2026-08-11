export type LearningVisualMode = 'reflect' | 'supported' | 'solo';

export const LEARNING_VISUAL_STAGES = [
  'arrival',
  'precheck',
  'precheck-production',
  'contrast',
  'prism',
  'guided-map',
  'guided-form',
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
 * lesson, not a fourth visual mode.
 */
export const LEARNING_VISUAL_MODE_BY_STAGE = {
  arrival: 'reflect',
  precheck: 'solo',
  'precheck-production': 'solo',
  contrast: 'reflect',
  prism: 'reflect',
  'guided-map': 'supported',
  'guided-form': 'supported',
  'transfer-bridge': 'supported',
  transfer: 'supported',
  'transfer-check-certainty': 'solo',
  'transfer-production': 'solo',
  close: 'reflect',
  'retest-certainty': 'solo',
  'retest-production': 'solo',
} as const satisfies Record<LearningVisualStage, LearningVisualMode>;

export function getLearningVisualMode(stepId: string): LearningVisualMode {
  if (stepId in LEARNING_VISUAL_MODE_BY_STAGE) {
    return LEARNING_VISUAL_MODE_BY_STAGE[stepId as LearningVisualStage];
  }

  return 'reflect';
}
