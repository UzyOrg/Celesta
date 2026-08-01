import { validateWorkshopJson } from '@/lib/workshops/schema';
import type {
  CrearCaseArtifact,
  CrearClassifierBranch,
  CrearLearningOpportunity,
  CrearResponseCategory,
  CrearStepMeta,
  CrearVisualCue,
  CrearWorkshop,
} from './types';

const INPUT_MODES = new Set(['none', 'text', 'choice', 'verdict', 'match']);
const FASES = new Set(['pre_check', 'practica', 'post', 'transfer', 'teach_back']);
const STAGES = new Set(['descubre', 'practica', 'aplica', 'recuerda']);
const SCENES = new Set([
  'arrival',
  'signal',
  'contrast',
  'prism',
  'practice',
  'transfer-bridge',
  'transfer',
  'closure',
  'retest',
]);
const RESPONSE_CATEGORIES: readonly CrearResponseCategory[] = [
  'casi_seguro',
  'posible',
  'imposible',
];
const RESPONSE_CATEGORY_SET = new Set<CrearResponseCategory>(RESPONSE_CATEGORIES);
const CASE_ARTIFACT_KINDS = new Set(['poster', 'model', 'trip']);
const VISUAL_CUE_KINDS = new Set(['paint', 'glue', 'presence', 'location', 'trip']);
const LEARNING_CONSTRUCTS = new Set([
  'evidence_comprehension',
  'certainty_calibration',
  'modal_form',
]);
const LEARNING_CONDITIONS = new Set(['supported', 'independent']);
const LEARNING_NOVELTIES = new Set(['same_case', 'new_case']);
const LEARNING_TIMINGS = new Set(['immediate', 'delayed']);

function validateVisualCue(cue: CrearVisualCue, label: string): void {
  if (
    !cue ||
    typeof cue !== 'object' ||
    !VISUAL_CUE_KINDS.has(cue.kind) ||
    typeof cue.label !== 'string' ||
    !cue.label.trim() ||
    typeof cue.detail !== 'string' ||
    !cue.detail.trim()
  ) {
    throw new Error(`CREAR JSON: ${label} is invalid`);
  }
}

function validateCaseArtifact(artifact: CrearCaseArtifact, label: string): void {
  if (
    !artifact ||
    typeof artifact !== 'object' ||
    !CASE_ARTIFACT_KINDS.has(artifact.kind) ||
    typeof artifact.label !== 'string' ||
    !artifact.label.trim() ||
    typeof artifact.status !== 'string' ||
    !artifact.status.trim()
  ) {
    throw new Error(`CREAR JSON: ${label} is invalid`);
  }
  if (artifact.cue) validateVisualCue(artifact.cue, `${label}.cue`);
}

function validateLearningOpportunity(
  opportunity: CrearLearningOpportunity,
  label: string
): void {
  if (
    !opportunity ||
    typeof opportunity !== 'object' ||
    typeof opportunity.id !== 'string' ||
    !opportunity.id.trim() ||
    !Array.isArray(opportunity.constructs) ||
    opportunity.constructs.length === 0 ||
    opportunity.constructs.some((construct) => !LEARNING_CONSTRUCTS.has(construct)) ||
    new Set(opportunity.constructs).size !== opportunity.constructs.length ||
    !LEARNING_CONDITIONS.has(opportunity.condition) ||
    !LEARNING_NOVELTIES.has(opportunity.novelty) ||
    !LEARNING_TIMINGS.has(opportunity.timing)
  ) {
    throw new Error(`CREAR JSON: ${label} is invalid`);
  }
}

function assertStringArray(value: unknown, label: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`CREAR JSON: ${label} must be a string array`);
  }
}

function validateBranch(branch: CrearClassifierBranch, label: string): void {
  if (!branch || typeof branch !== 'object') {
    throw new Error(`CREAR JSON: ${label} must be an object`);
  }
  if (typeof branch.rama !== 'string' || branch.rama.length === 0) {
    throw new Error(`CREAR JSON: ${label}.rama must be a non-empty string`);
  }
  if (typeof branch.descripcion !== 'string' || branch.descripcion.length === 0) {
    throw new Error(`CREAR JSON: ${label}.descripcion must be a non-empty string`);
  }
  if (typeof branch.correcto !== 'boolean') {
    throw new Error(`CREAR JSON: ${label}.correcto must be boolean`);
  }
  if (branch.score !== undefined && (!Number.isFinite(branch.score) || branch.score < 0)) {
    throw new Error(`CREAR JSON: ${label}.score must be a non-negative number`);
  }
  if (branch.prioridad !== undefined && !Number.isFinite(branch.prioridad)) {
    throw new Error(`CREAR JSON: ${label}.prioridad must be a finite number`);
  }
  assertStringArray(branch.ejemplos, `${label}.ejemplos`);
  assertStringArray(branch.keywords, `${label}.keywords`);
  assertStringArray(branch.match?.all, `${label}.match.all`);
  assertStringArray(branch.match?.any, `${label}.match.any`);
  assertStringArray(branch.match?.none, `${label}.match.none`);
  if (
    branch.match?.allGroups !== undefined &&
    (!Array.isArray(branch.match.allGroups) ||
      branch.match.allGroups.some(
        (group) => !Array.isArray(group) || group.length === 0 || group.some((item) => typeof item !== 'string')
      ))
  ) {
    throw new Error(`CREAR JSON: ${label}.match.allGroups must contain non-empty string arrays`);
  }
}

