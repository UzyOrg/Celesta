import type {
  ClassifyResponse,
  CrearClassifierBranch,
  CrearClassifierDefinition,
  CrearResponseCategory,
  CrearResponsePartAnswer,
} from './types';

const CATEGORY_SIGNALS: Record<CrearResponseCategory, string[]> = {
  casi_seguro: ['must have'],
  posible: ['might have', 'may have', 'could have'],
  imposible: ["can't have", 'cannot have', "couldn't have", 'could not have'],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreBranch(text: string, branch: CrearClassifierBranch): number {
  const normalized = normalizeText(text);
  const includesSignal = (signal: string) => normalized.includes(normalizeText(signal));
  const match = branch.match;

  if (match?.none?.some(includesSignal)) return 0;
  if (match?.all?.some((signal) => !includesSignal(signal))) return 0;

  if (match?.allGroups) {
    const everyGroupMatches = match.allGroups.every((group) => group.some(includesSignal));
    if (!everyGroupMatches) return 0;
  }

  const anyHits = match?.any?.filter(includesSignal).length ?? 0;
  if (match?.any && anyHits === 0) return 0;

  const signals = [...(branch.keywords ?? []), ...(branch.ejemplos ?? [])].map(normalizeText);
  let score =
    (match?.all?.length ?? 0) * 3 +
    (match?.allGroups?.length ?? 0) * 3 +
    anyHits * 2;

  if (signals.length === 0) return score;
  for (const signal of signals) {
    if (!signal) continue;
    if (normalized.includes(signal)) {
      score += signal.split(' ').length > 1 ? 2 : 1;
      continue;
    }

    const tokens = signal.split(' ').filter((token) => token.length >= 4);
    const hits = tokens.filter((token) => normalized.includes(token)).length;
    if (tokens.length > 0) score += hits / tokens.length;
  }

  return score;
}

function categoryMismatchBranch(
  classifier: CrearClassifierDefinition
): CrearClassifierBranch | null {
  return classifier.ramas.find((branch) => branch.rama.endsWith('misconcepcion_certeza'))
    ?? classifier.ramas.find((branch) => branch.rama.includes('parcial'))
    ?? null;
}

export function classifyCrearResponseStructure(
  parts: CrearResponsePartAnswer[] | undefined,
  classifier: CrearClassifierDefinition
): ClassifyResponse | null {
  if (!parts || parts.length === 0) return null;

  const mismatch = parts.some((part) => {
    const normalized = normalizeText(part.texto);
    const detected = (Object.entries(CATEGORY_SIGNALS) as Array<[
      CrearResponseCategory,
      string[],
    ]>).filter(([, signals]) =>
      signals.some((signal) => normalized.includes(normalizeText(signal)))
    );

    return detected.length > 0 && (
      !detected.some(([category]) => category === part.categoria)
      || detected.some(([category]) => category !== part.categoria)
    );
  });

  if (!mismatch) return null;
  const branch = categoryMismatchBranch(classifier);
  return {
    rama: branch?.rama ?? classifier.fallbackRama,
    confianza: 0.95,
  };
}

export function classifyCrearLocally(
  texto: string,
  classifier: CrearClassifierDefinition,
  parts?: CrearResponsePartAnswer[]
): ClassifyResponse {
  const structureResult = classifyCrearResponseStructure(parts, classifier);
  if (structureResult) return structureResult;

  const ranked = classifier.ramas
    .map((branch) => ({
      branch,
      score: scoreBranch(texto, branch),
      priority: branch.correcto
        ? 100
        : branch.rama.includes('misconcepcion')
          ? 80
          : branch.rama.includes('parcial')
            ? 20
            : branch.rama.includes('no_claro')
              ? 0
              : 50,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.priority - a.priority || b.score - a.score);

  const best = ranked[0];
  if (!best || best.score <= 0) {
    return { rama: classifier.fallbackRama, confianza: 0.45 };
  }

  const secondScore = ranked[1]?.score ?? 0;
  const margin = best.score - secondScore;
  const confidence = Math.min(0.95, 0.62 + best.score * 0.08 + margin * 0.05);
  const allowed = new Set(classifier.ramas.map((branch) => branch.rama));

  if (!allowed.has(best.branch.rama) || confidence < classifier.minConfianza) {
    return {
      rama: classifier.fallbackRama,
      confianza: Number(Math.min(confidence, classifier.minConfianza).toFixed(2)),
    };
  }

  return {
    rama: best.branch.rama,
    confianza: Number(confidence.toFixed(2)),
  };
}
