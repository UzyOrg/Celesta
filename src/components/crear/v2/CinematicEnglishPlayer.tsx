"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Check,
  Clock3,
  FileClock,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { getOrCreateSessionId } from '@/lib/session';
import { getAliasFromLocalStorage, setAliasInLocalStorage } from '@/lib/alias';
import { flushEventQueue, type TrackEventResult } from '@/lib/track';
import {
  loadWorkshopProgress,
  markWorkshopCompleted,
  saveWorkshopProgress,
} from '@/lib/workshopState';
import { loadCrearLesson } from '@/lib/crear/loadLesson';
import { classifyCrearLocally } from '@/lib/crear/localClassifier';
import { aggregateCrearConstructStates } from '@/lib/crear/constructState';
import { buildCrearLearningObservations } from '@/lib/crear/learningEvidence';
import { readModalForm, type CrearModalFormReading } from '@/lib/crear/modalForm';
import { seededShuffle } from '@/lib/crear/shuffle';
import {
  findBranch,
  getChoices,
  getCorrectChoiceId,
  getInputMode,
  getPlaceholder,
  getPrompt,
  getStepId,
  makeProgress,
  resolveNextRef,
} from '@/lib/crear/stepHelpers';
import {
  getOrCreateCrearStudyState,
  loadCrearStudyState,
  saveCrearStudyState,
  type CrearStudyState,
} from '@/lib/crear/studyState';
import {
  trackCrearAbandon,
  trackCrearAnswer,
  trackCrearComplete,
  trackCrearHint,
  trackCrearMarketSignal,
  trackCrearRetestScheduled,
  trackCrearStart,
  trackCrearStepComplete,
  type CrearMarketProbeMoment,
} from '@/lib/crear/telemetry';
import type {
  ClassifyResponse,
  CrearBaselineGate,
  CrearClassifierBranch,
  CrearClassifierSource,
  CrearCertaintyMapAttempt,
  CrearCertaintyMapSubmission,
  CrearCueFrame,
  CrearExperienceStage,
  CrearLearningObservation,
  CrearPaso,
  CrearPrecheckAttempt,
  CrearResponseCategory,
  CrearResponsePartAnswer,
  CrearWorkshop,
} from '@/lib/crear/types';
import { DEFAULT_CREAR_LESSON_ID } from '@/lib/crear/types';
import { CinematicAnswer } from './CinematicAnswer';
import { CinematicBaselineProduction } from './CinematicBaselineProduction';
import { CinematicCaseArtifact } from './CinematicCaseArtifact';
import {
  CinematicCertaintyMap,
  type CrearCertaintyMapPhase,
} from './CinematicCertaintyMap';
import { CinematicPrecheck } from './CinematicPrecheck';
import { CinematicVoice } from './CinematicVoice';
import { getLearningVisualMode, getScaffoldWithdrawMotion } from './sceneMotion';
import { useCinematicNarration } from './useCinematicNarration';
import styles from './CinematicEnglishPlayer.hallmark.module.css';

interface FeedbackState {
  title: string;
  body: string;
  actionLabel: string;
  retry: boolean;
  nextRefId: string | null;
  correct: boolean;
}

interface RetestAccessResponse {
  eligible: boolean;
  classToken: string;
  participantCode: string;
  studyId: string;
  lessonId: string;
  notBefore: number;
  expiresAt: number;
  serverNow?: number;
}

type RetestAuthorization =
  | { status: 'idle' | 'checking' }
  | { status: 'locked' | 'ready'; dueAt: number }
  | { status: 'retryable_error'; message: string }
  | { status: 'permanent_error'; reason: 'open_mode' | 'request'; message: string };

interface RetestErrorPayload {
  error?: unknown;
}

const RETEST_RETRY_DELAYS_MS = [250, 700, 1_600] as const;
const COMPLETION_RETRY_DELAYS_MS = [1_000, 3_000, 10_000, 30_000] as const;

class RetestRequestFailure extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly code?: string
  ) {
    super(message);
    this.name = 'RetestRequestFailure';
  }
}

function makeAbortError(): Error {
  const error = new Error('Retest request aborted');
  error.name = 'AbortError';
  return error;
}

function waitForRetestRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(makeAbortError());
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);
    function handleAbort() {
      window.clearTimeout(timer);
      reject(makeAbortError());
    }
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

function retestFailureMessage(code: string | undefined, issuing: boolean): string {
  if (code === 'day1_not_completed') {
    return 'Tu avance del día 1 todavía se está sincronizando.';
  }
  if (code === 'milestone_not_persisted') {
    return 'No pudimos guardar todavía el cierre del día 1.';
  }
  if (code === 'rate_limited') {
    return 'Hicimos varios intentos seguidos. Espera un momento y vuelve a intentarlo.';
  }
  if (code === 'expired') return 'Este enlace de revisión ya venció.';
  if (code === 'retest_window_expired') {
    return 'La ventana para hacer esta revisión ya terminó.';
  }
  if (
    code === 'invalid_signature' ||
    code === 'invalid_format' ||
    code === 'malformed' ||
    code === 'invalid_claims'
  ) {
    return 'Este enlace de revisión no es válido.';
  }
  if (code === 'invalid_request') {
    return 'No pudimos identificar este recorrido para programar la revisión.';
  }
  if (code === 'server_misconfigured') {
    return 'La revisión del día 7 no está disponible en este momento.';
  }
  return issuing
    ? 'No hubo conexión suficiente para programar la revisión.'
    : 'No hubo conexión suficiente para validar la revisión.';
}

async function failureFromRetestResponse(
  response: Response,
  issuing: boolean
): Promise<RetestRequestFailure> {
  let code: string | undefined;
  try {
    const payload = (await response.json()) as RetestErrorPayload;
    if (typeof payload.error === 'string') code = payload.error;
  } catch {
    // An empty or non-JSON error remains classifiable by HTTP status.
  }
  const retryable =
    code === 'day1_not_completed' ||
    code === 'milestone_lookup_failed' ||
    code === 'rate_limited' ||
    response.status === 408 ||
    response.status === 425 ||
    response.status === 429 ||
    (response.status >= 500 && code !== 'server_misconfigured');
  return new RetestRequestFailure(retestFailureMessage(code, issuing), retryable, code);
}

async function fetchRetestWithBackoff(
  request: () => Promise<Response>,
  signal: AbortSignal,
  issuing: boolean
): Promise<Response> {
  for (let attemptIndex = 0; ; attemptIndex += 1) {
    try {
      if (signal.aborted) throw makeAbortError();
      const response = await request();
      if (response.ok) return response;
      throw await failureFromRetestResponse(response, issuing);
    } catch (requestError) {
      if (signal.aborted || (requestError as Error).name === 'AbortError') {
        throw makeAbortError();
      }
      const failure = requestError instanceof RetestRequestFailure
        ? requestError
        : new RetestRequestFailure(retestFailureMessage(undefined, issuing), true);
      const delayMs = RETEST_RETRY_DELAYS_MS[attemptIndex];
      if (!failure.retryable || delayMs === undefined) throw failure;
      await waitForRetestRetry(delayMs, signal);
    }
  }
}

type MarketObjective = 'hablar' | 'entender' | 'escuela';

interface MarketProbeState {
  moment: CrearMarketProbeMoment;
  objective?: MarketObjective;
  reminderAccepted: boolean;
  pending: boolean;
  confirmed: boolean;
}

type ReceiptEvidenceStatus = 'independent' | 'supported' | 'review' | 'unknown';

function receiptEvidenceStatus(
  observation: CrearLearningObservation | undefined
): ReceiptEvidenceStatus {
  if (!observation || observation.observed === false) return 'unknown';
  if (!observation.correct) return 'review';
  return observation.assisted ? 'supported' : 'independent';
}

function receiptEvidenceLabel(
  status: ReceiptEvidenceStatus,
  missingLabel = 'no observada'
): string {
  if (status === 'independent') return 'registrada, sin ayuda';
  if (status === 'supported') return 'registrada, con apoyo';
  if (status === 'review') return 'por revisar';
  return missingLabel;
}

const MARKET_OBJECTIVES: ReadonlyArray<{ id: MarketObjective; label: string }> = [
  { id: 'hablar', label: 'Hablar con más seguridad' },
  { id: 'entender', label: 'Entender videos y conversaciones' },
  { id: 'escuela', label: 'Mejorar para tareas o exámenes' },
];

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

function isRetestStage(stage: CrearExperienceStage | undefined): boolean {
  return stage === 'recuerda';
}

const CERTAINTY_SCALE_IDS: readonly CrearResponseCategory[] = [
  'casi_seguro',
  'posible',
  'imposible',
];

/**
 * A step whose three options *are* the certainty scale. Those keep their
 * authored order — casi seguro, es posible, queda descartado is a scale, and
 * scrambling a scale taxes reading for no measurement gain. Everything else
 * (the contrast question, whose options are unrelated readings) is rotated per
 * learner so no answer can be found by position.
 */
function isCertaintyScaleStep(step: CrearPaso): boolean {
  const ids = getChoices(step).map((choice) => choice.id);
  return (
    ids.length === CERTAINTY_SCALE_IDS.length &&
    CERTAINTY_SCALE_IDS.every((id) => ids.includes(id))
  );
}

function buildBranchFeedback(
  step: CrearPaso,
  branch: CrearClassifierBranch | null,
  branchId: string,
  confidence: number,
  attemptNumber: number
): FeedbackState {
  const correct = branch?.correcto ?? false;
  const retry = Boolean(
    step.crear?.allowRetry &&
    !correct &&
    attemptNumber < (step.crear?.maxAttempts ?? 1)
  );
  const authored = branch?.feedback;

  return {
    title: authored?.title ?? (correct ? 'Tu respuesta coincide con las pistas' : 'Hay una parte por revisar'),
    body:
      authored?.body ??
      (correct
        ? 'Tu conclusión usa la fuerza que permiten las pistas.'
        : 'Revisa la evidencia y vuelve a ajustar la fuerza de tu conclusión.'),
    actionLabel: authored?.actionLabel ?? (retry ? 'Ajustar respuesta' : 'Continuar'),
    retry,
    nextRefId: resolveNextRef(step, { rama: branchId, confianza: confidence }),
    correct,
  };
}

function buildChoiceFeedback(
  step: CrearPaso,
  correct: boolean,
  attemptNumber: number
): FeedbackState {
  const retry = Boolean(
    step.crear?.allowRetry &&
    !correct &&
    attemptNumber < (step.crear?.maxAttempts ?? 1)
  );
  const branchId = correct ? 'correcto' : 'incorrecto';
  const body =
    step.tipo_paso === 'opcion_multiple'
      ? correct
        ? step.opcion_multiple.feedback_correcto
        : step.opcion_multiple.feedback_incorrecto
      : correct
        ? 'La evidencia y tu certeza coinciden.'
        : 'Vuelve a mirar qué permite afirmar la evidencia.';

  return {
    title: correct ? 'Bien hecho' : 'Probemos de nuevo',
    body,
    actionLabel: retry ? 'Probar otra vez' : 'Continuar',
    retry,
    nextRefId: resolveNextRef(step, { rama: branchId, confianza: 1 }),
    correct,
  };
}

/**
 * The override exists so a walkthrough can reach the retest without waiting
 * seven days. It must stay fail-closed: `Number('')` is `0`, so an env var
 * defined-but-empty in a deploy would silently collapse the D7 gate to zero
 * and make every retest look durable. Only a non-empty numeric value counts.
 */
function effectiveRetestDelayHours(step: CrearPaso): number | null {
  if (typeof step.crear?.retestDelayHours !== 'number') return null;
  const raw = process.env.NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS?.trim();
  if (!raw) return step.crear.retestDelayHours;
  const override = Number(raw);
  return Number.isFinite(override) && override >= 0 ? override : step.crear.retestDelayHours;
}

function getPrecheckItemStateKey(step: CrearPaso, itemId: string): string {
  return `${getStepId(step)}:${itemId}`;
}

/**
 * Answers only "where am I and how much is left", never "how well am I doing".
 * Position is spatial: no counters, no stage names, no score. The extent of the
 * session is visible from the first task so the transfer case arrives as an
 * anticipated step instead of an unannounced second round.
 */
function SessionProgress({ position, total }: { position: number; total: number }) {
  const safeTotal = Math.max(1, total);
  const safePosition = Math.min(Math.max(1, position), safeTotal);
  const ratio = safePosition / safeTotal;
  return (
    <div
      className={styles.sessionProgress}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={safeTotal}
      aria-valuenow={safePosition}
      aria-valuetext={`Paso ${safePosition} de ${safeTotal}`}
      aria-label="Avance de la sesión"
    >
      <span className={styles.sessionProgressTrack} aria-hidden="true">
        <span
          className={styles.sessionProgressFill}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </span>
    </div>
  );
}

