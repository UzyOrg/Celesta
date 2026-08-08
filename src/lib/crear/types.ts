import type { Paso, Workshop } from '@/lib/workshops/schema';

export type CrearLessonId = 'CREAR-ENGLISH-DEDUCTION-V1';

export type CrearFase = 'pre_check' | 'practica' | 'post' | 'transfer' | 'teach_back';

export type CrearInputMode = 'none' | 'text' | 'choice' | 'match';

export type CrearExperienceStage = 'descubre' | 'practica' | 'aplica' | 'recuerda';

export type CrearScene =
  | 'arrival'
  | 'precheck'
  | 'signal'
  | 'contrast'
  | 'prism'
  | 'practice'
  | 'transfer-bridge'
  | 'transfer'
  | 'closure'
  | 'retest';

export interface CrearAudioLine {
  src: string;
  text: string;
  lang?: 'en-US' | 'es-MX';
  label?: string;
}

export interface CrearBranchFeedback {
  title: string;
  body: string;
  actionLabel?: string;
}

export interface CrearLocalMatch {
  all?: string[];
  allGroups?: string[][];
  any?: string[];
  none?: string[];
}

export interface CrearClassifierBranch {
  rama: string;
  descripcion: string;
  prioridad?: number;
  ejemplos?: string[];
  keywords?: string[];
  correcto: boolean;
  score?: number;
  pista?: boolean;
  feedback?: CrearBranchFeedback;
  match?: CrearLocalMatch;
}

export interface CrearClassifierDefinition {
  ramas: CrearClassifierBranch[];
  fallbackRama: string;
  minConfianza: number;
}

export interface CrearBranchRule {
  rule: unknown;
  nextRefId: string;
}

export interface CrearDisplayCopy {
  eyebrow: string;
  headline: string;
  body?: string;
  moduleLabel?: string;
  levelLabel?: string;
  learningGoal?: string;
}

export interface CrearEvidenceItem {
  id: string;
  label: string;
  value: string;
}

export type CrearCaseArtifactKind = 'poster' | 'model' | 'trip' | 'mural';

export type CrearVisualCueKind =
  | 'paint'
  | 'glue'
  | 'presence'
  | 'location'
  | 'trip';

export interface CrearVisualCue {
  kind: CrearVisualCueKind;
  label: string;
  detail: string;
}

export interface CrearCaseArtifact {
  kind: CrearCaseArtifactKind;
  label: string;
  status: string;
  cue?: CrearVisualCue;
}

export type CrearLearningConstruct =
  | 'evidence_comprehension'
  | 'certainty_calibration'
  | 'modal_form';

export type CrearLearningCondition = 'supported' | 'independent';
export type CrearLearningNovelty = 'same_case' | 'new_case';
export type CrearLearningTiming = 'immediate' | 'delayed';

/**
 * The evidential shape of a clue, independent of the names and objects on
 * screen. `novelty: new_case` only says the surface changed; it cannot say
 * whether the learner met a structure they had already solved. Recording the
 * frame is what separates near transfer from far transfer in the analysis
 * instead of letting the case label imply more novelty than there is.
 *
 * - `physical_trace` — a physical remnant links the person to the action.
 * - `presence_unobserved` — the person was there, nobody saw what they did.
 * - `absence_elsewhere` — the person was demonstrably somewhere else.
 */
export type CrearCueFrame =
  | 'physical_trace'
  | 'presence_unobserved'
  | 'absence_elsewhere';

