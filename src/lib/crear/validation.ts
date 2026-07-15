import { validateWorkshopJson } from '@/lib/workshops/schema';
import type { CrearClassifierBranch, CrearStepMeta, CrearWorkshop } from './types';

const INPUT_MODES = new Set(['none', 'text', 'choice', 'verdict']);
const FASES = new Set(['pre_check', 'practica', 'post', 'transfer', 'teach_back']);
const STAGES = new Set(['descubre', 'practica', 'aplica', 'recuerda']);
const SCENES = new Set(['arrival', 'signal', 'contrast', 'prism', 'practice', 'transfer', 'closure', 'retest']);

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
