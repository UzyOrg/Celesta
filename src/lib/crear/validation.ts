import { validateWorkshopJson } from '../workshops/schema';
import { buildCrearFormAssemblyText } from './formAssembly';
import { readModalForm } from './modalForm';
import type {
  CrearBaselineProduction,
  CrearCaseArtifact,
  CrearClassifierBranch,
  CrearFormAssemblyFeedback,
  CrearLearningOpportunity,
  CrearProductionTarget,
  CrearResponseCategory,
  CrearStepMeta,
  CrearVisualCue,
  CrearWorkshop,
} from './types';

const INPUT_MODES = new Set(['none', 'text', 'choice', 'match', 'assembly']);
const FASES = new Set(['pre_check', 'practica', 'post', 'transfer', 'teach_back']);
const STAGES = new Set(['descubre', 'practica', 'aplica', 'recuerda']);
const SCENES = new Set([
  'arrival',
  'precheck',
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
const CASE_ARTIFACT_KINDS = new Set(['poster', 'model', 'trip', 'mural']);
const VISUAL_CUE_KINDS = new Set(['paint', 'glue', 'presence', 'location', 'trip']);
const LEARNING_CONSTRUCTS = new Set([
  'evidence_comprehension',
  'certainty_calibration',
  'modal_form',
]);
const CUE_FRAMES = new Set([
  'physical_trace',
  'presence_unobserved',
  'absence_elsewhere',
]);
const BASELINE_PRODUCTION_FIELDS: readonly (keyof CrearBaselineProduction)[] = [
  'gatePrompt',
  'gateYesLabel',
  'gateNoLabel',
  'attemptPrompt',
  'emptySubmitLabel',
  'submitLabel',
];
const BRANCH_TONES = new Set(['exito', 'parcial', 'ajuste']);
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
    !LEARNING_TIMINGS.has(opportunity.timing) ||
    (opportunity.cueFrame !== undefined && !CUE_FRAMES.has(opportunity.cueFrame)) ||
    (opportunity.evidentiary !== undefined && typeof opportunity.evidentiary !== 'boolean')
  ) {
    throw new Error(`CREAR JSON: ${label} is invalid`);
  }
}

function validateProductionTarget(target: CrearProductionTarget, label: string): void {
  if (
    !target ||
    typeof target !== 'object' ||
    !RESPONSE_CATEGORY_SET.has(target.category) ||
    !Array.isArray(target.subject) ||
    target.subject.length === 0 ||
    target.subject.some((entry) => typeof entry !== 'string' || !entry.trim()) ||
    !Array.isArray(target.participles) ||
    target.participles.length === 0 ||
    target.participles.some((entry) => typeof entry !== 'string' || !entry.trim())
  ) {
    throw new Error(`CREAR JSON: ${label} is invalid`);
  }
}

