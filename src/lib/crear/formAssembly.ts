import type {
  CrearFormAssembly,
  CrearFormAssemblyFeedback,
} from './types';

export interface CrearFormAssemblyEvaluation {
  branch: string;
  correct: boolean;
  feedback: CrearFormAssemblyFeedback;
  text: string;
}

export function buildCrearFormAssemblyText(
  config: CrearFormAssembly,
  selectedTokenIds: readonly string[]
): string {
  const labels = selectedTokenIds.map(
    (tokenId) => config.tokens.find((token) => token.id === tokenId)?.label ?? tokenId
  );
  return [config.sentenceStart, ...labels, config.sentenceEnd]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function evaluateCrearFormAssembly(
  config: CrearFormAssembly,
  selectedTokenIds: readonly string[]
): CrearFormAssemblyEvaluation {
  const text = buildCrearFormAssemblyText(config, selectedTokenIds);
  const correct =
    selectedTokenIds.length === config.correctSequence.length &&
    config.correctSequence.every((tokenId, index) => selectedTokenIds[index] === tokenId);

  if (correct) {
    return {
      branch: config.success.rama,
      correct: true,
      feedback: config.success,
      text,
    };
  }

  const matchedRule = config.errorRules.find(
    (rule) => selectedTokenIds[rule.slotIndex] === rule.tokenId
  );
  const feedback = matchedRule?.feedback ?? config.fallback;
  return {
    branch: feedback.rama,
    correct: false,
    feedback,
    text,
  };
}
