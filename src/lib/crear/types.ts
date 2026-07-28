import type { Paso, Workshop } from '@/lib/workshops/schema';

export type CrearLessonId =
  | 'CREAR-ENGLISH-DEDUCTION-V1'
  | 'CREAR-VIDEOJUEGO'
  | 'CREAR-CANCION'
  | 'CREAR-REDES';

export type CrearFase = 'pre_check' | 'practica' | 'post' | 'transfer' | 'teach_back';

export type CrearInputMode = 'none' | 'text' | 'choice' | 'verdict' | 'match';

export type CrearExperienceStage = 'descubre' | 'practica' | 'aplica' | 'recuerda';

export type CrearScene =
  | 'arrival'
  | 'signal'
  | 'contrast'
  | 'prism'
  | 'practice'
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

export interface CrearVerdictOption {
  id: string;
  label: string;
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
  sentenceStart: string;
  sentenceEnd: string;
  correctCategory: CrearResponseCategory;
}

export interface CrearProductionPrompt {
  category: CrearResponseCategory;
  prompt: string;
  placeholder: string;
  minChars: number;
}

export interface CrearCertaintyMap {
  instruction: string;
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
}

export interface CrearStepMeta {
  fase?: CrearFase;
  audio?: CrearAudioLine;
  input?: CrearInputMode;
  nextRefId?: string;
  classifier?: CrearClassifierDefinition;
  branchRules?: CrearBranchRule[];
  verdictOptions?: CrearVerdictOption[];
  stage?: CrearExperienceStage;
  scene?: CrearScene;
  display?: CrearDisplayCopy;
  evidence?: CrearEvidenceItem[];
  evidencePresentation?: CrearEvidencePresentation;
  responseParts?: CrearResponsePart[];
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

export interface CrearLessonOption {
  id: CrearLessonId;
  title: string;
  subtitle: string;
}

export interface ClassifyRequest {
  tallerId: CrearLessonId;
  pasoRefId: string;
  texto: string;
  partes?: CrearResponsePartAnswer[];
}

export interface ClassifyResponse {
  rama: string;
  confianza: number;
}

export interface CrearTelemetryResult extends Record<string, unknown> {
  fase: CrearFase;
  correcto: boolean;
  rama: string;
  texto?: string;
  score?: number;
  partes?: CrearResponsePartAnswer[];
  mapping?: Record<string, CrearResponseCategory>;
  assisted?: boolean;
  targetCategory?: CrearResponseCategory;
  attempt?: number;
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

export const ALL_CREAR_LESSON_IDS: readonly CrearLessonId[] = [
  DEFAULT_CREAR_LESSON_ID,
  'CREAR-VIDEOJUEGO',
  'CREAR-CANCION',
  'CREAR-REDES',
];

export const CREAR_LESSONS: CrearLessonOption[] = [
  {
    id: 'CREAR-VIDEOJUEGO',
    title: 'Videojuegos',
    subtitle: 'Por qué no puedes soltar tu videojuego',
  },
  {
    id: 'CREAR-CANCION',
    title: 'Canciones',
    subtitle: 'Por qué una canción se te queda pegada',
  },
  {
    id: 'CREAR-REDES',
    title: 'Redes',
    subtitle: 'Por qué pasas horas sin darte cuenta',
  },
];

export function isCrearLessonId(value: string): value is CrearLessonId {
  return ALL_CREAR_LESSON_IDS.some((lessonId) => lessonId === value);
}