export interface CrearLearningOpportunity {
  id: string;
  constructs: CrearLearningConstruct[];
  condition: CrearLearningCondition;
  novelty: CrearLearningNovelty;
  timing: CrearLearningTiming;
  /**
   * Omitted on steps that probe more than one frame in a single opportunity;
   * per-item frames then live on the items themselves.
   */
  cueFrame?: CrearCueFrame;
  /**
   * Whether this observation may back a learning claim. Defaults to `true`.
   *
   * A construct measured once, assisted, on the same case has no delta, no
   * independence and no durability — it cannot support a claim about what the
   * learner knows. Recording it is still useful: it describes the route the
   * learner took. Declaring `evidentiary: false` keeps the row and bars it
   * from `aggregateCrearConstructStates`, so process data can never be read
   * back as outcome data. Validation forces the declaration wherever a
   * construct is never observed independently, so this cannot be forgotten.
   */
  evidentiary?: boolean;
}

export interface CrearLearningObservation extends CrearLearningOpportunity {
  stepId: string;
  branch: string;
  correct: boolean;
  assisted: boolean;
  attempt: number;
  recordedAt: number;
  statementId?: string;
}

export type CrearResponseCategory = 'casi_seguro' | 'posible' | 'imposible';

export interface CrearEvidencePresentation {
  mode: 'sequential';
  allowReview: boolean;
  initialEvidenceId?: string;
}

export interface CrearResponsePart {
  id: CrearResponseCategory;
  categoria: CrearResponseCategory;
  label: string;
  prompt: string;
  placeholder: string;
  minChars: number;
}

export interface CrearResponsePartAnswer {
  categoria: CrearResponseCategory;
  texto: string;
  rama?: string;
}

export interface CrearCertaintyCategory {
  id: CrearResponseCategory;
  label: string;
  term: string;
}

export interface CrearCertaintyStatement {
  id: string;
  clue: string;
  translationEs?: string;
  visualCue?: CrearVisualCue;
  sentenceStart: string;
  sentenceEnd: string;
  correctCategory: CrearResponseCategory;
  /** Evidential shape of this clue; see {@link CrearCueFrame}. */
  cueFrame?: CrearCueFrame;
  feedbackIncorrecto?: string;
}

export interface CrearProductionPrompt {
  category: CrearResponseCategory;
  prompt: string;
  placeholder: string;
  minChars: number;
}

export interface CrearCertaintyMap {
  instruction: string;
  artifact?: CrearCaseArtifact;
  categories: CrearCertaintyCategory[];
  statements: CrearCertaintyStatement[];
  production?: CrearProductionPrompt;
  successTitle: string;
  successBody: string;
}

export interface CrearCertaintyMapSubmission {
  assignments: Record<string, CrearResponseCategory>;
  productionText?: string;
  assisted: boolean;
  /** Time from the active task becoming available until submission, in ms. */
  latencyMs?: number;
}

export interface CrearCertaintyMapAttempt {
  statementId: string;
  category: CrearResponseCategory;
  correct: boolean;
  attempt: number;
  assignments: Record<string, CrearResponseCategory>;
  /**
   * Assistance received **on this clue** — a retry or a translation — never on
   * a sibling clue. A map-wide flag made every clue after the first mistake
   * look assisted, so the flag stopped meaning what it says.
   */
  assisted: boolean;
  /** Evidential shape of this clue; see {@link CrearCueFrame}. */
  cueFrame?: CrearCueFrame;
  /** Statement ids in the order this learner saw them. */
  shownOrder?: string[];
  /** Time from this clue becoming available until the decision, in ms. */
  latencyMs?: number;
}

/**
 * A short, pre-instruction baseline. Its language stays neutral so it can
 * measure evidence calibration without teaching the English modal mapping.
 */
export interface CrearPrecheckOption {
  id: CrearResponseCategory;
  label: string;
}

export interface CrearPrecheckItem {
  id: string;
  clue: string;
  prompt: string;
  correctCategory: CrearResponseCategory;
  /** Evidential shape of this clue; see {@link CrearCueFrame}. */
  cueFrame?: CrearCueFrame;
}

export interface CrearPrecheck {
  options: CrearPrecheckOption[];
  items: CrearPrecheckItem[];
  completeLabel?: string;
}