function validateMeta(meta: CrearStepMeta, refId: string): void {
  if (!meta || typeof meta !== 'object') {
    throw new Error(`CREAR JSON: ${refId}.crear must be an object`);
  }
  if (meta.audio !== undefined) {
    if (typeof meta.audio.src !== 'string' || !meta.audio.src.startsWith('/audio/')) {
      throw new Error(`CREAR JSON: ${refId}.crear.audio.src must start with /audio/`);
    }
    if (typeof meta.audio.text !== 'string' || meta.audio.text.length === 0) {
      throw new Error(`CREAR JSON: ${refId}.crear.audio.text must be non-empty`);
    }
  }
  if (meta.input !== undefined && !INPUT_MODES.has(meta.input)) {
    throw new Error(`CREAR JSON: ${refId}.crear.input is invalid`);
  }
  if (meta.fase !== undefined && !FASES.has(meta.fase)) {
    throw new Error(`CREAR JSON: ${refId}.crear.fase is invalid`);
  }
  if (meta.stage !== undefined && !STAGES.has(meta.stage)) {
    throw new Error(`CREAR JSON: ${refId}.crear.stage is invalid`);
  }
  if (meta.scene !== undefined && !SCENES.has(meta.scene)) {
    throw new Error(`CREAR JSON: ${refId}.crear.scene is invalid`);
  }
  if (
    meta.actionLabel !== undefined &&
    (typeof meta.actionLabel !== 'string' || !meta.actionLabel.trim())
  ) {
    throw new Error(`CREAR JSON: ${refId}.crear.actionLabel must be non-empty`);
  }
  if (meta.comparison !== undefined) {
    if (
      typeof meta.comparison.left !== 'string' ||
      !meta.comparison.left.trim() ||
      typeof meta.comparison.right !== 'string' ||
      !meta.comparison.right.trim()
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.comparison sentences must be non-empty`);
    }
    for (const field of ['leftLabel', 'rightLabel'] as const) {
      if (
        meta.comparison[field] !== undefined &&
        (typeof meta.comparison[field] !== 'string' || !meta.comparison[field]?.trim())
      ) {
        throw new Error(`CREAR JSON: ${refId}.crear.comparison.${field} must be non-empty`);
      }
    }
    if (meta.comparison.rightEmphasis !== undefined) {
      const emphasis = meta.comparison.rightEmphasis.trim();
      if (
        !emphasis ||
        !meta.comparison.right.toLocaleLowerCase('en').includes(emphasis.toLocaleLowerCase('en'))
      ) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.comparison.rightEmphasis must occur in the right sentence`
        );
      }
    }
  }
  if (meta.caseArtifact !== undefined) {
    validateCaseArtifact(meta.caseArtifact, `${refId}.crear.caseArtifact`);
  }
  if (meta.learningOpportunity !== undefined) {
    validateLearningOpportunity(
      meta.learningOpportunity,
      `${refId}.crear.learningOpportunity`
    );
  }
  if (
    meta.retestDelayHours !== undefined &&
    (!Number.isFinite(meta.retestDelayHours) || meta.retestDelayHours < 0)
  ) {
    throw new Error(`CREAR JSON: ${refId}.crear.retestDelayHours must be non-negative`);
  }
  if (meta.evidencePresentation !== undefined) {
    if (!Array.isArray(meta.evidence) || meta.evidence.length === 0) {
      throw new Error(`CREAR JSON: ${refId}.crear.evidencePresentation requires evidence`);
    }
    if (
      meta.evidencePresentation.mode !== 'sequential' ||
      typeof meta.evidencePresentation.allowReview !== 'boolean'
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.evidencePresentation is invalid`);
    }
    if (
      meta.evidencePresentation.initialEvidenceId !== undefined &&
      !meta.evidence?.some((item) => item.id === meta.evidencePresentation?.initialEvidenceId)
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.evidencePresentation.initialEvidenceId is not authored`
      );
    }
  }
  if (meta.responseParts !== undefined) {
    if (meta.input !== 'text') {
      throw new Error(`CREAR JSON: ${refId}.crear.responseParts requires text input`);
    }
    if (!Array.isArray(meta.responseParts) || meta.responseParts.length !== 3) {
      throw new Error(`CREAR JSON: ${refId}.crear.responseParts must contain exactly three parts`);
    }
    const categories = meta.responseParts.map((part, index) => {
      if (!part || typeof part !== 'object') {
        throw new Error(`CREAR JSON: ${refId}.crear.responseParts[${index}] must be an object`);
      }
      if (part.id !== part.categoria || !RESPONSE_CATEGORY_SET.has(part.categoria)) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.responseParts[${index}] has an invalid category`
        );
      }
      for (const field of ['label', 'prompt', 'placeholder'] as const) {
        if (typeof part[field] !== 'string' || part[field].trim().length === 0) {
          throw new Error(
            `CREAR JSON: ${refId}.crear.responseParts[${index}].${field} must be non-empty`
          );
        }
      }
      if (!Number.isFinite(part.minChars) || part.minChars < 1) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.responseParts[${index}].minChars must be positive`
        );
      }
      return part.categoria;
    });
    if (
      new Set(categories).size !== RESPONSE_CATEGORIES.length ||
      RESPONSE_CATEGORIES.some((category) => !categories.includes(category))
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.responseParts must author each semantic category once`
      );
    }
  }
  if (meta.formula !== undefined) {
    if (
      !Array.isArray(meta.formula) ||
      meta.formula.length === 0 ||
      meta.formula.some((part) =>
        !part ||
        typeof part.value !== 'string' ||
        !part.value.trim() ||
        typeof part.label !== 'string' ||
        !part.label.trim() ||
        (part.lang !== undefined && part.lang !== 'es-MX' && part.lang !== 'en-US')
      )
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.formula must contain labeled sentence parts`);
    }
  }
  if (meta.certaintyMap !== undefined) {
    if (meta.input !== 'match') {
      throw new Error(`CREAR JSON: ${refId}.crear.certaintyMap requires match input`);
    }
    const map = meta.certaintyMap;
    if (map.artifact !== undefined) {
      validateCaseArtifact(map.artifact, `${refId}.crear.certaintyMap.artifact`);
    }
    if (typeof map.instruction !== 'string' || map.instruction.trim().length === 0) {
      throw new Error(`CREAR JSON: ${refId}.crear.certaintyMap.instruction must be non-empty`);
    }
    if (!Array.isArray(map.categories) || map.categories.length !== RESPONSE_CATEGORIES.length) {
      throw new Error(`CREAR JSON: ${refId}.crear.certaintyMap.categories must contain three items`);
    }
    const categoryIds = map.categories.map((category, index) => {
      if (
        !category ||
        !RESPONSE_CATEGORY_SET.has(category.id) ||
        typeof category.label !== 'string' ||
        typeof category.term !== 'string' ||
        !category.label.trim() ||
        !category.term.trim()
      ) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.certaintyMap.categories[${index}] is invalid`
        );
      }
      return category.id;
    });
    if (
      new Set(categoryIds).size !== RESPONSE_CATEGORIES.length ||
      RESPONSE_CATEGORIES.some((category) => !categoryIds.includes(category))
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.certaintyMap.categories must author each category once`
      );
    }
    if (!Array.isArray(map.statements) || map.statements.length !== RESPONSE_CATEGORIES.length) {
      throw new Error(`CREAR JSON: ${refId}.crear.certaintyMap.statements must contain three items`);
    }
    const statementIds = new Set<string>();
    map.statements.forEach((statement, index) => {
      if (
        !statement ||
        typeof statement.id !== 'string' ||
        !statement.id.trim() ||
        statementIds.has(statement.id) ||
        typeof statement.clue !== 'string' ||
        !statement.clue.trim() ||
        typeof statement.sentenceStart !== 'string' ||
        !statement.sentenceStart.trim() ||
        typeof statement.sentenceEnd !== 'string' ||
        !statement.sentenceEnd.trim() ||
        !RESPONSE_CATEGORY_SET.has(statement.correctCategory)
      ) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.certaintyMap.statements[${index}] is invalid`
        );
      }
      for (const field of ['translationEs', 'feedbackIncorrecto'] as const) {
        if (
          statement[field] !== undefined &&
          (typeof statement[field] !== 'string' || !statement[field].trim())
        ) {
          throw new Error(
            `CREAR JSON: ${refId}.crear.certaintyMap.statements[${index}].${field} must be non-empty`
          );
        }
      }
      if (statement.visualCue !== undefined) {
        validateVisualCue(
          statement.visualCue,
          `${refId}.crear.certaintyMap.statements[${index}].visualCue`
        );
      }
      statementIds.add(statement.id);
    });
    for (const field of ['successTitle', 'successBody'] as const) {
      if (typeof map[field] !== 'string' || !map[field].trim()) {
        throw new Error(`CREAR JSON: ${refId}.crear.certaintyMap.${field} must be non-empty`);
      }
    }
    if (map.production !== undefined) {
      if (
        !RESPONSE_CATEGORY_SET.has(map.production.category) ||
        typeof map.production.prompt !== 'string' ||
        !map.production.prompt.trim() ||
        typeof map.production.placeholder !== 'string' ||
        !map.production.placeholder.trim() ||
        !Number.isFinite(map.production.minChars) ||
        map.production.minChars < 1
      ) {
        throw new Error(`CREAR JSON: ${refId}.crear.certaintyMap.production is invalid`);
      }
    }
  }

  const classifier = meta.classifier;
  if (!classifier) return;
  if (!Array.isArray(classifier.ramas) || classifier.ramas.length === 0) {
    throw new Error(`CREAR JSON: ${refId}.crear.classifier.ramas must be non-empty`);
  }
  if (
    !Number.isFinite(classifier.minConfianza) ||
    classifier.minConfianza < 0 ||
    classifier.minConfianza > 1
  ) {
    throw new Error(`CREAR JSON: ${refId}.crear.classifier.minConfianza must be between 0 and 1`);
  }
  classifier.ramas.forEach((branch, index) => validateBranch(branch, `${refId}.ramas[${index}]`));
  const branchIds = classifier.ramas.map((branch) => branch.rama);
  if (new Set(branchIds).size !== branchIds.length) {
    throw new Error(`CREAR JSON: ${refId}.crear.classifier.ramas must be unique`);
  }
  if (!branchIds.includes(classifier.fallbackRama)) {
    throw new Error(`CREAR JSON: ${refId}.crear.classifier.fallbackRama is not authored`);
  }
}

export function validateCrearWorkshopJson(input: unknown): CrearWorkshop {
  const workshop = validateWorkshopJson(input) as CrearWorkshop;
  if (
    workshop.audio_asset_version !== undefined &&
    (typeof workshop.audio_asset_version !== 'string' || workshop.audio_asset_version.length === 0)
  ) {
    throw new Error('CREAR JSON: audio_asset_version must be a non-empty string');
  }
  const refs = workshop.pasos.map((step) => step.ref_id);
  if (refs.some((refId) => typeof refId !== 'string' || refId.length === 0)) {
    throw new Error('CREAR JSON: every step must have a non-empty ref_id');
  }
  if (new Set(refs).size !== refs.length) {
    throw new Error('CREAR JSON: ref_id values must be unique');
  }
  const refSet = new Set(refs as string[]);

  workshop.pasos.forEach((step) => {
    const refId = step.ref_id as string;
    validateMeta(step.crear as CrearStepMeta, refId);
    const targets = [
      step.crear?.nextRefId,
      ...(step.crear?.branchRules ?? []).map((rule) => rule.nextRefId),
    ].filter((target): target is string => typeof target === 'string');
    for (const target of targets) {
      if (!refSet.has(target)) {
        throw new Error(`CREAR JSON: ${refId} points to missing step ${target}`);
      }
    }
  });

  if (workshop.pasos.length > 0) {
    const reachable = new Set<number>();
    const queue = [0];
    let reachesTerminal = false;

    while (queue.length > 0) {
      const index = queue.shift()!;
      if (reachable.has(index)) continue;
      reachable.add(index);

      const step = workshop.pasos[index]!;
      const authoredTargets = [
        step.crear?.nextRefId,
        ...(step.crear?.branchRules ?? []).map((rule) => rule.nextRefId),
      ].filter((target): target is string => typeof target === 'string');
      const targetIndexes = authoredTargets.map((target) => refs.indexOf(target));

      if (!step.crear?.nextRefId && index + 1 < workshop.pasos.length) {
        targetIndexes.push(index + 1);
      }

      if (targetIndexes.length === 0) {
        reachesTerminal = true;
      }

      for (const targetIndex of targetIndexes) {
        if (targetIndex >= 0 && !reachable.has(targetIndex)) queue.push(targetIndex);
      }
    }

    if (!reachesTerminal) {
      throw new Error('CREAR JSON: step graph has no reachable terminal step');
    }
  }

  return workshop;
}