function validateFormAssemblyFeedback(
  feedback: CrearFormAssemblyFeedback,
  label: string
): void {
  if (
    !feedback ||
    typeof feedback !== 'object' ||
    typeof feedback.rama !== 'string' ||
    !feedback.rama.trim() ||
    typeof feedback.title !== 'string' ||
    !feedback.title.trim() ||
    typeof feedback.body !== 'string' ||
    !feedback.body.trim()
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
  if (branch.tono !== undefined && !BRANCH_TONES.has(branch.tono)) {
    throw new Error(`CREAR JSON: ${label}.tono must be exito, parcial, or ajuste`);
  }
  if (branch.tono === 'exito' && !branch.correcto) {
    throw new Error(`CREAR JSON: ${label}.tono exito requires correcto true`);
  }
  if (branch.tono === 'parcial' && (branch.score ?? 0) <= 0) {
    throw new Error(`CREAR JSON: ${label}.tono parcial requires a positive score`);
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
  if (meta.productionTarget !== undefined) {
    validateProductionTarget(meta.productionTarget, `${refId}.crear.productionTarget`);
  }
  if (meta.verbSuggestion !== undefined) {
    const suggestion = meta.verbSuggestion;
    if (
      !suggestion ||
      typeof suggestion !== 'object' ||
      typeof suggestion.label !== 'string' ||
      !suggestion.label.trim() ||
      typeof suggestion.base !== 'string' ||
      !suggestion.base.trim() ||
      typeof suggestion.participle !== 'string' ||
      !suggestion.participle.trim() ||
      suggestion.base.trim().toLocaleLowerCase('en') ===
        suggestion.participle.trim().toLocaleLowerCase('en')
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.verbSuggestion is invalid`);
    }
    if (
      meta.input !== 'text' ||
      !meta.learningOpportunity?.constructs.includes('modal_form') ||
      !meta.productionTarget
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.verbSuggestion requires a modal_form text production target`
      );
    }
    const suggestedParticiple = suggestion.participle.trim().toLocaleLowerCase('en');
    if (
      !meta.productionTarget.participles.some(
        (participle) => participle.trim().toLocaleLowerCase('en') === suggestedParticiple
      )
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.verbSuggestion.participle must be accepted by productionTarget`
      );
    }
  }
  /**
   * `productionTarget` is the contract behind the `modal_form` construct, the
   * same way `guideAvailable` is the contract behind `independent`. Without it
   * the only available reading of "did they get the form right" is the
   * classifier branch — and that branch also carries calibration, so the two
   * constructs collapse into one score. Fail closed.
   */
  if (
    meta.learningOpportunity?.constructs.includes('modal_form') &&
    meta.productionTarget === undefined
  ) {
    throw new Error(
      `CREAR JSON: ${refId}.crear.learningOpportunity measures modal_form, so crear.productionTarget is required`
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
  if (meta.precheck !== undefined) {
    if (meta.scene !== 'precheck' || meta.input !== 'choice') {
      throw new Error(`CREAR JSON: ${refId}.crear.precheck requires the precheck choice scene`);
    }
    if (!meta.learningOpportunity) {
      throw new Error(`CREAR JSON: ${refId}.crear.precheck requires a learning opportunity`);
    }

    const precheck = meta.precheck;
    if (!Array.isArray(precheck.options) || precheck.options.length !== RESPONSE_CATEGORIES.length) {
      throw new Error(`CREAR JSON: ${refId}.crear.precheck.options must contain three items`);
    }
    const optionIds = precheck.options.map((option, index) => {
      if (
        !option ||
        !RESPONSE_CATEGORY_SET.has(option.id) ||
        typeof option.label !== 'string' ||
        !option.label.trim()
      ) {
        throw new Error(`CREAR JSON: ${refId}.crear.precheck.options[${index}] is invalid`);
      }
      return option.id;
    });
    if (
      new Set(optionIds).size !== RESPONSE_CATEGORIES.length ||
      RESPONSE_CATEGORIES.some((category) => !optionIds.includes(category))
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.precheck.options must author each category once`);
    }

    if (!Array.isArray(precheck.items) || precheck.items.length !== RESPONSE_CATEGORIES.length) {
      throw new Error(`CREAR JSON: ${refId}.crear.precheck.items must contain three items`);
    }
    const itemIds = new Set<string>();
    precheck.items.forEach((item, index) => {
      if (
        !item ||
        typeof item.id !== 'string' ||
        !item.id.trim() ||
        itemIds.has(item.id) ||
        typeof item.clue !== 'string' ||
        !item.clue.trim() ||
        typeof item.prompt !== 'string' ||
        !item.prompt.trim() ||
        !RESPONSE_CATEGORY_SET.has(item.correctCategory) ||
        (item.cueFrame !== undefined && !CUE_FRAMES.has(item.cueFrame))
      ) {
        throw new Error(`CREAR JSON: ${refId}.crear.precheck.items[${index}] is invalid`);
      }
      itemIds.add(item.id);
    });
    if (
      precheck.completeLabel !== undefined &&
      (typeof precheck.completeLabel !== 'string' || !precheck.completeLabel.trim())
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.precheck.completeLabel must be non-empty`);
    }
  }
  if (meta.baselineProduction !== undefined) {
    if (meta.input !== 'text') {
      throw new Error(`CREAR JSON: ${refId}.crear.baselineProduction requires text input`);
    }
    for (const field of BASELINE_PRODUCTION_FIELDS) {
      if (
        typeof meta.baselineProduction[field] !== 'string' ||
        !meta.baselineProduction[field].trim()
      ) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.baselineProduction.${field} must be a non-empty string`
        );
      }
    }
    /**
     * The blocked state after "sí" is the one disabled control in the flow.
     * Shipping it without copy that names the exit is the exact failure the
     * gate's own "todavía no" is there to absorb, so the hint is optional in
     * the type but must be usable when present.
     */
    if (
      meta.baselineProduction.blockedHint !== undefined &&
      (typeof meta.baselineProduction.blockedHint !== 'string' ||
        !meta.baselineProduction.blockedHint.trim())
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.baselineProduction.blockedHint must be a non-empty string`
      );
    }
    if (
      meta.baselineProduction.attemptPromptNo !== undefined &&
      (typeof meta.baselineProduction.attemptPromptNo !== 'string' ||
        !meta.baselineProduction.attemptPromptNo.trim())
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.baselineProduction.attemptPromptNo must be a non-empty string`
      );
    }
    /**
     * A pre-instruction baseline measures; it must not teach. Guidance or
     * corrective feedback here would contaminate the very comparison the
     * baseline exists to make.
     */
    if (meta.guideAvailable === true) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.baselineProduction cannot offer the guide`
      );
    }
    if (meta.revealFeedback !== false) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.baselineProduction requires revealFeedback false`
      );
    }
    if (meta.classifier !== undefined) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.baselineProduction must not run a classifier`
      );
    }
  }
  if (meta.scene === 'precheck' && meta.precheck === undefined && meta.baselineProduction === undefined) {
    throw new Error(
      `CREAR JSON: ${refId}.crear.scene precheck requires a precheck or baselineProduction config`
    );
  }
  /**
   * `guideAvailable` is the contract behind `condition: "independent"`, so an
   * absent field is never read as a default. The author writes `false`, and a
   * step that claims independence can never expose guidance.
   */
  if (meta.learningOpportunity !== undefined && typeof meta.guideAvailable !== 'boolean') {
    throw new Error(
      `CREAR JSON: ${refId}.crear.guideAvailable must be declared on any step with a learningOpportunity`
    );
  }
  if (
    meta.learningOpportunity?.condition === 'independent' &&
    meta.guideAvailable !== false
  ) {
    throw new Error(
      `CREAR JSON: ${refId}.crear.learningOpportunity is independent, so guideAvailable must be false`
    );
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
    /**
     * The bank always offers the three categories, so a map may probe fewer
     * than three statements without leaking the answer by elimination. Item
     * count is a dosage decision; the category set is not.
     */
    if (
      !Array.isArray(map.statements) ||
      map.statements.length < 1 ||
      map.statements.length > RESPONSE_CATEGORIES.length
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.certaintyMap.statements must contain between one and three items`
      );
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
        !RESPONSE_CATEGORY_SET.has(statement.correctCategory) ||
        (statement.cueFrame !== undefined && !CUE_FRAMES.has(statement.cueFrame))
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
    const statementCategories = map.statements.map((statement) => statement.correctCategory);
    if (new Set(statementCategories).size !== statementCategories.length) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.certaintyMap.statements must not repeat a category`
      );
    }
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
  if (meta.input === 'assembly' && meta.formAssembly === undefined) {
    throw new Error(`CREAR JSON: ${refId}.crear.input assembly requires formAssembly`);
  }
  if (meta.formAssembly !== undefined) {
    const assembly = meta.formAssembly;
    if (meta.input !== 'assembly' || meta.scene !== 'practice') {
      throw new Error(
        `CREAR JSON: ${refId}.crear.formAssembly requires assembly input in the practice scene`
      );
    }
    if (
      meta.learningOpportunity?.constructs.length !== 1 ||
      meta.learningOpportunity.constructs[0] !== 'modal_form' ||
      meta.learningOpportunity.condition !== 'supported' ||
      meta.learningOpportunity.novelty !== 'same_case' ||
      meta.learningOpportunity.timing !== 'immediate'
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.formAssembly requires a supported same-case immediate modal_form opportunity`
      );
    }
    if (
      meta.guideAvailable !== false ||
      meta.revealFeedback !== false ||
      meta.classifier !== undefined ||
      meta.audio !== undefined
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.formAssembly must use inline authored feedback without guide, classifier, or audio`
      );
    }
    if (
      !assembly ||
      typeof assembly !== 'object' ||
      typeof assembly.instruction !== 'string' ||
      !assembly.instruction.trim() ||
      typeof assembly.sentenceStart !== 'string' ||
      !assembly.sentenceStart.trim() ||
      typeof assembly.sentenceEnd !== 'string' ||
      !assembly.sentenceEnd.trim() ||
      assembly.slotCount !== 3 ||
      typeof assembly.actionLabel !== 'string' ||
      !assembly.actionLabel.trim() ||
      typeof assembly.continueLabel !== 'string' ||
      !assembly.continueLabel.trim()
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.formAssembly is invalid`);
    }
    if (!Array.isArray(assembly.tokens) || assembly.tokens.length !== 5) {
      throw new Error(`CREAR JSON: ${refId}.crear.formAssembly.tokens must contain five items`);
    }
    const tokenIds = assembly.tokens.map((token, index) => {
      if (
        !token ||
        typeof token !== 'object' ||
        typeof token.id !== 'string' ||
        !token.id.trim() ||
        typeof token.label !== 'string' ||
        !token.label.trim()
      ) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.formAssembly.tokens[${index}] is invalid`
        );
      }
      return token.id;
    });
    if (
      new Set(tokenIds).size !== tokenIds.length ||
      new Set(assembly.tokens.map((token) => token.label.trim().toLocaleLowerCase('en'))).size !==
        assembly.tokens.length
    ) {
      throw new Error(`CREAR JSON: ${refId}.crear.formAssembly.tokens must be unique`);
    }
    if (
      !Array.isArray(assembly.correctSequence) ||
      assembly.correctSequence.length !== assembly.slotCount ||
      assembly.correctSequence.some(
        (tokenId) => typeof tokenId !== 'string' || !tokenIds.includes(tokenId)
      ) ||
      new Set(assembly.correctSequence).size !== assembly.correctSequence.length
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.formAssembly.correctSequence is invalid`
      );
    }
    validateFormAssemblyFeedback(
      assembly.success,
      `${refId}.crear.formAssembly.success`
    );
    validateFormAssemblyFeedback(
      assembly.fallback,
      `${refId}.crear.formAssembly.fallback`
    );
    if (!Array.isArray(assembly.errorRules) || assembly.errorRules.length < 1) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.formAssembly.errorRules must be non-empty`
      );
    }
    assembly.errorRules.forEach((rule, index) => {
      if (
        !rule ||
        typeof rule !== 'object' ||
        !Number.isInteger(rule.slotIndex) ||
        rule.slotIndex < 0 ||
        rule.slotIndex >= assembly.slotCount ||
        typeof rule.tokenId !== 'string' ||
        !tokenIds.includes(rule.tokenId)
      ) {
        throw new Error(
          `CREAR JSON: ${refId}.crear.formAssembly.errorRules[${index}] is invalid`
        );
      }
      validateFormAssemblyFeedback(
        rule.feedback,
        `${refId}.crear.formAssembly.errorRules[${index}].feedback`
      );
    });
    const branches = [
      assembly.success.rama,
      assembly.fallback.rama,
      ...assembly.errorRules.map((rule) => rule.feedback.rama),
    ];
    if (new Set(branches).size !== branches.length) {
      throw new Error(`CREAR JSON: ${refId}.crear.formAssembly branches must be unique`);
    }
    if (!meta.productionTarget) {
      throw new Error(`CREAR JSON: ${refId}.crear.formAssembly requires productionTarget`);
    }
    const authoredSentence = buildCrearFormAssemblyText(
      assembly,
      assembly.correctSequence
    );
    const reading = readModalForm(authoredSentence, meta.productionTarget);
    if (
      !reading.wellFormed ||
      !reading.subjectPresent ||
      reading.expressedCategory !== meta.productionTarget.category
    ) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.formAssembly.correctSequence must satisfy productionTarget`
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