export interface CrearPrecheckAttempt {
  itemId: string;
  category: CrearResponseCategory;
  correct: boolean;
  /** Evidential shape of this clue; see {@link CrearCueFrame}. */
  cueFrame?: CrearCueFrame;
  /** Item ids in the order this learner saw them. */
  shownOrder?: string[];
  /** Time from this baseline item becoming available until it is saved. */
  latencyMs?: number;
}

export type CrearBaselineGate = 'yes' | 'no';

/**
 * Pre-instruction production baseline. It measures what the learner can already
 * write before any teaching, so a later transfer sentence can be attributed to
 * the lesson instead of to prior knowledge. It never teaches: no guide, no
 * classifier, and no corrective feedback.
 */
export interface CrearBaselineProduction {
  gatePrompt: string;
  gateYesLabel: string;
  gateNoLabel: string;
  attemptPrompt: string;
  /**
   * Overrides `attemptPrompt` after "todavía no". Falls back to `attemptPrompt`
   * when absent, since only that gate answer needs the reassurance that the
   * attempt isn't graded.
   */
  attemptPromptNo?: string;
  /**
   * Label of the single primary action while the field is empty **after
   * "todavía no"**. Submitting empty is a measured behaviour, not an escape
   * hatch, so it is the same button as `submitLabel` rather than a competing
   * secondary control. After "sí" it never shows: the declaration commits the
   * learner to an attempt, and the way out is to correct the gate.
   */
  emptySubmitLabel: string;
  submitLabel: string;
  /**
   * Shown only while the primary action is blocked after "sí". It must name
   * `gateNoLabel`, because that is the only exit and a disabled control with
   * no stated exit is the failure mode this copy exists to prevent.
   */
  blockedHint?: string;
}

export interface CrearBaselineProductionSubmission {
  text: string;
  gate: CrearBaselineGate;
  skipped: boolean;
  /** Time from the text field becoming available until submission, in ms. */
  latencyMs?: number;
}

export interface CrearConceptCard {
  id: string;
  term: string;
  meaning: string;
  description?: string;
  example: string;
  strength: 'strong' | 'open' | 'ruled_out';
}

export interface CrearFormulaPart {
  value: string;
  label: string;
  lang?: 'es-MX' | 'en-US';
}

export interface CrearComparison {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  rightEmphasis?: string;
}

/**
 * What an independent production step expects, declared so that form and
 * calibration can be scored as two separate bits.
 *
 * The classifier decides which authored feedback the learner reads. It cannot
 * decide what was learned: `misconcepcion_certeza` is a calibration error that
 * often arrives inside a flawless `modal + have + participle`, and reading the
 * evidence off the branch marked that form wrong. `subject` also makes the
 * person a checked claim rather than an assumption — a deduction about the
 * wrong classmate is a real error and now has somewhere to be recorded.
 */
export interface CrearProductionTarget {
  /** The certainty the authored evidence supports. */
  category: CrearResponseCategory;
  /** The expected subject: the case name plus the pronouns that stand in for it. */
  subject: string[];
  /** Past participles accepted for this case's action. */
  participles: string[];
}

export interface CrearStepMeta {
  fase?: CrearFase;
  audio?: CrearAudioLine;
  input?: CrearInputMode;
  nextRefId?: string;
  classifier?: CrearClassifierDefinition;
  productionTarget?: CrearProductionTarget;
  branchRules?: CrearBranchRule[];
  stage?: CrearExperienceStage;
  scene?: CrearScene;
  display?: CrearDisplayCopy;
  actionLabel?: string;
  caseArtifact?: CrearCaseArtifact;
  learningOpportunity?: CrearLearningOpportunity;
  evidence?: CrearEvidenceItem[];
  evidencePresentation?: CrearEvidencePresentation;
  responseParts?: CrearResponsePart[];
  precheck?: CrearPrecheck;
  baselineProduction?: CrearBaselineProduction;
  certaintyMap?: CrearCertaintyMap;
  guideAvailable?: boolean;
  concepts?: CrearConceptCard[];
  comparison?: CrearComparison;
  formula?: CrearFormulaPart[];
  revealFeedback?: boolean;
  allowRetry?: boolean;
  maxAttempts?: number;
  minChars?: number;
  retestDelayHours?: number;
}

