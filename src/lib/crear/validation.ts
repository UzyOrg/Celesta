import { validateWorkshopJson } from '@/lib/workshops/schema';
import type {
  CrearClassifierBranch,
  CrearResponseCategory,
  CrearStepMeta,
  CrearWorkshop,
} from './types';

const INPUT_MODES = new Set(['none', 'text', 'choice', 'verdict']);
const FASES = new Set(['pre_check', 'practica', 'post', 'transfer', 'teach_back']);
const STAGES = new Set(['descubre', 'practica', 'aplica', 'recuerda']);
const SCENES = new Set(['arrival', 'signal', 'contrast', 'prism', 'practice', 'transfer', 'closure', 'retest']);
const RESPONSE_CATEGORIES: readonly CrearResponseCategory[] = [
  'casi_seguro',
  'posible',
  'imposible',
];
const RESPONSE_CATEGORY_SET = new Set<CrearResponseCategory>(RESPONSE_CATEGORIES);

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
  if (!meta.audio || typeof meta.audio.src !== 'string' || !meta.audio.src.startsWith('/audio/')) {
    throw new Error(`CREAR JSON: ${refId}.crear.audio.src must start with /audio/`);
  }
  if (typeof meta.audio.text !== 'string' || meta.audio.text.length === 0) {
    throw new Error(`CREAR JSON: ${refId}.crear.audio.text must be non-empty`);
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

  return workshop;
}