/**
 * Two invariants that keep the evidence ledger honest, both enforced at the
 * lesson level because neither is visible from a single step.
 *
 * **A construct that is never observed independently cannot be evidence.** One
 * assisted observation on the same case has no delta, no independence and no
 * durability. Left undeclared it still produces ledger rows that read like
 * evidence, inflate coverage and contaminate any later aggregation. The author
 * must say so out loud with `evidentiary: false`; the schema will not accept
 * the ambiguous state.
 *
 * **An evidentiary construct must have a baseline, and it must come first.**
 * A learning claim is a delta, not a level: without a pre-instruction measure,
 * "wrote it correctly at the end" cannot distinguish a lesson that taught it
 * from a learner who already knew. Requiring the baseline to precede every
 * other observation of its construct is also what lets
 * `aggregateCrearConstructStates` identify it structurally
 * (independent + same_case + immediate) instead of guessing from step names.
 */
function validateConstructEvidenceContract(workshop: CrearWorkshop): void {
  interface AuthoredOpportunity {
    refId: string;
    order: number;
    opportunity: CrearLearningOpportunity;
  }

  const byConstruct = new Map<string, AuthoredOpportunity[]>();
  workshop.pasos.forEach((step, order) => {
    const opportunity = step.crear?.learningOpportunity;
    if (!opportunity) return;
    for (const construct of opportunity.constructs) {
      const entries = byConstruct.get(construct) ?? [];
      entries.push({ refId: step.ref_id as string, order, opportunity });
      byConstruct.set(construct, entries);
    }
  });

  for (const [construct, entries] of Array.from(byConstruct.entries())) {
    const hasIndependent = entries.some(
      (entry) => entry.opportunity.condition === 'independent'
    );

    if (!hasIndependent) {
      const undeclared = entries.filter((entry) => entry.opportunity.evidentiary !== false);
      if (undeclared.length > 0) {
        throw new Error(
          `CREAR JSON: ${construct} is never observed independently, so every step measuring it must declare learningOpportunity.evidentiary = false (missing on ${undeclared
            .map((entry) => entry.refId)
            .join(', ')})`
        );
      }
      continue;
    }

    const evidentiary = entries.filter((entry) => entry.opportunity.evidentiary !== false);
    if (evidentiary.length === 0) continue;

    const baselines = evidentiary.filter(
      (entry) =>
        entry.opportunity.condition === 'independent' &&
        entry.opportunity.novelty === 'same_case' &&
        entry.opportunity.timing === 'immediate'
    );
    if (baselines.length !== 1) {
      throw new Error(
        `CREAR JSON: ${construct} needs exactly one pre-instruction baseline (independent, same_case, immediate); found ${baselines.length}`
      );
    }
    const baseline = baselines[0]!;
    const earlier = evidentiary.filter((entry) => entry.order < baseline.order);
    if (earlier.length > 0) {
      throw new Error(
        `CREAR JSON: the ${construct} baseline in ${baseline.refId} must precede every other observation of it (${earlier
          .map((entry) => entry.refId)
          .join(', ')} come first)`
      );
    }
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

  /**
   * A production step asks for the sentence that carries the certainty the
   * previous screen just asked the learner to judge. If the two disagree, a
   * learner who is internally consistent is scored wrong on both, and no
   * analysis can tell which one the lesson broke.
   */
  workshop.pasos.forEach((step) => {
    const target = step.crear?.productionTarget;
    if (!target) return;
    const refId = step.ref_id as string;
    const previous = workshop.pasos.find(
      (candidate) => candidate.crear?.nextRefId === refId
    );
    if (previous?.tipo_paso !== 'opcion_multiple') return;
    const optionIds = previous.opcion_multiple.opciones.map((option) => option.id);
    const isCertaintyScale = RESPONSE_CATEGORIES.every((category) =>
      optionIds.includes(category)
    );
    if (!isCertaintyScale) return;
    if (previous.opcion_multiple.respuesta_correcta !== target.category) {
      throw new Error(
        `CREAR JSON: ${refId}.crear.productionTarget.category must match the certainty answer authored in ${previous.ref_id}`
      );
    }
  });

  /**
   * The delayed retest exists to isolate time. Day 1 asked for `might have` and
   * day 7 asked for `can't have`, so a drop between them was equally explained
   * by forgetting and by the target modal changing — with n≈5 that difference
   * is not recoverable afterwards. The delayed item must be a parallel form of
   * the immediate one: new case, same construct, same target certainty.
   */
  const independentForm = workshop.pasos.filter(
    (step) =>
      step.crear?.productionTarget &&
      step.crear.learningOpportunity?.condition === 'independent' &&
      step.crear.learningOpportunity.novelty === 'new_case' &&
      step.crear.learningOpportunity.constructs.includes('modal_form')
  );
  const immediateForm = independentForm.filter(
    (step) => step.crear?.learningOpportunity?.timing === 'immediate'
  );
  const delayedForm = independentForm.filter(
    (step) => step.crear?.learningOpportunity?.timing === 'delayed'
  );
  for (const delayed of delayedForm) {
    for (const immediate of immediateForm) {
      if (
        delayed.crear?.productionTarget?.category !==
        immediate.crear?.productionTarget?.category
      ) {
        throw new Error(
          `CREAR JSON: ${delayed.ref_id} is the delayed parallel form of ${immediate.ref_id}, so both must target the same certainty`
        );
      }
    }
  }

  validateConstructEvidenceContract(workshop);

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