interface EvidenceFieldProps {
  step: CrearPaso;
  onReadyToAnswer?: () => void;
}

function EvidenceField({ step, onReadyToAnswer }: EvidenceFieldProps) {
  const evidence = step.crear?.evidence ?? [];
  const presentation = step.crear?.evidencePresentation;
  if (evidence.length === 0) return null;

  if (presentation?.mode === 'sequential' || step.crear?.scene === 'arrival') {
    return <CaseMicroScene step={step} onReadyToAnswer={onReadyToAnswer} />;
  }

  return (
    <div className={styles.evidenceField} aria-label="Evidencia disponible">
      {evidence.map((item, index) => (
        <motion.article
          className={styles.evidenceCard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + index * 0.07, duration: 0.42 }}
          key={item.id}
        >
          <span className={styles.evidenceIndex}>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <small>{item.label}</small>
            <p lang="en-US">{item.value}</p>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

interface CaseMicroSceneProps {
  step: CrearPaso;
  onReadyToAnswer?: () => void;
}

function CaseMicroScene({ step, onReadyToAnswer }: CaseMicroSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const evidence = step.crear?.evidence ?? [];
  const presentation = step.crear?.evidencePresentation;
  const allowReview = presentation?.allowReview ?? true;
  const initialIndex = Math.max(
    0,
    presentation?.initialEvidenceId
      ? evidence.findIndex((item) => item.id === presentation.initialEvidenceId)
      : 0
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [revealedThrough, setRevealedThrough] = useState(initialIndex);
  const activeEvidence = evidence[activeIndex] ?? evidence[0];

  if (!activeEvidence) return null;

  function selectEvidence(nextIndex: number): void {
    if (nextIndex < 0 || nextIndex >= evidence.length) return;
    if (!allowReview && nextIndex < activeIndex) return;
    if (nextIndex > revealedThrough + 1) return;
    setActiveIndex(nextIndex);
    setRevealedThrough((current) => Math.max(current, nextIndex));
  }

  return (
    <section className={styles.caseMicroScene} aria-label="Explorador de evidencias">
      <p className={styles.caseProgress} aria-live="polite">
        Pista <strong>{activeIndex + 1}</strong> de {evidence.length}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          className={styles.caseSignal}
          key={activeEvidence.id}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
        >
          <span className={styles.signalIcon} aria-hidden="true"><FileClock size={19} /></span>
          <div>
            <small>{activeEvidence.label}</small>
            <p lang="en-US">{activeEvidence.value}</p>
          </div>
        </motion.article>
      </AnimatePresence>

      <div className={styles.caseSceneControls}>
        <button
          aria-label="Ver pista anterior"
          className={styles.caseNavAction}
          disabled={activeIndex === 0 || !allowReview}
          type="button"
          onClick={() => selectEvidence(activeIndex - 1)}
        >
          <ChevronLeft size={17} />
          <span>Anterior</span>
        </button>
        {activeIndex < evidence.length - 1 || onReadyToAnswer ? (
          <button
            aria-label={activeIndex < evidence.length - 1 ? 'Ver siguiente pista' : 'Responder el caso'}
            className={styles.caseNavAction}
            data-primary="true"
            type="button"
            onClick={() => {
              if (activeIndex < evidence.length - 1) {
                selectEvidence(activeIndex + 1);
                return;
              }
              onReadyToAnswer?.();
            }}
          >
            <span>{activeIndex < evidence.length - 1 ? 'Siguiente pista' : 'Responder'}</span>
            {activeIndex < evidence.length - 1 ? <ChevronRight size={17} /> : <ArrowLeft className={styles.forwardArrow} size={17} />}
          </button>
        ) : (
          <span className={styles.caseReviewComplete} role="status">Ya revisaste todas las pistas.</span>
        )}
      </div>
    </section>
  );
}

function ComparisonSentence({
  text,
  emphasis,
}: {
  text: string;
  emphasis?: string;
}) {
  const cleanEmphasis = emphasis?.trim();
  if (!cleanEmphasis) return <>{text}</>;

  const emphasisIndex = text.toLocaleLowerCase('en').indexOf(
    cleanEmphasis.toLocaleLowerCase('en')
  );
  if (emphasisIndex < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, emphasisIndex)}
      <mark className={styles.comparisonEmphasis}>
        {text.slice(emphasisIndex, emphasisIndex + cleanEmphasis.length)}
      </mark>
      {text.slice(emphasisIndex + cleanEmphasis.length)}
    </>
  );
}

function ComparisonField({
  step,
  audioControl,
}: {
  step: CrearPaso;
  audioControl?: ReactNode;
}) {
  const comparison = step.crear?.comparison;
  if (!comparison) return null;
  return (
    <div className={styles.comparisonField} aria-label="Comparación de dos frases">
      <article aria-label="Frase A">
        <div className={styles.comparisonLabelRow}>
          <small>{comparison.leftLabel ?? 'A'}</small>
        </div>
        <p lang="en-US">
          <ComparisonSentence text={comparison.left} />
        </p>
      </article>
      <article aria-label="Frase B">
        <div className={styles.comparisonLabelRow}>
          <small>{comparison.rightLabel ?? 'B'}</small>
          {audioControl}
        </div>
        <p lang="en-US">
          <ComparisonSentence
            text={comparison.right}
            emphasis={comparison.rightEmphasis}
          />
        </p>
      </article>
    </div>
  );
}

function ConceptPrism({ step }: { step: CrearPaso }) {
  const prefersReducedMotion = useReducedMotion();
  const concepts = step.crear?.concepts ?? [];
  const formula = step.crear?.formula ?? [];
  const [activeConceptId, setActiveConceptId] = useState(concepts[0]?.id ?? '');
  const activeConcept = concepts.find((concept) => concept.id === activeConceptId) ?? concepts[0];
  const activeExampleParts = (() => {
    if (!activeConcept) return null;
    const sentence = activeConcept.example.trim().replace(/[.!?]+$/, '');
    const marker = ` ${activeConcept.term.toLowerCase()} `;
    const markerIndex = sentence.toLowerCase().indexOf(marker);
    if (markerIndex < 0) return null;
    return {
      subject: sentence.slice(0, markerIndex),
      action: sentence.slice(markerIndex + marker.length),
    };
  })();

  if (concepts.length === 0 && formula.length === 0) return null;

  /**
   * Structure first, then the three forces. The rail segments one sentence into
   * its labelled parts and its middle slot swaps on every choice, so it teaches
   * the same rule the deleted paragraph stated — better, and only once. Putting
   * it last meant the good explanation arrived after the attention was spent.
   */
  return (
    <div className={styles.prismWrap}>
      {formula.length > 0 ? (
        <p
          className={styles.formulaRail}
          role="group"
          aria-label="Partes de una deducción sobre el pasado"
        >
          {formula.map((part, index) => (
            <span
              className={styles.formulaPart}
              data-slot={index === 1 ? 'force' : 'fixed'}
              key={`${part.value}-${part.label}`}
            >
              <b lang={part.lang}>
                {index === 0 && activeExampleParts
                  ? activeExampleParts.subject
                  : index === 1 && activeConcept
                    ? activeConcept.term.toLowerCase()
                    : index === 2 && activeExampleParts
                      ? activeExampleParts.action
                      : part.value}
              </b>
              <small>{part.label}</small>
            </span>
          ))}
        </p>
      ) : null}
      {concepts.length > 0 ? (
        <>
          <div className={styles.prismSelector} aria-label="Tres niveles de seguridad">
            {concepts.map((concept) => (
              <button
                aria-pressed={concept.id === activeConcept?.id}
                className={styles.prismOption}
                data-active={concept.id === activeConcept?.id ? 'true' : 'false'}
                key={concept.id}
                type="button"
                onClick={() => setActiveConceptId(concept.id)}
              >
                <span>{concept.meaning}</span>
                <strong lang="en-US">{concept.term}</strong>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {activeConcept ? (
              <motion.div
                className={styles.prismExample}
                key={activeConcept.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
                aria-live="polite"
              >
                <p className={styles.prismMeaning}>{activeConcept.description}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

interface AmbientFieldProps {
  paused: boolean;
}

function AmbientField({ paused }: AmbientFieldProps) {
  const videoLayerRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (paused) return;

    let animationFrame = 0;
    const syncLoopOpacity = () => {
      const layer = videoLayerRef.current;
      const video = videoRef.current;

      if (layer && video && Number.isFinite(video.duration) && video.duration > 0) {
        const fadeWindow = Math.min(1, video.duration / 2);
        const fadeIn = Math.min(1, video.currentTime / fadeWindow);
        const fadeOut = Math.min(1, (video.duration - video.currentTime) / fadeWindow);
        const opacity = Math.max(0, Math.min(fadeIn, fadeOut));

        layer.style.opacity = opacity.toFixed(3);
        layer.dataset.loopPhase = fadeIn < 1 ? 'fade-in' : fadeOut < 1 ? 'fade-out' : 'steady';
      }

      animationFrame = window.requestAnimationFrame(syncLoopOpacity);
    };

    animationFrame = window.requestAnimationFrame(syncLoopOpacity);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [paused]);

  return (
    <div className={styles.ambientField} aria-hidden="true">
      {paused ? (
        <span className={styles.waveFallback} />
      ) : (
        <span
          className={styles.waveVideoLayer}
          data-loop-phase="loading"
          ref={videoLayerRef}
        >
          <video
            className={styles.waveVideo}
            autoPlay
            disablePictureInPicture
            loop
            muted
            playsInline
            poster="/video/bg_waves-poster.png"
            preload="metadata"
            ref={videoRef}
            tabIndex={-1}
          >
            <source src="/video/bg_waves.mp4" type="video/mp4" />
          </video>
        </span>
      )}
      <span className={styles.ambientWash} />
      <span className={styles.dotField} />
    </div>
  );
}

export function CinematicEnglishPlayer() {
  const prefersReducedMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const structuredEvidenceRef = useRef<HTMLDivElement | null>(null);
  const structuredAnswerRef = useRef<HTMLDivElement | null>(null);
  const feedbackActionRef = useRef<HTMLButtonElement>(null);
  const guideCloseRef = useRef<HTMLButtonElement>(null);
  const exitContinueRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const completionReportedRef = useRef<string | null>(null);
  const completionNeedsRetryRef = useRef(false);
  const completionRetryAttemptRef = useRef(0);
  const completionRetryTimerRef = useRef<number | null>(null);
  const stepInteractiveAtRef = useRef<number | null>(null);
  const baselineAttemptStartedAtRef = useRef<number | null>(null);
  const retestRequestKeyRef = useRef<string | null>(null);
  const retestMilestoneQueuedRef = useRef<Promise<TrackEventResult> | null>(null);
  const retestAuthorizationRef = useRef<RetestAuthorization>({ status: 'idle' });
  const [lesson, setLesson] = useState<CrearWorkshop | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  /**
   * Resolved once at boot, from the entry link or from the study that already
   * remembers it. Every teacher-facing read of the event table filters on
   * `class_token`, so without it the rows are written and nothing in the
   * product can retrieve them. Optional on purpose: an open `/crear` still runs
   * and still records, it just records anonymously. See `docs/adr/0008`.
   */
  const [classToken, setClassToken] = useState<string | undefined>(undefined);
  const [study, setStudy] = useState<CrearStudyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completionRetryCycle, setCompletionRetryCycle] = useState(0);
  const [clientPreferencesReady, setClientPreferencesReady] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const scheduleCompletionReportRetry = useCallback((): void => {
    if (completionRetryTimerRef.current !== null) return;
    const retryIndex = Math.min(
      completionRetryAttemptRef.current,
      COMPLETION_RETRY_DELAYS_MS.length - 1
    );
    const delay = COMPLETION_RETRY_DELAYS_MS[retryIndex]!;
    completionRetryAttemptRef.current = Math.min(
      completionRetryAttemptRef.current + 1,
      COMPLETION_RETRY_DELAYS_MS.length - 1
    );
    completionRetryTimerRef.current = window.setTimeout(() => {
      completionRetryTimerRef.current = null;
      setCompletionRetryCycle((cycle) => cycle + 1);
    }, delay);
  }, []);
  /**
   * Steps whose guide the learner actually opened. `study.assistance` cannot
   * answer this: it also turns on for a retry or a translation, so using it
   * per clue marked clue 3 assisted because clue 1 was wrong.
   */
  const [guideUsedSteps, setGuideUsedSteps] = useState<Set<string>>(() => new Set());
  const [pageHidden, setPageHidden] = useState(false);
  const [liteMode, setLiteMode] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [retestAuthorization, setRetestAuthorization] = useState<RetestAuthorization>({
    status: 'idle',
  });
  const [retestRetryCycle, setRetestRetryCycle] = useState(0);
  const [marketProbe, setMarketProbe] = useState<MarketProbeState | null>(null);
  const [structuredView, setStructuredView] = useState<'explore' | 'answer'>('explore');
  const [certaintyPhase, setCertaintyPhase] = useState<CrearCertaintyMapPhase>('map');

  const commitRetestAuthorization = useCallback((next: RetestAuthorization): void => {
    retestAuthorizationRef.current = next;
    setRetestAuthorization(next);
  }, []);

  const retryRetestAuthorization = useCallback((): void => {
    retestRequestKeyRef.current = null;
    commitRetestAuthorization({ status: 'idle' });
    setRetestRetryCycle((current) => current + 1);
  }, [commitRetestAuthorization]);

  const currentStep = lesson?.pasos[currentIndex] ?? null;
  const currentStage = currentStep?.crear?.stage ?? 'descubre';
  const currentScene = currentStep?.crear?.scene ?? 'signal';
  const orderSeed = study?.studyId ?? '';
  const shownChoices = useMemo(() => {
    if (!currentStep) return [];
    const choices = getChoices(currentStep);
    if (choices.length < 2 || isCertaintyScaleStep(currentStep)) return choices;
    return seededShuffle(choices, `${orderSeed}:${getStepId(currentStep)}`);
  }, [currentStep, orderSeed]);
  const guideStep = lesson?.pasos.find((step) => step.crear?.scene === 'prism') ?? null;
  const guideUnlocked = Boolean(
    guideStep && lesson && currentIndex > lesson.pasos.indexOf(guideStep)
  );
  /**
   * Day 1 and the Day 7 retest are separate sittings, so progress is measured
   * inside the current sitting. Otherwise the Day 1 bar could never reach its
   * end and the student would leave without any sense of closure.
   */
  const sessionProgress = useMemo(() => {
    if (!lesson) return null;
    const inRetest = isRetestStage(currentStage);
    const sessionSteps = lesson.pasos.filter(
      (step) => isRetestStage(step.crear?.stage) === inRetest
    );
    if (sessionSteps.length === 0) return null;
    const position = sessionSteps.findIndex(
      (step) => currentStep && getStepId(step) === getStepId(currentStep)
    );
    if (position < 0) return null;
    return { position: position + 1, total: sessionSteps.length };
  }, [lesson, currentStep, currentStage]);
  const audioAssetsReady = Boolean(
    lesson && lesson.audio_asset_version === lesson.content_version
  );
  const audio = audioAssetsReady ? currentStep?.crear?.audio : undefined;
  const narration = useCinematicNarration({
    audio,
    sceneKey: currentStep ? getStepId(currentStep) : 'loading',
    pageHidden,
  });
  const pauseNarration = narration.pause;
  const hasStructuredEvidenceFlow = Boolean(
    (currentStep?.crear?.responseParts?.length || currentStep?.crear?.certaintyMap) &&
    currentStep.crear.evidencePresentation &&
    currentStep.crear.evidence?.length
  );
  const precheckAnswers = useMemo(() => {
    const precheck = currentStep?.crear?.precheck;
    if (!currentStep || !study || !precheck) return {};

    return precheck.items.reduce<Record<string, CrearResponseCategory>>((answers, item) => {
      const answer = study.latestOutcomes[
        getPrecheckItemStateKey(currentStep, item.id)
      ]?.mapping?.[item.id];
      if (answer && precheck.options.some((option) => option.id === answer)) {
        answers[item.id] = answer;
      }
      return answers;
    }, {});
  }, [currentStep, study]);
  const constructStates = useMemo(
    () => aggregateCrearConstructStates(study?.evidenceLedger ?? []),
    [study?.evidenceLedger]
  );

  useEffect(() => {
    const bootController = new AbortController();

    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const loaded = await loadCrearLesson(DEFAULT_CREAR_LESSON_ID);
        // React may intentionally start and discard an effect while verifying
        // hydration in development. Never let that abandoned boot commit state
        // or telemetry after its cleanup has fired.
        if (bootController.signal.aborted) return;
        /**
         * `?t=` matches the join link the rest of the product already uses;
         * `?token=` is accepted because that is what the teacher export calls
         * the same value. Both are trimmed to a sane length so a junk query
         * string cannot become a class token.
         */
        const params = new URLSearchParams(window.location.search);
        const hasExplicitToken = params.has('t') || params.has('token');
        const tokenParam = params.has('t') ? params.get('t') : params.get('token');
        const explicitToken = tokenParam?.trim();
        if (
          hasExplicitToken &&
          (!explicitToken || explicitToken.length > 64)
        ) {
          throw new Error('El enlace de acceso tiene un grupo inválido. Pide un enlace nuevo.');
        }
        const hasExplicitAlias = params.has('a') || params.has('alias');
        const aliasParam = params.has('a') ? params.get('a') : params.get('alias');
        const explicitAlias = aliasParam?.trim();
        if (
          hasExplicitAlias &&
          (!explicitAlias || explicitAlias.length > 64)
        ) {
          throw new Error('El enlace de acceso tiene un participante inválido. Pide un enlace nuevo.');
        }
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        // New links keep the signed bearer ticket in the fragment so it is not
        // sent in the initial HTTP request or ordinary referrer logs. Query
        // support remains for links already distributed before this change.
        const rawRetestTicket = (params.get('rt') ?? hashParams.get('rt') ?? '').trim();
        let ticketAccess: RetestAccessResponse | null = null;
        if (rawRetestTicket) {
          const response = await fetchRetestWithBackoff(
            () => fetch('/api/crear/retest', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticket: rawRetestTicket }),
              cache: 'no-store',
              signal: bootController.signal,
            }),
            bootController.signal,
            false
          );
          ticketAccess = (await response.json()) as RetestAccessResponse;
          if (ticketAccess.lessonId !== loaded.id_taller) {
            throw new Error('Este enlace corresponde a otra experiencia.');
          }
        }

        /**
         * Only a truly bare `/crear` resumes the stored identity. An explicit
         * cohort link is a new identity decision: without `a` it opens an
         * anonymous cohort study instead of exposing the previous learner on a
         * shared phone. A signed retest remains authoritative over both.
         */
        const priorStudy = loadCrearStudyState(DEFAULT_CREAR_LESSON_ID);
        const resumeStoredIdentity = !ticketAccess && !hasExplicitToken && !hasExplicitAlias;
        const token = ticketAccess?.classToken
          ?? (hasExplicitToken
            ? explicitToken
            : resumeStoredIdentity
              ? priorStudy?.classToken
              : undefined);
        setClassToken(token);
        // Keyed by token, so two classes on one device do not share a session.
        const sid = getOrCreateSessionId(token);

        /**
         * `?a=` names the learner. `class_token` says which cohort a row belongs
         * to; without an alias the rows are attributable to a group and to
         * nobody in particular, and `/crear` has no alias screen because the
         * day 1 action budget (ADR 0001) will not pay for one. Written before
         * the first event so `inicio_taller` is already attributed.
         *
         * localStorage is the whole integration: `trackEvent` reads it into
         * `student_alias`, and `/api/events/ingest` upserts the roster row the
         * teacher export joins on. Posting to `/api/roster/set-alias` from here
         * would only duplicate that, at the cost of a network call on boot.
         */
        if (ticketAccess) {
          setAliasInLocalStorage(token, ticketAccess.participantCode);
        } else if (hasExplicitAlias) {
          setAliasInLocalStorage(token, explicitAlias!);
        } else if (hasExplicitToken) {
          // `trackEvent` reads this cache directly. Clearing it is what keeps
          // an anonymous cohort link from reporting as the previous student.
          setAliasInLocalStorage(token, null);
        }
        const storedAlias = resumeStoredIdentity
          ? getAliasFromLocalStorage(token)?.trim()
          : undefined;
        const participantCode = ticketAccess?.participantCode
          ?? (hasExplicitAlias ? explicitAlias : undefined)
          ?? (storedAlias && storedAlias.length <= 64 ? storedAlias : undefined)
          ?? (resumeStoredIdentity ? priorStudy?.participantCode : undefined);
        if (resumeStoredIdentity && participantCode && !storedAlias) {
          // A bare return resumes the study identity, including the cache read
          // directly by telemetry and D7 authorization.
          setAliasInLocalStorage(token, participantCode);
        }

        let nextStudy = getOrCreateCrearStudyState(
          DEFAULT_CREAR_LESSON_ID,
          loaded.content_version ?? 'dev',
          token,
          participantCode
        );

        const retestStepIndex = loaded.pasos.findIndex(
          (step) => typeof step.crear?.retestDelayHours === 'number'
        );
        if (ticketAccess && retestStepIndex >= 0) {
          const sameStudy = nextStudy.studyId === ticketAccess.studyId;
          const recovered: CrearStudyState = sameStudy
            ? {
                ...nextStudy,
                classToken: ticketAccess.classToken,
                participantCode: ticketAccess.participantCode,
                retestTicket: rawRetestTicket,
                retestDueAt: ticketAccess.notBefore,
                phase: ticketAccess.eligible ? 'initial' : 'waiting_retest',
                stepIndex: retestStepIndex,
              }
            : {
                studyId: ticketAccess.studyId,
                lessonId: DEFAULT_CREAR_LESSON_ID,
                contentVersion: loaded.content_version ?? 'dev',
                classToken: ticketAccess.classToken,
                participantCode: ticketAccess.participantCode,
                startedAt: Date.now(),
                updatedAt: Date.now(),
                phase: ticketAccess.eligible ? 'initial' : 'waiting_retest',
                stepIndex: retestStepIndex,
                retestDueAt: ticketAccess.notBefore,
                retestTicket: rawRetestTicket,
                attempts: {},
                firstOutcomes: {},
                latestOutcomes: {},
                awaitingFeedback: {},
                assistance: {},
                evidenceLedger: [],
              };
          nextStudy = saveCrearStudyState(recovered);
          commitRetestAuthorization({
            status: ticketAccess.eligible ? 'ready' : 'locked',
            dueAt: ticketAccess.notBefore,
          });
        }

        const saved = loadWorkshopProgress(sid, loaded.id_taller);
        const savedMatchesStudy = Boolean(
          saved && saved.ultima_actualizacion >= nextStudy.startedAt
        );
        const candidateIndex = ticketAccess
          ? retestStepIndex
          : savedMatchesStudy
            ? Math.max(nextStudy.stepIndex, saved?.paso_actual ?? 0)
            : nextStudy.stepIndex;
        const safeIndex = candidateIndex >= 0 && candidateIndex < loaded.pasos.length ? candidateIndex : 0;
        const firstStep = loaded.pasos[safeIndex] ?? loaded.pasos[0];

        setLesson(loaded);
        setSessionId(sid);
        setStudy(nextStudy);
        setCurrentIndex(safeIndex);
        setCompleted(
          !ticketAccess &&
          (nextStudy.phase === 'completed' || (savedMatchesStudy && saved?.completado === true))
        );
        setAttempt(nextStudy.attempts[getStepId(firstStep)] ?? 0);

        const firstStepId = getStepId(firstStep);
        const pendingReceipt = nextStudy.latestOutcomes[firstStepId];
        if (
          nextStudy.phase !== 'completed' &&
          pendingReceipt &&
          nextStudy.awaitingFeedback[firstStepId] &&
          firstStep.crear?.revealFeedback !== false
        ) {
          const restoredFeedback = getInputMode(firstStep) === 'choice'
            ? buildChoiceFeedback(firstStep, pendingReceipt.correct, pendingReceipt.attempt)
            : buildBranchFeedback(
                firstStep,
                findBranch(firstStep, pendingReceipt.branch),
                pendingReceipt.branch,
                pendingReceipt.confidence ?? 0,
                pendingReceipt.attempt
              );
          setFeedback(restoredFeedback);
        }

        if (firstStep && nextStudy.phase === 'initial') {
          void trackCrearStart({
            classToken: token,
            tallerId: loaded.id_taller,
            pasoId: getStepId(firstStep),
            checksum: loaded.checksum,
            studyId: nextStudy.studyId,
          });
        }
      } catch (bootError) {
        if ((bootError as Error).name === 'AbortError') return;
        setError((bootError as Error).message || 'No pudimos abrir la experiencia.');
      } finally {
        if (!bootController.signal.aborted) setLoading(false);
      }
    }

    const nav = navigator as NavigatorWithConnection;
    setLiteMode(Boolean(nav.connection?.saveData));
    void boot();
    return () => bootController.abort();
  }, [commitRetestAuthorization]);

  useEffect(() => {
    // `useReducedMotion` is browser-owned. Gating it until after hydration keeps
    // the server and first client tree identical, then swaps to the still frame
    // before the background video has time to become instructional motion.
    setClientPreferencesReady(true);
  }, []);

  useEffect(() => {
    function handleVisibility() {
      setPageHidden(document.hidden);
      if (!document.hidden) setClockNow(Date.now());
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const dueAt = study?.retestDueAt;
    if (typeof dueAt !== 'number') return;

    const remaining = dueAt - Date.now();
    if (remaining <= 0) {
      setClockNow(Date.now());
      return;
    }

    const timer = window.setTimeout(() => setClockNow(Date.now()), remaining + 50);
    return () => window.clearTimeout(timer);
  }, [study?.retestDueAt]);

  useEffect(() => {
    if (!lesson || !study) return;
    const retestStep = lesson.pasos[study.stepIndex];
    // Authorize the whole delayed sitting, not only its first screen. A local
    // state edited to point at the production screen must not bypass D7.
    if (!isRetestStage(retestStep?.crear?.stage)) return;
    if (retestAuthorizationRef.current.status !== 'idle') return;
    const currentStudy = study;
    const currentLesson = lesson;

    const participantCode = currentStudy.participantCode
      ?? getAliasFromLocalStorage(classToken)
      ?? undefined;
    if (!classToken || !participantCode) {
      commitRetestAuthorization({
        status: 'permanent_error',
        reason: 'open_mode',
        message: 'Completaste el reto de hoy. Como entraste sin un enlace individual, este modo no guardó una fecha para volver.',
      });
      return;
    }

    const requestKey = `${currentStudy.studyId}:${currentStudy.retestTicket ?? 'issue'}:${retestRetryCycle}`;
    retestRequestKeyRef.current = requestKey;
    const controller = new AbortController();
    commitRetestAuthorization({ status: 'checking' });

    const retestBoundaryIndex = currentLesson.pasos.findIndex(
      (step) => effectiveRetestDelayHours(step) != null
    );
    const scheduledRetestStep = currentLesson.pasos[retestBoundaryIndex];
    const milestoneStep = currentLesson.pasos[Math.max(0, retestBoundaryIndex - 1)]
      ?? retestStep;
    const retestDelayHours = scheduledRetestStep
      ? effectiveRetestDelayHours(scheduledRetestStep) ?? 168
      : 168;

    async function ensureRetestMilestonePersisted(): Promise<void> {
      let result: TrackEventResult | null = null;
      try {
        result = await retestMilestoneQueuedRef.current;
      } catch {
        // Re-create the same deterministic event below.
      }

      if (!result || result.status === 'not_persisted') {
        const retry = trackCrearRetestScheduled({
          classToken,
          tallerId: currentLesson.id_taller,
          pasoId: getStepId(milestoneStep),
          checksum: currentLesson.checksum,
          studyId: currentStudy.studyId,
          retestDelayHours,
        });
        retestMilestoneQueuedRef.current = retry;
        try {
          result = await retry;
        } catch {
          result = null;
        }
      }

      if (!result || result.status === 'not_persisted') {
        throw new RetestRequestFailure(
          retestFailureMessage('milestone_not_persisted', true),
          true,
          'milestone_not_persisted'
        );
      }
    }

    async function authorizeRetest() {
      try {
        const issuing = !currentStudy.retestTicket;
        const response = await fetchRetestWithBackoff(async () => {
          if (currentStudy.retestTicket) {
            return fetch('/api/crear/retest', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticket: currentStudy.retestTicket }),
              cache: 'no-store',
              signal: controller.signal,
            });
          }

          // Never ask the server to issue a ticket until the day-1 milestone is
          // durable somewhere. On reload the in-memory promise is gone, so the
          // deterministic client id lets us safely reconstruct the same event.
          await ensureRetestMilestonePersisted();
          await flushEventQueue();
          return fetch('/api/crear/retest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classToken,
              participantCode,
              studyId: currentStudy.studyId,
              lessonId: currentLesson.id_taller,
            }),
            signal: controller.signal,
          });
        }, controller.signal, issuing);
        const payload = (await response.json()) as RetestAccessResponse & { ticket?: string };
        if (
          typeof payload.eligible !== 'boolean' ||
          !Number.isFinite(payload.notBefore) ||
          (payload.lessonId !== undefined && payload.lessonId !== currentLesson.id_taller)
        ) {
          throw new RetestRequestFailure('La respuesta de revisión no es válida.', false);
        }
        if (controller.signal.aborted || retestRequestKeyRef.current !== requestKey) return;
        if (payload.ticket) {
          persistStudy({ retestTicket: payload.ticket, retestDueAt: payload.notBefore });
        } else if (currentStudy.retestDueAt !== payload.notBefore) {
          persistStudy({ retestDueAt: payload.notBefore });
        }
        setClockNow(payload.serverNow ?? Date.now());
        commitRetestAuthorization({
          status: payload.eligible ? 'ready' : 'locked',
          dueAt: payload.notBefore,
        });
      } catch (authorizationError) {
        if (
          controller.signal.aborted ||
          (authorizationError as Error).name === 'AbortError' ||
          retestRequestKeyRef.current !== requestKey
        ) return;
        const failure = authorizationError instanceof RetestRequestFailure
          ? authorizationError
          : new RetestRequestFailure(retestFailureMessage(undefined, true), true);
        commitRetestAuthorization(failure.retryable
          ? { status: 'retryable_error', message: failure.message }
          : { status: 'permanent_error', reason: 'request', message: failure.message });
      }
    }

    void authorizeRetest();
    return () => {
      controller.abort();
      if (retestRequestKeyRef.current === requestKey) retestRequestKeyRef.current = null;
    };
  }, [
    classToken,
    commitRetestAuthorization,
    lesson,
    retestRetryCycle,
    study,
  ]);

  useEffect(() => {
    if (retestAuthorization.status !== 'locked') return;
    const remaining = retestAuthorization.dueAt - Date.now();
    const timer = window.setTimeout(() => {
      retryRetestAuthorization();
    }, Math.max(100, remaining + 50));
    return () => window.clearTimeout(timer);
  }, [retestAuthorization, retryRetestAuthorization]);

  useEffect(() => {
    function handleOnline(): void {
      if (retestAuthorizationRef.current.status === 'retryable_error') {
        retryRetestAuthorization();
      }
      if (completionNeedsRetryRef.current) {
        if (completionRetryTimerRef.current !== null) {
          window.clearTimeout(completionRetryTimerRef.current);
          completionRetryTimerRef.current = null;
        }
        setCompletionRetryCycle((cycle) => cycle + 1);
      }
    }
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (completionRetryTimerRef.current !== null) {
        window.clearTimeout(completionRetryTimerRef.current);
        completionRetryTimerRef.current = null;
      }
    };
  }, [retryRetestAuthorization]);

  useEffect(() => {
    if (!feedback && !exitConfirm && !guideOpen) return;

    pauseNarration();

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const targetRef = exitConfirm
      ? exitContinueRef
      : guideOpen
        ? guideCloseRef
        : feedbackActionRef;
    const frame = window.requestAnimationFrame(() => targetRef.current?.focus());

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && exitConfirm) {
        event.preventDefault();
        setExitConfirm(false);
        return;
      }
      if (event.key === 'Escape' && guideOpen) {
        event.preventDefault();
        setGuideOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = targetRef.current?.closest<HTMLElement>('[role="dialog"]');
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleDialogKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [exitConfirm, feedback, guideOpen, pauseNarration]);

  useEffect(() => {
    if (currentStep && !feedback) {
      stepInteractiveAtRef.current = Date.now();
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.setTimeout(
        () => headingRef.current?.focus({ preventScroll: true }),
        prefersReducedMotion ? 0 : 280
      );
    }
  }, [currentStep, feedback, prefersReducedMotion]);

  /**
   * Emits the completion event once the study state has settled, so the
   * projection sees the day 7 observation that `completeLesson` cannot.
   *
   * Guarded two ways: `study.completionReported` is persisted to localStorage
   * only after the event is durably queued or accepted by the server,
   * so a returning learner reopening an already-finished study — which boots
   * straight into `phase: 'completed'` — does not re-emit the event on every
   * page load. `completionReportedRef` is the synchronous companion for the
   * same tick: `persistStudy` below is a state update, not an immediate write,
   * so a second effect invocation before it commits (StrictMode's double call
   * in dev) would otherwise still see `completionReported` as unset.
   */
  useEffect(() => {
    if (!lesson || !study || study.phase !== 'completed' || study.completionReported) return;
    const reportKey = `${study.studyId}:${study.contentVersion}`;
    if (completionReportedRef.current === reportKey) return;
    completionReportedRef.current = reportKey;
    completionNeedsRetryRef.current = false;
    void trackCrearComplete({
      classToken,
      tallerId: lesson.id_taller,
      pasoId: getStepId(lesson.pasos[study.stepIndex] ?? lesson.pasos[lesson.pasos.length - 1]!),
      checksum: lesson.checksum,
      studyId: study.studyId,
      retestDueAt: study.retestDueAt,
      constructStates: aggregateCrearConstructStates(study.evidenceLedger),
    }).then((result) => {
      if (result.status === 'queued' || result.status === 'sent') {
        completionNeedsRetryRef.current = false;
        completionRetryAttemptRef.current = 0;
        if (completionRetryTimerRef.current !== null) {
          window.clearTimeout(completionRetryTimerRef.current);
          completionRetryTimerRef.current = null;
        }
        persistStudy({ completionReported: true });
        return;
      }
      completionReportedRef.current = null;
      completionNeedsRetryRef.current = true;
      scheduleCompletionReportRetry();
    }).catch(() => {
      completionReportedRef.current = null;
      completionNeedsRetryRef.current = true;
      scheduleCompletionReportRetry();
    });
  }, [classToken, completionRetryCycle, lesson, scheduleCompletionReportRetry, study]);

  function getStepLatencyMs(): number | undefined {
    if (stepInteractiveAtRef.current === null) return undefined;
    return Math.max(0, Date.now() - stepInteractiveAtRef.current);
  }

  const retestGateActive = useMemo(() => {
    if (!currentStep || !study || !isRetestStage(currentStage)) return false;
    return retestAuthorization.status !== 'ready';
  }, [currentStep, currentStage, retestAuthorization.status, study]);

  const ambientPaused = clientPreferencesReady
    && (Boolean(prefersReducedMotion) || liteMode || pageHidden);

  function persistProgress(nextIndex: number, isComplete: boolean) {
    if (!lesson || !sessionId) return;
    saveWorkshopProgress(makeProgress(lesson, sessionId, nextIndex, isComplete));
  }

  function persistStudy(updates: Partial<CrearStudyState>): void {
    setStudy((current) => {
      if (!current) return current;
      return saveCrearStudyState({ ...current, ...updates });
    });
  }

  function persistAttempt(
    step: CrearPaso,
    branch: string,
    correct: boolean,
    score: number,
    text: string,
    attemptNumber: number,
    confidence: number,
    parts?: CrearResponsePartAnswer[],
    details?: {
      mapping?: Record<string, CrearResponseCategory>;
      assisted?: boolean;
      targetCategory?: CrearResponseCategory;
      statementId?: string;
      stateKey?: string;
      cueFrame?: CrearCueFrame;
      /**
       * What the ledger records, when it is not what the learner was told.
       * The branch decides the feedback; the construct decides the evidence.
       * On a production step they diverge exactly when the form is sound and
       * the certainty is not.
       */
      evidenceCorrect?: boolean;
      /** A presented-but-omitted baseline is unknown, not an error. */
      evidenceObserved?: boolean;
    }
  ): void {
    const stepId = getStepId(step);
    const stateKey = details?.stateKey ?? stepId;
    setStudy((current) => {
      if (!current) return current;
      const outcome = {
        branch,
        correct,
        score,
        text,
        ...(parts && parts.length > 0 ? { parts } : {}),
        ...(details?.mapping ? { mapping: details.mapping } : {}),
        ...(typeof details?.assisted === 'boolean' ? { assisted: details.assisted } : {}),
        ...(details?.targetCategory ? { targetCategory: details.targetCategory } : {}),
        attempt: attemptNumber,
        confidence,
        submittedAt: Date.now(),
      };
      const learningObservations = buildCrearLearningObservations({
        stepId,
        opportunity: step.crear?.learningOpportunity,
        branch,
        correct: details?.evidenceCorrect ?? correct,
        observed: details?.evidenceObserved,
        assisted: details?.assisted ?? Boolean(current.assistance[stepId]),
        attempt: attemptNumber,
        statementId: details?.statementId,
        cueFrame: details?.cueFrame,
      });
      return saveCrearStudyState({
        ...current,
        attempts: { ...current.attempts, [stateKey]: attemptNumber },
        firstOutcomes: current.firstOutcomes[stateKey]
          ? current.firstOutcomes
          : { ...current.firstOutcomes, [stateKey]: outcome },
        latestOutcomes: { ...current.latestOutcomes, [stateKey]: outcome },
        awaitingFeedback: {
          ...current.awaitingFeedback,
          [stateKey]: step.crear?.revealFeedback !== false,
        },
        evidenceLedger: [...current.evidenceLedger, ...learningObservations],
      });
    });
  }

  function persistLearningEvidence(
    step: CrearPaso,
    branch: string,
    correct: boolean,
    assisted: boolean,
    attemptNumber: number,
    statementId?: string,
    cueFrame?: CrearCueFrame
  ): void {
    const stepId = getStepId(step);
    setStudy((current) => {
      if (!current) return current;
      const observations = buildCrearLearningObservations({
        stepId,
        opportunity: step.crear?.learningOpportunity,
        branch,
        correct,
        assisted,
        attempt: attemptNumber,
        statementId,
        cueFrame,
      });
      if (observations.length === 0) return current;
      return saveCrearStudyState({
        ...current,
        evidenceLedger: [...current.evidenceLedger, ...observations],
      });
    });
  }

  /**
   * The completion event is emitted by the effect above, not from here, so the
   * projection is always computed from a settled ledger.
   *
   * In lesson 1.17.0 reporting from here would also work: the last measured
   * step reveals feedback, so `advance` runs a tick after `persistAttempt`.
   * That is a property of the authored JSON, not of this code — the day it is
   * authored with `revealFeedback: false`, `advance` would run in the same tick
   * and the final observation would be missing from every projection, silently.
   * The effect makes that unauthorable rather than merely unlikely.
   */
  function completeLesson() {
    if (!lesson || !sessionId || !study) return;
    persistProgress(currentIndex, true);
    markWorkshopCompleted(sessionId, lesson.id_taller);
    persistStudy({ phase: 'completed', stepIndex: currentIndex });
    setCompleted(true);
  }

  function advance(step: CrearPaso, nextRefId: string | null) {
    if (!lesson || !study) return;

    const nextIndex =
      nextRefId != null
        ? lesson.pasos.findIndex((candidate) => candidate.ref_id === nextRefId)
        : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= lesson.pasos.length) {
      void trackCrearStepComplete({
        classToken,
        tallerId: lesson.id_taller,
        pasoId: getStepId(step),
        checksum: lesson.checksum,
        studyId: study.studyId,
      });
      completeLesson();
      return;
    }

    const nextStep = lesson.pasos[nextIndex];
    narration.prepareTransition({
      audio: audioAssetsReady ? nextStep.crear?.audio : undefined,
      sceneKey: getStepId(nextStep),
      transitionMs: 0,
    });
    const delayHours = effectiveRetestDelayHours(nextStep);
    if (delayHours != null && study.phase === 'initial') {
      const milestoneQueued = trackCrearRetestScheduled({
        classToken,
        tallerId: lesson.id_taller,
        pasoId: getStepId(step),
        checksum: lesson.checksum,
        studyId: study.studyId,
        retestDelayHours: delayHours,
      });
      retestMilestoneQueuedRef.current = milestoneQueued;
      // The authorization effect awaits this exact write before flushing. The
      // catch prevents a rejected background promise from becoming unhandled;
      // the awaiting effect still receives the rejection and fails closed.
      void milestoneQueued.catch(() => undefined);
    } else {
      void trackCrearStepComplete({
        classToken,
        tallerId: lesson.id_taller,
        pasoId: getStepId(step),
        checksum: lesson.checksum,
        studyId: study.studyId,
      });
    }
    const nextStudy: Partial<CrearStudyState> = {
      stepIndex: nextIndex,
      awaitingFeedback: {
        ...study.awaitingFeedback,
        [getStepId(step)]: false,
      },
    };
    if (delayHours != null && study.phase === 'initial') {
      nextStudy.phase = 'waiting_retest';
    }

    persistProgress(nextIndex, false);
    persistStudy(nextStudy);
    setFeedback(null);
    setAttempt(0);
    setInputFocused(false);
    setStructuredView('explore');
    setCertaintyPhase('map');
    setGuideOpen(false);
    setCurrentIndex(nextIndex);
  }

  function showStructuredAnswer(): void {
    setStructuredView('answer');
    window.requestAnimationFrame(() => {
      structuredAnswerRef.current
        ?.querySelector<HTMLTextAreaElement>('textarea')
        ?.focus({ preventScroll: true });
    });
  }

  function showStructuredEvidence(): void {
    setStructuredView('explore');
    window.requestAnimationFrame(() => structuredEvidenceRef.current?.focus({ preventScroll: true }));
  }

  async function classifyText(
    step: CrearPaso,
    text: string,
    parts?: CrearResponsePartAnswer[]
  ): Promise<ClassifyResponse> {
    const classifier = step.crear?.classifier;
    if (!classifier) return { rama: 'no_claro', confianza: 0 };

    const controller = new AbortController();
    /**
     * School wifi is slow, and the visible cost of waiting is a spinner the
     * learner already sees. The invisible cost of aborting early is silently
     * downgrading every answer to keyword matching, which is exactly the data
     * this lesson cannot afford to lose.
     */
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tallerId: DEFAULT_CREAR_LESSON_ID,
          pasoRefId: getStepId(step),
          texto: text,
          partes: parts,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`classifier_${response.status}`);
      return (await response.json()) as ClassifyResponse;
    } catch {
      return { ...classifyCrearLocally(text, classifier, parts), source: 'local_offline' };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function queueAnswerTelemetry(
    step: CrearPaso,
    branch: string,
    correct: boolean,
    score: number,
    text: string,
    attemptNumber: number,
    parts?: CrearResponsePartAnswer[],
    details?: {
      mapping?: Record<string, CrearResponseCategory>;
      assisted?: boolean;
      targetCategory?: CrearResponseCategory;
      statementId?: string;
      latencyMs?: number;
      classifierSource?: CrearClassifierSource;
      classifierAgreed?: boolean;
      baselineGate?: CrearBaselineGate;
      observed?: boolean;
      cueFrame?: CrearCueFrame;
      shownOrder?: string[];
      form?: CrearModalFormReading;
      certaintyConsistent?: boolean;
    }
  ) {
    if (!lesson || !study) return;
    const opportunity = step.crear?.learningOpportunity;
    void trackCrearAnswer({
      classToken,
      tallerId: lesson.id_taller,
      pasoId: getStepId(step),
      fase: step.crear?.fase ?? 'practica',
      correcto: correct,
      rama: branch,
      texto: text,
      partes: parts,
      mapping: details?.mapping,
      assisted: details?.assisted,
      targetCategory: details?.targetCategory,
      statementId: details?.statementId,
      latencyMs: details?.latencyMs,
      classifierSource: details?.classifierSource,
      classifierAgreed: details?.classifierAgreed,
      baselineGate: details?.baselineGate,
      observed: details?.observed,
      shownOrder: details?.shownOrder,
      expressedCategory: details?.form?.expressedCategory,
      formWellFormed: details?.form?.wellFormed,
      subjectPresent: details?.form?.subjectPresent,
      certaintyConsistent: details?.certaintyConsistent,
      score,
      attempt: attemptNumber,
      studyId: study.studyId,
      checksum: lesson.checksum,
      // The per-item frame wins over the step-level one on multi-clue steps.
      learningOpportunity: opportunity && details?.cueFrame
        ? { ...opportunity, cueFrame: details.cueFrame }
        : opportunity,
    });
  }

  /**
   * Reads a production attempt as the two constructs it actually contains.
   *
   * `formCorrect` is the `modal + have + participle` structure plus the right
   * person — nothing about whether the certainty was the one the evidence
   * supported. `certaintyConsistent` compares the written modal against the
   * decision the learner made one screen earlier, which is a different
   * question from whether that decision was right: a learner can be perfectly
   * consistent with a mis-calibrated judgement, and those two findings must
   * stay apart.
   */
  function readProductionEvidence(
    step: CrearPaso,
    text: string
  ): { form: CrearModalFormReading; formCorrect: boolean; certaintyConsistent?: boolean } | null {
    const target = step.crear?.productionTarget;
    if (!target) return null;
    const form = readModalForm(text, target);
    const chosen = certaintyChoiceBefore(step);
    return {
      form,
      formCorrect: form.wellFormed && form.subjectPresent,
      ...(chosen && form.expressedCategory
        ? { certaintyConsistent: form.expressedCategory === chosen }
        : {}),
    };
  }

  /**
   * The certainty the learner selected on the step that leads into this one.
   * Read from the stored mapping rather than the answer label, so a copy edit
   * cannot silently turn consistency into `undefined`.
   */
  function certaintyChoiceBefore(step: CrearPaso): CrearResponseCategory | null {
    if (!lesson || !study) return null;
    const refId = getStepId(step);
    const previous = lesson.pasos.find((candidate) => candidate.crear?.nextRefId === refId);
    if (!previous) return null;
    const previousId = getStepId(previous);
    const chosen = study.latestOutcomes[previousId]?.mapping?.[previousId];
    return chosen === 'casi_seguro' || chosen === 'posible' || chosen === 'imposible'
      ? chosen
      : null;
  }

  function showFeedbackForBranch(
    step: CrearPaso,
    branch: CrearClassifierBranch | null,
    branchId: string,
    confidence: number,
    attemptNumber: number
  ) {
    const correct = branch?.correcto ?? false;
    const score = branch?.score ?? 0;

    setFeedback(buildBranchFeedback(step, branch, branchId, confidence, attemptNumber));
  }

  async function handleSubmitText(text: string, parts?: CrearResponsePartAnswer[]) {
    if (!currentStep || !lesson || !study) return;
    setPending(true);
    const attemptNumber = attempt + 1;
    setAttempt(attemptNumber);
    const latencyMs = getStepLatencyMs();

    try {
      const classification = await classifyText(currentStep, text, parts);
      const branch = findBranch(currentStep, classification.rama);
      const correct = branch?.correcto ?? false;
      const score = branch?.score ?? 0;
      const assisted = Boolean(study.assistance[getStepId(currentStep)]);
      /**
       * Two readings of one sentence. The branch is what the learner is told;
       * the structural reading is what the ledger records. They part ways on
       * `misconcepcion_certeza`: a flawless `modal + have + participle` that
       * carries the wrong certainty is a calibration error, not a form error,
       * and scoring `modal_form` from the branch marked the form wrong.
       */
      const evidence = readProductionEvidence(currentStep, text);
      persistAttempt(
        currentStep,
        classification.rama,
        correct,
        score,
        text,
        attemptNumber,
        classification.confianza,
        parts,
        {
          assisted,
          ...(evidence ? { evidenceCorrect: evidence.formCorrect } : {}),
        }
      );
      queueAnswerTelemetry(
        currentStep,
        classification.rama,
        correct,
        score,
        text,
        attemptNumber,
        parts,
        {
          assisted,
          latencyMs,
          classifierSource: classification.source,
          classifierAgreed: classification.agreed,
          ...(evidence
            ? { form: evidence.form, certaintyConsistent: evidence.certaintyConsistent }
            : {}),
        }
      );

      if (branch?.pista) {
        void trackCrearHint({
          classToken,
          tallerId: lesson.id_taller,
          pasoId: getStepId(currentStep),
          rama: classification.rama,
          checksum: lesson.checksum,
          studyId: study.studyId,
        });
      }

      if (currentStep.crear?.revealFeedback === false) {
        advance(currentStep, resolveNextRef(currentStep, classification));
        return;
      }

      showFeedbackForBranch(currentStep, branch, classification.rama, classification.confianza, attemptNumber);
    } finally {
      setPending(false);
    }
  }

  function handleSubmitChoice(choiceId: string) {
    if (!currentStep || !lesson || !study) return;
    const attemptNumber = attempt + 1;
    setAttempt(attemptNumber);
    const latencyMs = getStepLatencyMs();
    const correct = getCorrectChoiceId(currentStep) === choiceId;
    const choice = getChoices(currentStep).find((item) => item.id === choiceId);
    const branchId = correct ? 'correcto' : 'incorrecto';
    const score = correct ? 1 : 0;
    const answerText = choice?.texto ?? choiceId;
    const assisted = Boolean(study.assistance[getStepId(currentStep)]);
    /**
     * The chosen category is stored by id, not by label. The production step
     * that follows compares its written modal against this decision, and a
     * copy edit must not be able to break that link.
     */
    const mapping = isCertaintyScaleStep(currentStep)
      ? { [getStepId(currentStep)]: choiceId as CrearResponseCategory }
      : undefined;
    persistAttempt(
      currentStep,
      branchId,
      correct,
      score,
      answerText,
      attemptNumber,
      1,
      undefined,
      { assisted, ...(mapping ? { mapping } : {}) }
    );
    queueAnswerTelemetry(
      currentStep,
      branchId,
      correct,
      score,
      answerText,
      attemptNumber,
      undefined,
      {
        assisted,
        latencyMs,
        ...(mapping ? { mapping } : {}),
        shownOrder: shownChoices.map((item) => item.id),
        ...(currentStep.crear?.learningOpportunity?.cueFrame
          ? { cueFrame: currentStep.crear.learningOpportunity.cueFrame }
          : {}),
      }
    );

    const retry = Boolean(
      currentStep.crear?.allowRetry &&
      !correct &&
      attemptNumber < (currentStep.crear?.maxAttempts ?? 1)
    );

    if (retry) {
      void trackCrearHint({
        classToken,
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        rama: branchId,
        checksum: lesson.checksum,
        studyId: study.studyId,
      });
    }
    if (currentStep.crear?.revealFeedback === false) {
      advance(currentStep, resolveNextRef(currentStep, { rama: branchId, confianza: 1 }));
      return;
    }
    setFeedback(buildChoiceFeedback(currentStep, correct, attemptNumber));
  }

  function handleMapItemAttempt(mapAttempt: CrearCertaintyMapAttempt): void {
    if (!currentStep) return;
    persistLearningEvidence(
      currentStep,
      mapAttempt.correct ? 'map_item_correcto' : 'map_item_incorrecto',
      mapAttempt.correct,
      mapAttempt.assisted,
      mapAttempt.attempt,
      mapAttempt.statementId,
      mapAttempt.cueFrame
    );
    queueAnswerTelemetry(
      currentStep,
      mapAttempt.correct ? 'map_item_correcto' : 'map_item_incorrecto',
      mapAttempt.correct,
      mapAttempt.correct ? 1 : 0,
      `${mapAttempt.statementId}:${mapAttempt.category}`,
      mapAttempt.attempt,
      undefined,
      {
        mapping: mapAttempt.assignments,
        assisted: mapAttempt.assisted,
        statementId: mapAttempt.statementId,
        latencyMs: mapAttempt.latencyMs,
        cueFrame: mapAttempt.cueFrame,
        shownOrder: mapAttempt.shownOrder,
      }
    );
  }

  function handlePrecheckAttempt(precheckAttempt: CrearPrecheckAttempt): void {
    if (!currentStep || !lesson || !study || !currentStep.crear?.precheck) return;
    const choice = currentStep.crear.precheck.options.find(
      (option) => option.id === precheckAttempt.category
    );
    const stateKey = getPrecheckItemStateKey(currentStep, precheckAttempt.itemId);
    const attemptNumber = (study.attempts[stateKey] ?? 0) + 1;
    const branch = precheckAttempt.correct ? 'precheck_correcto' : 'precheck_incorrecto';
    const score = precheckAttempt.correct ? 1 : 0;
    const answerText = choice?.label ?? precheckAttempt.category;
    const mapping = { [precheckAttempt.itemId]: precheckAttempt.category };

    persistAttempt(
      currentStep,
      branch,
      precheckAttempt.correct,
      score,
      answerText,
      attemptNumber,
      1,
      undefined,
      {
        mapping,
        assisted: false,
        statementId: precheckAttempt.itemId,
        stateKey,
        cueFrame: precheckAttempt.cueFrame,
      }
    );
    queueAnswerTelemetry(
      currentStep,
      branch,
      precheckAttempt.correct,
      score,
      answerText,
      attemptNumber,
      undefined,
      {
        mapping,
        assisted: false,
        statementId: precheckAttempt.itemId,
        latencyMs: precheckAttempt.latencyMs,
        cueFrame: precheckAttempt.cueFrame,
        shownOrder: precheckAttempt.shownOrder,
      }
    );
  }

  function handlePrecheckComplete(): void {
    if (!currentStep) return;
    advance(currentStep, currentStep.crear?.nextRefId ?? null);
  }

  /**
   * The self-efficacy gate has no right answer, so both branches report
   * `correcto: false` and the signal lives in `rama`. It stays out of the
   * evidence ledger: believing you can write a sentence is not evidence that
   * you can.
   */
  function handleBaselineGate(answer: CrearBaselineGate): void {
    if (!currentStep) return;
    queueAnswerTelemetry(
      currentStep,
      answer === 'yes' ? 'baseline_gate_yes' : 'baseline_gate_no',
      false,
      0,
      answer === 'yes'
        ? currentStep.crear?.baselineProduction?.gateYesLabel ?? 'Sí'
        : currentStep.crear?.baselineProduction?.gateNoLabel ?? 'Todavía no',
      1,
      undefined,
      { assisted: false, latencyMs: getStepLatencyMs() }
    );
    /**
     * The attempt clock starts when the field first appears and never restarts.
     * Changing the gate answer is encouraged — it is a second recorded event —
     * and restarting the clock there meant a learner who typed for forty
     * seconds and then moved to "todavía no" was logged as having spent two.
     */
    if (baselineAttemptStartedAtRef.current === null) {
      baselineAttemptStartedAtRef.current = Date.now();
    }
  }

  function handleBaselineSubmit(
    text: string,
    gate: CrearBaselineGate,
    skipped: boolean
  ): void {
    if (!currentStep) return;
    const attemptNumber = 1;
    const branch = skipped ? 'baseline_produccion_omitida' : 'baseline_produccion';
    const latencyMs = baselineAttemptStartedAtRef.current === null
      ? getStepLatencyMs()
      : Math.max(0, Date.now() - baselineAttemptStartedAtRef.current);
    /**
     * The baseline runs no classifier — it must not teach — but it still gets
     * the structural reading, because otherwise the pre-measure for `modal_form`
     * is a string nobody has scored and the whole before/after comparison waits
     * on hand labelling.
     */
    const evidence = skipped ? null : readProductionEvidence(currentStep, text);

    persistAttempt(
      currentStep,
      branch,
      false,
      0,
      text,
      attemptNumber,
      0,
      undefined,
      {
        assisted: false,
        evidenceCorrect: evidence ? evidence.formCorrect : false,
        evidenceObserved: !skipped,
      }
    );
    queueAnswerTelemetry(
      currentStep,
      branch,
      false,
      0,
      text,
      attemptNumber,
      undefined,
      {
        assisted: false,
        latencyMs,
        baselineGate: gate,
        observed: !skipped,
        ...(evidence ? { form: evidence.form } : {}),
      }
    );
    advance(currentStep, currentStep.crear?.nextRefId ?? null);
  }

  async function handleSubmitMap(submission: CrearCertaintyMapSubmission) {
    if (!currentStep || !lesson || !study || !currentStep.crear?.certaintyMap) return;
    setPending(true);
    const attemptNumber = attempt + 1;
    setAttempt(attemptNumber);
    const targetCategory = currentStep.crear.certaintyMap.production?.category;
    const answerText = submission.productionText?.trim()
      || JSON.stringify(submission.assignments);

    try {
      const classification: ClassifyResponse = submission.productionText
        ? await classifyText(currentStep, submission.productionText)
        : { rama: submission.assisted ? 'mapa_asistido' : 'mapa_independiente', confianza: 1 };
      const branch = submission.productionText
        ? findBranch(currentStep, classification.rama)
        : null;
      const correct = submission.productionText ? branch?.correcto ?? false : true;
      const score = submission.productionText
        ? branch?.score ?? 0
        : submission.assisted ? 0.75 : 1;
      const details = {
        mapping: submission.assignments,
        assisted: submission.assisted,
        ...(targetCategory ? { targetCategory } : {}),
        ...(typeof submission.latencyMs === 'number'
          ? { latencyMs: submission.latencyMs }
          : {}),
        ...(classification.source ? { classifierSource: classification.source } : {}),
        ...(typeof classification.agreed === 'boolean'
          ? { classifierAgreed: classification.agreed }
          : {}),
      };

      persistAttempt(
        currentStep,
        classification.rama,
        correct,
        score,
        answerText,
        attemptNumber,
        classification.confianza,
        undefined,
        details
      );
      queueAnswerTelemetry(
        currentStep,
        classification.rama,
        correct,
        score,
        answerText,
        attemptNumber,
        undefined,
        details
      );

      if (submission.productionText) {
        if (!correct) {
          markAssistance('answer_retry');
        }
        setFeedback(buildBranchFeedback(
          currentStep,
          branch,
          classification.rama,
          classification.confianza,
          attemptNumber
        ));
        return;
      }

      if (currentStep.crear.revealFeedback === false) {
        advance(currentStep, currentStep.crear.nextRefId ?? null);
        return;
      }

      setFeedback({
        title: currentStep.crear.certaintyMap.successTitle,
        body: currentStep.crear.certaintyMap.successBody,
        actionLabel: 'Continuar',
        retry: false,
        nextRefId: currentStep.crear.nextRefId ?? null,
        correct: true,
      });
    } finally {
      setPending(false);
    }
  }

  function markAssistance(
    reason: 'guide_opened' | 'map_retry' | 'answer_retry' | 'translation_opened',
    statementId?: string
  ): void {
    if (!currentStep || !lesson || !study) return;
    const stepId = getStepId(currentStep);
    if (!study.assistance[stepId]) {
      persistStudy({
        assistance: { ...study.assistance, [stepId]: true },
      });
    }
    void trackCrearHint({
      classToken,
      tallerId: lesson.id_taller,
      pasoId: stepId,
      rama: reason,
      statementId,
      learningOpportunityId: currentStep.crear?.learningOpportunity?.id,
      checksum: lesson.checksum,
      studyId: study.studyId,
    });
  }

  function openGuide(): void {
    if (currentStep) {
      const stepId = getStepId(currentStep);
      setGuideUsedSteps((current) =>
        current.has(stepId) ? current : new Set(current).add(stepId)
      );
    }
    markAssistance('guide_opened');
    setGuideOpen(true);
  }

  function handleContinue() {
    if (!currentStep) return;
    advance(currentStep, currentStep.crear?.nextRefId ?? null);
  }

  function handleFeedbackAction() {
    if (!currentStep || !feedback) return;
    if (feedback.retry) {
      persistStudy({
        awaitingFeedback: {
          ...study?.awaitingFeedback,
          [getStepId(currentStep)]: false,
        },
      });
      setFeedback(null);
      return;
    }
    advance(currentStep, feedback.nextRefId);
  }

  async function confirmExit() {
    if (lesson && currentStep && study) {
      await trackCrearAbandon({
        classToken,
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        checksum: lesson.checksum,
        studyId: study.studyId,
      });
    }
    window.location.assign('/');
  }

  function trackMarketProbe(
    moment: CrearMarketProbeMoment,
    stage: 'opened' | 'objective_selected' | 'registered',
    objective?: MarketObjective,
    reminderAccepted?: boolean
  ): Promise<void> {
    if (!lesson || !study) return Promise.resolve();
    return trackCrearMarketSignal({
      classToken,
      tallerId: lesson.id_taller,
      pasoId: `market-probe-${moment}`,
      checksum: lesson.checksum,
      studyId: study.studyId,
      moment,
      stage,
      objective,
      reminderAccepted,
    });
  }

  function openMarketProbe(moment: CrearMarketProbeMoment): void {
    setMarketProbe({ moment, reminderAccepted: false, pending: false, confirmed: false });
    void trackMarketProbe(moment, 'opened');
  }

  function chooseMarketObjective(objective: MarketObjective): void {
    setMarketProbe((current) => current ? { ...current, objective } : current);
    if (marketProbe) void trackMarketProbe(marketProbe.moment, 'objective_selected', objective);
  }

  async function registerMarketInterest(): Promise<void> {
    if (!marketProbe?.objective || marketProbe.pending) return;
    const snapshot = marketProbe;
    setMarketProbe({ ...snapshot, pending: true });
    await trackMarketProbe(
      snapshot.moment,
      'registered',
      snapshot.objective,
      snapshot.reminderAccepted
    );
    setMarketProbe({ ...snapshot, pending: false, confirmed: true });
  }

  if (loading) {
    return (
      <main className={styles.pageShell} data-scene="arrival" data-learning-mode="reflect" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={ambientPaused} />
        <div className={styles.loadingScene} role="status">
          <span className={styles.loadingOrb}><Loader2 size={24} /></span>
          <p>Preparando el caso…</p>
        </div>
      </main>
    );
  }

  if (error || !lesson || !currentStep || !study) {
    return (
      <main className={styles.pageShell} data-scene="arrival" data-learning-mode="reflect" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={ambientPaused} />
        <section className={styles.errorScene}>
          <span><RotateCcw size={22} /></span>
          <h1>No pudimos abrir la experiencia</h1>
          <p>{error ?? 'La lección no está disponible en este dispositivo.'}</p>
          <button type="button" className={styles.primaryAction} onClick={() => window.location.reload()}>
            Intentar de nuevo
          </button>
        </section>
      </main>
    );
  }

  if (marketProbe) {
    return (
      <main className={styles.pageShell} data-scene="closure" data-learning-mode="reflect" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={ambientPaused} />
        <section className={styles.marketProbeScene}>
          {marketProbe.confirmed ? (
            <>
              <span className={styles.completionMark}><Check size={28} /></span>
              <p className={styles.marketProbeLabel}>Siguiente reto</p>
              <h1>Tu lugar quedó apartado.</h1>
              <p>Te avisaremos por el mismo medio cuando podamos probarlo.</p>
              <button className={styles.primaryAction} type="button" onClick={() => window.location.assign('/')}>
                Listo, cerrar
              </button>
            </>
          ) : (
            <>
              <p className={styles.marketProbeLabel}>Siguiente reto</p>
              <h1>¿Qué te gustaría lograr con tu inglés?</h1>
              <p>Elige uno. Esto nos ayuda a preparar algo que sí te sirva.</p>
              <fieldset className={styles.marketProbeOptions}>
                <legend className={styles.visuallyHidden}>Elige un objetivo</legend>
                {MARKET_OBJECTIVES.map((option) => (
                  <label className={styles.marketProbeOption} key={option.id}>
                    <input
                      checked={marketProbe.objective === option.id}
                      name="market-objective"
                      onChange={() => chooseMarketObjective(option.id)}
                      type="radio"
                      value={option.id}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <label className={styles.marketReminder}>
                <input
                  checked={marketProbe.reminderAccepted}
                  onChange={(event) => setMarketProbe((current) => current
                    ? { ...current, reminderAccepted: event.target.checked }
                    : current)}
                  type="checkbox"
                />
                <span>Sí, avísame por el mismo medio cuando esté listo.</span>
              </label>
              <div className={styles.marketProbeActions}>
                <button
                  className={styles.primaryAction}
                  disabled={!marketProbe.objective || marketProbe.pending}
                  onClick={() => void registerMarketInterest()}
                  type="button"
                >
                  {marketProbe.pending ? 'Guardando…' : 'Apartar mi lugar'}
                </button>
                <button className={styles.secondaryAction} type="button" onClick={() => window.location.assign('/')}>
                  Ahora no
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  if (completed) {
    const certaintyState = constructStates.find(
      (state) => state.construct === 'certainty_calibration'
    );
    const formState = constructStates.find((state) => state.construct === 'modal_form');
    const day7Dimensions = [
      {
        id: 'interpretation',
        label: 'Interpretación de las pistas',
        dayOne: receiptEvidenceStatus(certaintyState?.independent),
        daySeven: receiptEvidenceStatus(certaintyState?.delayed),
      },
      {
        id: 'form',
        label: 'Forma en inglés',
        dayOne: receiptEvidenceStatus(formState?.independent),
        daySeven: receiptEvidenceStatus(formState?.delayed),
      },
    ];
    const daySevenPhrase = study.latestOutcomes['retest-production']?.text.trim();

    return (
      <main className={styles.pageShell} data-scene="closure" data-learning-mode="reflect" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={ambientPaused} />
        <section className={`${styles.completionScene} ${styles.day7CompletionScene}`}>
          <span className={styles.completionMark}><Check size={28} /></span>
          <h1>Volviste y cerraste el caso.</h1>
          <p>Ahora sí puedes comparar el caso nuevo con lo que hiciste una semana después.</p>
          <section
            aria-labelledby="day7-receipt-label"
            className={styles.day7Receipt}
          >
            <p className={styles.receiptLabel} id="day7-receipt-label">
              Tu evidencia de una semana después
            </p>
            <div className={styles.day7EvidenceRows}>
              {day7Dimensions.map((dimension) => (
                <article className={styles.day7EvidenceRow} key={dimension.id}>
                  <h2>{dimension.label}</h2>
                  <dl className={styles.day7Moments}>
                    <div>
                      <dt>Día 1 · caso nuevo</dt>
                      <dd data-status={dimension.dayOne}>
                        {receiptEvidenceLabel(dimension.dayOne, 'no disponible aquí')}
                      </dd>
                    </div>
                    <div>
                      <dt>Día 7 · hoy</dt>
                      <dd data-status={dimension.daySeven}>
                        {receiptEvidenceLabel(dimension.daySeven)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            {daySevenPhrase ? (
              <figure className={styles.day7Phrase}>
                <figcaption>Una semana después escribiste</figcaption>
                <blockquote lang="en-US">{daySevenPhrase}</blockquote>
              </figure>
            ) : null}
            <div className={styles.day7EvidenceLimit}>
              <p className={styles.receiptLabel}>Lo que todavía no sabemos</p>
              <p>
                Esto describe estos dos casos. Todavía no muestra cómo te irá con otros
                temas o situaciones.
              </p>
              <strong>Este registro es tuyo.</strong>
            </div>
          </section>
          <div className={styles.completionActions}>
            <button className={styles.primaryAction} type="button" onClick={() => openMarketProbe('day7')}>
              Quiero otro reto
            </button>
            <button className={styles.secondaryAction} type="button" onClick={() => window.location.assign('/')}>
              Volver al inicio
              <ArrowLeft size={17} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (
    retestGateActive &&
    (retestAuthorization.status === 'idle' || retestAuthorization.status === 'checking')
  ) {
    return (
      <main
        className={styles.pageShell}
        data-scene="closure"
        data-learning-mode="reflect"
        data-gate="retest-checking"
        data-celestea-create="true"
        lang="es-MX"
      >
        <AmbientField paused={ambientPaused} />
        <section className={styles.errorScene} role="status" aria-live="polite">
          <span><Loader2 size={22} /></span>
          <h1>Confirmando tu revisión…</h1>
          <p>Estamos sincronizando tu avance del día 1.</p>
        </section>
      </main>
    );
  }

  if (
    retestGateActive &&
    (retestAuthorization.status === 'retryable_error' ||
      retestAuthorization.status === 'permanent_error')
  ) {
    const retryable = retestAuthorization.status === 'retryable_error';
    const openMode =
      retestAuthorization.status === 'permanent_error' &&
      retestAuthorization.reason === 'open_mode';
    return (
      <main
        className={styles.pageShell}
        data-scene="closure"
        data-learning-mode="reflect"
        data-gate={openMode ? 'retest-open-mode' : 'retest-error'}
        data-celestea-create="true"
        lang="es-MX"
      >
        <AmbientField paused={ambientPaused} />
        <section className={styles.errorScene} role={retryable ? 'alert' : undefined}>
          <span>{openMode ? <CalendarClock size={22} /> : <RotateCcw size={22} />}</span>
          <h1>
            {openMode
              ? 'Este modo abierto no programa una revisión.'
              : retryable
                ? 'Aún no pudimos confirmar la revisión.'
                : 'No pudimos abrir esta revisión.'}
          </h1>
          <p>{retestAuthorization.message}</p>
          {retryable ? (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={retryRetestAuthorization}
            >
              Reintentar
            </button>
          ) : null}
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => window.location.assign('/')}
          >
            Listo, cerrar
          </button>
        </section>
      </main>
    );
  }

  if (retestGateActive && retestAuthorization.status === 'locked') {
    const dueDate = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(retestAuthorization.dueAt);
    const dayOnePhrase = study.latestOutcomes['transfer-production']?.text.trim();
    return (
      <main
        className={styles.pageShell}
        data-scene="closure"
        data-learning-mode="reflect"
        data-gate="retest"
        data-celestea-create="true"
        lang="es-MX"
      >
        <AmbientField paused={ambientPaused} />
        <header className={styles.topBar} aria-hidden={exitConfirm ? true : undefined}>
          <button className={styles.iconButton} type="button" onClick={() => setExitConfirm(true)} aria-label="Salir">
            <X size={20} />
          </button>
          <span className={styles.retestPill}><CalendarClock size={14} /> Día 7</span>
        </header>
        <section className={styles.gateScene} aria-hidden={exitConfirm ? true : undefined}>
          <div className={styles.gateContent}>
            <span className={styles.gateLabel}><CalendarClock size={16} /> Próxima revisión</span>
            <h1>Volvemos en una semana.</h1>
            <p>Hoy resolviste un caso nuevo. Regresa sin repasar para descubrir qué recuerdas.</p>
            {dayOnePhrase ? (
              <figure className={styles.dayOnePhrase}>
                <figcaption>Tu frase del día 1</figcaption>
                <blockquote lang="en-US">{dayOnePhrase}</blockquote>
              </figure>
            ) : null}
            <div className={styles.retestDate}>
              <Clock3 size={18} />
              <span>
                <small>Disponible</small>
                <strong>{dueDate}</strong>
              </span>
            </div>
          </div>
          <div className={styles.gateActions}>
            <button className={styles.secondaryAction} type="button" onClick={() => openMarketProbe('day1')}>
              Quiero otro reto
            </button>
            <button className={styles.gatePrimaryAction} type="button" onClick={() => window.location.assign('/')}>
              Listo, cerrar
            </button>
          </div>
        </section>
        <AnimatePresence>
          {exitConfirm
            ? renderExitSheet(setExitConfirm, confirmExit, exitContinueRef)
            : null}
        </AnimatePresence>
      </main>
    );
  }

  const mode = getInputMode(currentStep);
  const prompt = getPrompt(currentStep);
  const display = currentStep.crear?.display;
  /**
   * No case breadcrumb in the chrome. It answered "which case am I in?", but
   * `transfer-bridge` already answers it in the learner's own language and
   * with narration ("Cambia el caso, no la idea"), and each screen's own copy
   * names the person and the object. A persistent chrome line was a second,
   * weaker answer to a question already answered, and it spent the width that
   * the sentence carrying the meaning needed. Narrative orientation beats
   * chrome orientation; the artifact label survives on `arrival`, where the
   * case is introduced for the first time.
   */
  const compactVoice = true;
  const learningVisualMode = feedback
    ? 'reflect'
    : getLearningVisualMode(getStepId(currentStep));
  const scaffoldWithdrawMotion = getScaffoldWithdrawMotion(Boolean(prefersReducedMotion));
  const hideMapSceneCopy = Boolean(
    mode === 'match'
      && currentStep.crear?.certaintyMap
      && certaintyPhase === 'produce'
  );
  const answerElement = currentStep.crear?.baselineProduction ? (
    <CinematicBaselineProduction
      key={getStepId(currentStep)}
      config={currentStep.crear.baselineProduction}
      pending={pending}
      placeholder={getPlaceholder(currentStep, 'Escribe una oración breve en inglés…')}
      onGate={handleBaselineGate}
      onSubmit={handleBaselineSubmit}
      onFocusChange={setInputFocused}
    />
  ) : currentStep.crear?.precheck ? (
    <CinematicPrecheck
      key={getStepId(currentStep)}
      config={currentStep.crear.precheck}
      pending={pending}
      orderSeed={orderSeed}
      initialAnswers={precheckAnswers}
      onAttempt={handlePrecheckAttempt}
      onComplete={handlePrecheckComplete}
    />
  ) : mode === 'match' && currentStep.crear?.certaintyMap ? (
    <CinematicCertaintyMap
      key={getStepId(currentStep)}
      config={currentStep.crear.certaintyMap}
      pending={pending}
      assisted={Boolean(study.assistance[getStepId(currentStep)])}
      guideAssisted={guideUsedSteps.has(getStepId(currentStep))}
      orderSeed={`${orderSeed}:${getStepId(currentStep)}`}
      onAssistance={markAssistance}
      onAttempt={handleMapItemAttempt}
      onSubmit={handleSubmitMap}
      onFocusChange={setInputFocused}
      onPhaseChange={setCertaintyPhase}
    />
  ) : (
    <CinematicAnswer
      key={getStepId(currentStep)}
      mode={mode}
      prompt={prompt}
      placeholder={getPlaceholder(currentStep, 'Escribe una oración breve en inglés…')}
      choices={shownChoices}
      pending={pending}
      minChars={currentStep.crear?.minChars}
      responseParts={currentStep.crear?.responseParts}
      choiceLanguage={currentScene === 'practice' ? 'en-US' : 'es-MX'}
      continueLabel={
        currentStep.crear?.actionLabel ?? (currentScene === 'closure'
          ? 'Terminar por hoy'
          : currentScene === 'arrival'
            ? 'Estoy listo'
            : currentScene === 'transfer-bridge'
              ? 'Empezar el caso'
              : 'Continuar')
      }
      choiceSubmitLabel={
        currentStep.crear?.revealFeedback === false ? 'Guardar decisión' : 'Comprobar'
      }
      submitLabel={
        currentStep.crear?.actionLabel
          ?? (currentStep.crear?.responseParts?.length ? 'Enviar mis respuestas' : 'Enviar respuesta')
      }
      onContinue={handleContinue}
      onSubmitText={handleSubmitText}
      onSubmitChoice={handleSubmitChoice}
      onFocusChange={setInputFocused}
    />
  );

  /**
   * The two dimensions were always measured separately; only the report was
   * missing. Certainty comes from the independent decision, form from the
   * classifier branch — except when the sentence itself contradicts the
   * decision, which is what `misconcepcion_certeza` means.
   *
   * It is shaped as a receipt because it is the only thing the learner
   * *receives* for having written a baseline that served the study, not them.
   * Read as loose lines it was a footnote, and the baseline went back to being
   * a research tax on the last screen of day 1 — the screen that decides
   * whether they come back on day 7. No score, no percentage, no traffic
   * light: two named dimensions, and the two sentences side by side.
   */
  const closingDiagnostic = (() => {
    if (currentScene !== 'closure') return null;
    const certainty = study.latestOutcomes['transfer-check-certainty'];
    const production = study.latestOutcomes['transfer-production'];
    if (!certainty && !production) return null;

    /**
     * Each row reads its own construct and nothing else. The form row used to
     * be `branch === 'correcto'`, which told a learner whose `must have` was
     * spelled perfectly that their English form needed review — the mistake
     * was the certainty, and it already has its own row above.
     */
    const productionStep = lesson?.pasos.find(
      (step) => getStepId(step) === 'transfer-production'
    );
    const target = productionStep?.crear?.productionTarget;
    const written = production?.text.trim();
    const reading = target && written ? readModalForm(written, target) : null;
    const formCorrect = reading ? reading.wellFormed && reading.subjectPresent : false;
    const interpretationCorrect = certainty?.correct ?? false;
    const baselineText = study.latestOutcomes['precheck-production']?.text.trim();
    const transferText = written;
    const modalFormState = constructStates.find((state) => state.construct === 'modal_form');
    const earnedFormProgress = Boolean(
      modalFormState?.baseline?.status === 'not_demonstrated'
      && modalFormState.independent
      && modalFormState.independent.observed !== false
      && modalFormState.independent.correct
      && !modalFormState.independent.assisted
    );
    const dimensions = [
      { id: 'interpretation', label: 'Interpretación de las pistas', correct: interpretationCorrect },
      { id: 'form', label: 'Forma en inglés', correct: formCorrect },
    ];

    return (
      <section className={styles.closingReceipt} aria-labelledby="closing-receipt-label">
        <p className={styles.receiptLabel} id="closing-receipt-label">
          Lo que hiciste hoy
        </p>
        <ul className={styles.receiptRows}>
          {dimensions.map((dimension) => (
            <li
              className={styles.receiptRow}
              data-correct={dimension.correct ? 'true' : 'false'}
              key={dimension.id}
            >
              <span className={styles.receiptMark} aria-hidden="true">
                {dimension.correct ? <Check size={17} /> : <RotateCcw size={17} />}
              </span>
              <span className={styles.receiptDimension}>
                <small>{dimension.label}</small>
                <strong>{dimension.correct ? 'registrada, sin ayuda' : 'por revisar'}</strong>
              </span>
            </li>
          ))}
        </ul>
        {/* Degrades to nothing when the learner submitted the baseline empty:
            the two dimensions above still read as a finished block.

            The typographic weight is what claims progress. It therefore reads
            the modal-form trajectory from the evidence ledger: an observed,
            unsuccessful baseline followed by an independent correct transfer.
            A correct final sentence alone is not enough. `preexisting`, mixed,
            unknown and unsuccessful trajectories all stay level. */}
        {baselineText && transferText ? (
          <div
            aria-label="Tu primera frase y la de hoy"
            className={styles.receiptArc}
            data-trajectory={earnedFormProgress ? 'progress' : 'level'}
          >
            <p className={styles.receiptArcEntry} data-weight={earnedFormProgress ? 'before' : 'level'}>
              <small>Al empezar escribiste</small>
              <span lang="en-US">{baselineText}</span>
            </p>
            <p className={styles.receiptArcEntry} data-weight={earnedFormProgress ? 'now' : 'level'}>
              <small>Ahora escribiste</small>
              <span lang="en-US">{transferText}</span>
            </p>
          </div>
        ) : null}
      </section>
    );
  })();

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={styles.pageShell}
        data-scene={currentScene}
        data-stage={currentStage}
        data-learning-mode={learningVisualMode}
        data-audio-ready={audioAssetsReady ? 'true' : 'false'}
        data-structured={currentStep.crear?.responseParts || currentStep.crear?.certaintyMap ? 'true' : 'false'}
        data-certainty-phase={mode === 'match' ? certaintyPhase : undefined}
        data-structured-view={hasStructuredEvidenceFlow ? structuredView : undefined}
        data-voice-state={narration.status}
        data-input-focused={inputFocused ? 'true' : 'false'}
        data-page-hidden={pageHidden ? 'true' : 'false'}
        data-lite={liteMode ? 'true' : 'false'}
        data-celestea-create="true"
        lang="es-MX"
      >
        <AmbientField paused={ambientPaused} />
        <audio
          ref={narration.audioRef}
          preload="metadata"
          onEnded={narration.onEnded}
          onError={narration.onError}
          onPause={narration.onPause}
          onPlay={narration.onPlay}
        />
        <section
          className={styles.experienceShell}
          aria-hidden={feedback || exitConfirm || guideOpen ? true : undefined}
        >
          <header
            className={styles.topBar}
            data-scene={currentScene}
          >
            {currentScene === 'arrival' ? (
              <>
                <div className={styles.arrivalHeaderModule}>
                  {display?.moduleLabel ? (
                    <span className={styles.arrivalModuleName}>{display.moduleLabel}</span>
                  ) : null}
                  {display?.levelLabel ? (
                    <span
                      className={styles.arrivalLevelBadge}
                      aria-label={`Nivel de inglés ${display.levelLabel}`}
                    >
                      {display.levelLabel}
                    </span>
                  ) : null}
                </div>
                <button
                  className={`${styles.iconButton} ${styles.arrivalExitButton}`}
                  type="button"
                  onClick={() => setExitConfirm(true)}
                  aria-label="Salir de la sesión"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                <button className={styles.iconButton} type="button" onClick={() => setExitConfirm(true)} aria-label="Salir de la sesión">
                  <X size={20} />
                </button>
                {sessionProgress ? (
                  <SessionProgress
                    position={sessionProgress.position}
                    total={sessionProgress.total}
                  />
                ) : null}
              </>
            )}
          </header>

          <article className={styles.scene}>
              <AnimatePresence initial={false}>
                {learningVisualMode === 'supported' ? (
                  <motion.span
                    animate={{ opacity: 1, scaleY: 1 }}
                    aria-hidden="true"
                    className={styles.supportRail}
                    data-support-rail="true"
                    exit={scaffoldWithdrawMotion.exit}
                    initial={false}
                    key="support-rail"
                    transition={scaffoldWithdrawMotion.transition}
                  />
                ) : null}
              </AnimatePresence>
              {currentStep.crear?.guideAvailable
                && guideUnlocked
                && guideStep
                && certaintyPhase !== 'produce'
                && !(hasStructuredEvidenceFlow && structuredView === 'answer') ? (
                <button
                  aria-label="Ayuda"
                  className={styles.guideAction}
                  type="button"
                  onClick={openGuide}
                >
                  <BookOpenText size={16} />
                  Guía
                </button>
              ) : null}
              {!(hasStructuredEvidenceFlow && structuredView === 'answer') && !hideMapSceneCopy ? (
                <div className={styles.sceneCopy} data-scene={currentScene}>
                  {currentScene === 'arrival' && display?.learningGoal ? (
                    <p className={styles.arrivalLearningGoal}>{display.learningGoal}</p>
                  ) : null}
                  <div className={styles.caseBlock}>
                    {display?.eyebrow?.trim() ? <p className={styles.sceneEyebrow}>{display.eyebrow}</p> : null}
                    <h1
                      ref={headingRef}
                      tabIndex={-1}
                      lang="es-MX"
                    >
                      {display?.headline ?? lesson.titulo}
                    </h1>
                    {display?.body ? <p className={styles.sceneBody}>{display.body}</p> : null}
                  </div>
                </div>
              ) : null}

              {currentStep.crear?.caseArtifact && !hideMapSceneCopy ? (
                <CinematicCaseArtifact
                  artifact={currentStep.crear.caseArtifact}
                  compact={currentScene !== 'arrival'}
                />
              ) : null}

              {currentScene !== 'arrival' ? (
                hasStructuredEvidenceFlow ? (
                  <div
                    className={styles.structuredPane}
                    hidden={structuredView !== 'explore'}
                    ref={structuredEvidenceRef}
                    role="region"
                    aria-label="Pistas del caso. Usa los botones Anterior y Siguiente pista para revisarlas."
                    tabIndex={-1}
                  >
                    <EvidenceField step={currentStep} onReadyToAnswer={showStructuredAnswer} />
                  </div>
                ) : <EvidenceField step={currentStep} />
              ) : null}
              <ComparisonField
                step={currentStep}
                audioControl={
                  currentScene === 'contrast' && audio && audioAssetsReady ? (
                    <CinematicVoice
                      audio={audio}
                      compact
                      presentation="comparison"
                      status={narration.status}
                      onToggle={narration.toggle}
                    />
                  ) : undefined
                }
              />
              <ConceptPrism step={currentStep} />

              {audio
                && audioAssetsReady
                && currentScene !== 'contrast'
                && (!hasStructuredEvidenceFlow || structuredView === 'explore') ? (
                <CinematicVoice
                  audio={audio}
                  compact={compactVoice}
                  presentation={
                    currentScene === 'transfer-bridge' ? 'bridge' : 'default'
                  }
                  status={narration.status}
                  onToggle={narration.toggle}
                />
              ) : null}

              {closingDiagnostic}

              {hasStructuredEvidenceFlow ? (
                <div
                  className={styles.structuredAnswerStage}
                  hidden={structuredView !== 'answer'}
                  ref={structuredAnswerRef}
                  tabIndex={-1}
                >
                  <div className={styles.answerUtilities}>
                    <button className={styles.reviewEvidenceAction} type="button" onClick={showStructuredEvidence}>
                      <ArrowLeft size={16} />
                      Revisar pistas
                    </button>
                    {currentStep.crear?.guideAvailable && guideUnlocked && guideStep ? (
                    <button
                      aria-label="Ayuda"
                      className={styles.answerHelpAction}
                      type="button"
                      onClick={openGuide}
                    >
                      <BookOpenText size={15} />
                      Guía
                    </button>
                    ) : null}
                  </div>
                  {answerElement}
                </div>
              ) : answerElement}
          </article>
        </section>

        {feedback ? (
            <motion.div
              className={styles.sheetBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.section
                className={styles.feedbackSheet}
                data-correct={feedback.correct ? 'true' : 'false'}
                role="dialog"
                aria-modal="true"
                aria-labelledby="feedback-title"
                aria-describedby="feedback-body"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.feedbackSignal}>
                  {feedback.correct ? <Check size={20} /> : <RotateCcw size={20} />}
                </span>
                <div>
                  <h2 id="feedback-title" lang="es-MX">{feedback.title}</h2>
                  <span id="feedback-body" lang="es-MX">{feedback.body}</span>
                </div>
                <button
                  ref={feedbackActionRef}
                  className={styles.primaryAction}
                  type="button"
                  onClick={handleFeedbackAction}
                >
                  {feedback.actionLabel}
                  <ArrowLeft className={styles.forwardArrow} size={17} />
                </button>
              </motion.section>
            </motion.div>
          ) : null}
        <AnimatePresence>
          {guideOpen && guideStep
            ? renderGuideSheet(guideStep, () => setGuideOpen(false), guideCloseRef)
            : null}
        </AnimatePresence>
        <AnimatePresence>
          {exitConfirm
            ? renderExitSheet(setExitConfirm, confirmExit, exitContinueRef)
            : null}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}

function renderGuideSheet(
  guideStep: CrearPaso,
  closeGuide: () => void,
  closeButtonRef: RefObject<HTMLButtonElement>
) {
  return (
    <motion.div
      key="guide-sheet"
      className={styles.sheetBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        className={styles.guideSheet}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        <div className={styles.guideHeading}>
          <span><BookOpenText size={18} /></span>
          <div>
            <small>Consúltala cuando la necesites</small>
            {/* Certainty is the strength of the evidence, not personal
                confidence. The guide is the last surface that still framed it
                as how sure the learner feels. */}
            <h2 id="guide-title">Tres formas según la fuerza de la evidencia</h2>
          </div>
        </div>
        <ConceptPrism step={guideStep} />
        <button
          ref={closeButtonRef}
          className={styles.primaryAction}
          type="button"
          onClick={closeGuide}
        >
          Volver al caso
        </button>
      </motion.section>
    </motion.div>
  );
}

function renderExitSheet(
  setExitConfirm: (open: boolean) => void,
  confirmExit: () => void | Promise<void>,
  continueButtonRef: RefObject<HTMLButtonElement>
) {
  return (
    <motion.div
      key="exit-sheet"
      className={styles.sheetBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        className={styles.exitSheet}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-title"
      >
        <h2 id="exit-title">¿Quieres salir por ahora?</h2>
        <p>Podrás volver a la misma escena desde este dispositivo.</p>
        <div className={styles.exitActions}>
          <button className={styles.secondaryAction} type="button" onClick={confirmExit}>Salir</button>
          <button
            ref={continueButtonRef}
            className={styles.primaryAction}
            type="button"
            onClick={() => setExitConfirm(false)}
          >
            Seguir aquí
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}