export type CrearPaso = Paso & {
  crear?: CrearStepMeta;
};

export type CrearWorkshop = Omit<Workshop, 'pasos'> & {
  audio_asset_version?: string;
  pasos: CrearPaso[];
};

export interface ClassifyRequest {
  tallerId: CrearLessonId;
  pasoRefId: string;
  texto: string;
  partes?: CrearResponsePartAnswer[];
}

/**
 * Which classifier produced the branch that the learner actually saw.
 * `local_offline` means the request never reached the route, so the client
 * fell back to deterministic keyword matching on its own.
 */
export type CrearClassifierSource = 'model' | 'local' | 'local_offline';

export interface ClassifyResponse {
  rama: string;
  confianza: number;
  source?: CrearClassifierSource;
  /**
   * Arbitration record. Both predictions are kept next to the raw text so a
   * human label can later be compared against what the machine believed. The
   * pair only exists during the session; it cannot be reconstructed afterwards.
   */
  localRama?: string;
  localConfianza?: number;
  modelRama?: string;
  modelConfianza?: number;
  /** Only present when both classifiers ran. */
  agreed?: boolean;
}

export interface CrearTelemetryResult extends Record<string, unknown> {
  fase: CrearFase;
  correcto: boolean;
  rama: string;
  texto?: string;
  score?: number;
  /** Client-measured active-task latency; excludes queued/network delivery time. */
  latencyMs?: number;
  partes?: CrearResponsePartAnswer[];
  mapping?: Record<string, CrearResponseCategory>;
  assisted?: boolean;
  targetCategory?: CrearResponseCategory;
  statementId?: string;
  attempt?: number;
  /** Which classifier decided this branch, and whether the other one agreed. */
  classifierSource?: CrearClassifierSource;
  classifierAgreed?: boolean;
  /** Self-efficacy answer that preceded a pre-instruction production attempt. */
  baselineGate?: CrearBaselineGate;
  /**
   * Structural reading of an independent production attempt, kept beside the
   * classifier branch so form and calibration stay separable in analysis. The
   * branch says what the learner was *told*; these say what they *wrote*.
   */
  expressedCategory?: CrearResponseCategory | null;
  formWellFormed?: boolean;
  subjectPresent?: boolean;
  /**
   * Whether the written modal matches the certainty the learner chose one
   * screen earlier. A learner can be internally consistent and still
   * mis-calibrated; those are different findings and must not collapse.
   */
  certaintyConsistent?: boolean;
  /**
   * Order in which the options or items were actually shown, after the
   * per-study shuffle. Without it a position bias is invisible in the data.
   */
  shownOrder?: string[];
  learningOpportunity?: CrearLearningOpportunity;
  /** @deprecated Compatibility with events emitted before content version 2026-07-19. */
  intento?: number;
  /**
   * Correlaciona pre/post/transfer/retest. En análisis, un retest con un delta
   * menor a retestDelayHours desde taller_completado se considera no válido.
   */
  studyId?: string;
}

export const CREAR_MAX_ANSWER_LENGTH = 1200;
export const CREAR_MAX_RESPONSE_PART_LENGTH = 360;

export const DEFAULT_CREAR_LESSON_ID: CrearLessonId = 'CREAR-ENGLISH-DEDUCTION-V1';

/**
 * The pilot ships one lesson. This stays an array because `/api/classify`
 * builds its request enum from it, so adding a lesson is a one-line change
 * that keeps the route's allowlist and the type in sync by construction.
 */
export const ALL_CREAR_LESSON_IDS: readonly CrearLessonId[] = [DEFAULT_CREAR_LESSON_ID];
