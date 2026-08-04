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
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { getOrCreateSessionId } from '@/lib/session';
import {
  loadWorkshopProgress,
  markWorkshopCompleted,
  saveWorkshopProgress,
} from '@/lib/workshopState';
import { loadCrearLesson } from '@/lib/crear/loadLesson';
import { classifyCrearLocally } from '@/lib/crear/localClassifier';
import { buildCrearLearningObservations } from '@/lib/crear/learningEvidence';
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
  saveCrearStudyState,
  type CrearStudyState,
} from '@/lib/crear/studyState';
import {
  trackCrearAbandon,
  trackCrearAnswer,
  trackCrearComplete,
  trackCrearHint,
  trackCrearStart,
  trackCrearStepComplete,
} from '@/lib/crear/telemetry';
import type {
  ClassifyResponse,
  CrearClassifierBranch,
  CrearCertaintyMapAttempt,
  CrearCertaintyMapSubmission,
  CrearExperienceStage,
  CrearPaso,
  CrearPrecheckAttempt,
  CrearResponseCategory,
  CrearResponsePartAnswer,
  CrearWorkshop,
} from '@/lib/crear/types';
import { DEFAULT_CREAR_LESSON_ID } from '@/lib/crear/types';
import { CinematicAnswer } from './CinematicAnswer';
import { CinematicCaseArtifact } from './CinematicCaseArtifact';
import {
  CinematicCertaintyMap,
  type CrearCertaintyMapPhase,
} from './CinematicCertaintyMap';
import { CinematicPrecheck } from './CinematicPrecheck';
import { CinematicVoice } from './CinematicVoice';
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

interface OutcomeState {
  branch: string;
  correct: boolean;
  score: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

function isRetestStage(stage: CrearExperienceStage | undefined): boolean {
  return stage === 'recuerda';
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

function effectiveRetestDelayHours(step: CrearPaso): number | null {
  if (typeof step.crear?.retestDelayHours !== 'number') return null;
  const override = Number(process.env.NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS);
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

  return (
    <div className={styles.prismWrap}>
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
                <p className={styles.prismSentence} lang="en-US">“{activeConcept.example}”</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
      {formula.length > 0 ? (
        <div className={styles.formulaRail} aria-label="Partes de una deducción sobre el pasado">
          {formula.map((part, index) => (
            <span key={`${part.value}-${part.label}`}>
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
        </div>
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
  const bootedRef = useRef(false);
  const stepInteractiveAtRef = useRef<number | null>(null);
  const [lesson, setLesson] = useState<CrearWorkshop | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [study, setStudy] = useState<CrearStudyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<OutcomeState | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [liteMode, setLiteMode] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [structuredView, setStructuredView] = useState<'explore' | 'answer'>('explore');
  const [certaintyPhase, setCertaintyPhase] = useState<CrearCertaintyMapPhase>('map');

  const currentStep = lesson?.pasos[currentIndex] ?? null;
  const currentStage = currentStep?.crear?.stage ?? 'descubre';
  const currentScene = currentStep?.crear?.scene ?? 'signal';
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
  const sceneTransitionMs = prefersReducedMotion ? 120 : 520;
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

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const loaded = await loadCrearLesson(DEFAULT_CREAR_LESSON_ID);
        const sid = getOrCreateSessionId();
        const nextStudy = getOrCreateCrearStudyState(
          DEFAULT_CREAR_LESSON_ID,
          loaded.content_version ?? 'dev'
        );
        const saved = loadWorkshopProgress(sid, loaded.id_taller);
        const savedMatchesStudy = Boolean(
          saved && saved.ultima_actualizacion >= nextStudy.startedAt
        );
        const candidateIndex = savedMatchesStudy
          ? Math.max(nextStudy.stepIndex, saved?.paso_actual ?? 0)
          : nextStudy.stepIndex;
        const safeIndex = candidateIndex >= 0 && candidateIndex < loaded.pasos.length ? candidateIndex : 0;
        const firstStep = loaded.pasos[safeIndex] ?? loaded.pasos[0];

        setLesson(loaded);
        setSessionId(sid);
        setStudy(nextStudy);
        setCurrentIndex(safeIndex);
        setCompleted(
          nextStudy.phase === 'completed' || (savedMatchesStudy && saved?.completado === true)
        );
        setAttempt(nextStudy.attempts[getStepId(firstStep)] ?? 0);

        const firstStepId = getStepId(firstStep);
        const transferStep = loaded.pasos.find((step) => step.crear?.fase === 'transfer');
        const retestStep = loaded.pasos.find(
          (step) => typeof step.crear?.retestDelayHours === 'number'
        );
        const outcomeStepId = nextStudy.phase === 'completed' && retestStep
          ? getStepId(retestStep)
          : firstStep.crear?.scene === 'closure' && transferStep
            ? getStepId(transferStep)
            : firstStepId;
        const storedOutcome =
          nextStudy.latestOutcomes[firstStepId] ?? nextStudy.firstOutcomes[outcomeStepId];
        if (storedOutcome) {
          setLastOutcome({
            branch: storedOutcome.branch,
            correct: storedOutcome.correct,
            score: storedOutcome.score,
          });
        }

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

        if (firstStep && nextStudy.phase !== 'completed') {
          void trackCrearStart({
            tallerId: loaded.id_taller,
            pasoId: getStepId(firstStep),
            checksum: loaded.checksum,
            studyId: nextStudy.studyId,
          });
        }
      } catch (bootError) {
        setError((bootError as Error).message || 'No pudimos abrir la experiencia.');
      } finally {
        setLoading(false);
      }
    }

    const nav = navigator as NavigatorWithConnection;
    setLiteMode(Boolean(nav.connection?.saveData));
    void boot();
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

  function getStepLatencyMs(): number | undefined {
    if (stepInteractiveAtRef.current === null) return undefined;
    return Math.max(0, Date.now() - stepInteractiveAtRef.current);
  }

  const retestLocked = useMemo(() => {
    if (!currentStep || !study || typeof currentStep.crear?.retestDelayHours !== 'number') return false;
    return typeof study.retestDueAt === 'number' && clockNow < study.retestDueAt;
  }, [clockNow, currentStep, study]);

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
        correct,
        assisted: details?.assisted ?? Boolean(current.assistance[stepId]),
        attempt: attemptNumber,
        statementId: details?.statementId,
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
    statementId?: string
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
      });
      if (observations.length === 0) return current;
      return saveCrearStudyState({
        ...current,
        evidenceLedger: [...current.evidenceLedger, ...observations],
      });
    });
  }

  function completeLesson(step: CrearPaso) {
    if (!lesson || !sessionId || !study) return;
    persistProgress(currentIndex, true);
    markWorkshopCompleted(sessionId, lesson.id_taller);
    persistStudy({ phase: 'completed', stepIndex: currentIndex });
    setCompleted(true);
    void trackCrearComplete({
      tallerId: lesson.id_taller,
      pasoId: getStepId(step),
      checksum: lesson.checksum,
      studyId: study.studyId,
    });
  }

  function advance(step: CrearPaso, nextRefId: string | null) {
    if (!lesson || !study) return;

    void trackCrearStepComplete({
      tallerId: lesson.id_taller,
      pasoId: getStepId(step),
      checksum: lesson.checksum,
      studyId: study.studyId,
    });

    const nextIndex =
      nextRefId != null
        ? lesson.pasos.findIndex((candidate) => candidate.ref_id === nextRefId)
        : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= lesson.pasos.length) {
      completeLesson(step);
      return;
    }

    const nextStep = lesson.pasos[nextIndex];
    narration.prepareTransition({
      audio: audioAssetsReady ? nextStep.crear?.audio : undefined,
      sceneKey: getStepId(nextStep),
      transitionMs: sceneTransitionMs,
    });
    const delayHours = effectiveRetestDelayHours(nextStep);
    const nextStudy: Partial<CrearStudyState> = {
      stepIndex: nextIndex,
      awaitingFeedback: {
        ...study.awaitingFeedback,
        [getStepId(step)]: false,
      },
    };
    if (delayHours != null && study.phase === 'initial') {
      nextStudy.phase = 'waiting_retest';
      nextStudy.retestDueAt = Date.now() + delayHours * 60 * 60 * 1000;
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
    const timeout = window.setTimeout(() => controller.abort(), 6500);
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
      return classifyCrearLocally(text, classifier, parts);
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
    }
  ) {
    if (!lesson || !study) return;
    void trackCrearAnswer({
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
      score,
      attempt: attemptNumber,
      studyId: study.studyId,
      checksum: lesson.checksum,
      learningOpportunity: step.crear?.learningOpportunity,
    });
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

    setLastOutcome({ branch: branchId, correct, score });
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
      persistAttempt(
        currentStep,
        classification.rama,
        correct,
        score,
        text,
        attemptNumber,
        classification.confianza,
        parts,
        { assisted }
      );
      queueAnswerTelemetry(
        currentStep,
        classification.rama,
        correct,
        score,
        text,
        attemptNumber,
        parts,
        { assisted, latencyMs }
      );

      if (branch?.pista) {
        void trackCrearHint({
          tallerId: lesson.id_taller,
          pasoId: getStepId(currentStep),
          rama: classification.rama,
          checksum: lesson.checksum,
          studyId: study.studyId,
        });
      }

      if (currentStep.crear?.revealFeedback === false) {
        setLastOutcome({ branch: classification.rama, correct, score });
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
    persistAttempt(
      currentStep,
      branchId,
      correct,
      score,
      answerText,
      attemptNumber,
      1,
      undefined,
      { assisted }
    );
    queueAnswerTelemetry(
      currentStep,
      branchId,
      correct,
      score,
      answerText,
      attemptNumber,
      undefined,
      { assisted, latencyMs }
    );

    const retry = Boolean(
      currentStep.crear?.allowRetry &&
      !correct &&
      attemptNumber < (currentStep.crear?.maxAttempts ?? 1)
    );

    if (retry) {
      void trackCrearHint({
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        rama: branchId,
        checksum: lesson.checksum,
        studyId: study.studyId,
      });
    }
    setLastOutcome({ branch: branchId, correct, score });
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
      mapAttempt.statementId
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
      }
    );
  }

  function handlePrecheckComplete(): void {
    if (!currentStep) return;
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
      const classification = submission.productionText
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
      setLastOutcome({ branch: classification.rama, correct, score });

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
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        checksum: lesson.checksum,
        studyId: study.studyId,
      });
    }
    window.location.assign('/');
  }

  if (loading) {
    return (
      <main className={styles.pageShell} data-scene="arrival" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={Boolean(prefersReducedMotion) || liteMode || pageHidden} />
        <div className={styles.loadingScene} role="status">
          <span className={styles.loadingOrb}><Loader2 size={24} /></span>
          <p>Preparando el caso…</p>
        </div>
      </main>
    );
  }

  if (error || !lesson || !currentStep || !study) {
    return (
      <main className={styles.pageShell} data-scene="arrival" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={Boolean(prefersReducedMotion) || liteMode || pageHidden} />
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

  if (completed) {
    return (
      <main className={styles.pageShell} data-scene="closure" data-celestea-create="true" lang="es-MX">
        <AmbientField paused={Boolean(prefersReducedMotion) || liteMode || pageHidden} />
        <section className={styles.completionScene}>
          <span className={styles.completionMark}><Check size={28} /></span>
          <h1>Terminaste la revisión.</h1>
          <p>Guardamos tus respuestas para mejorar la siguiente experiencia.</p>
          <div
            className={styles.outcomeCard}
            data-correct={lastOutcome ? (lastOutcome.correct ? 'true' : 'false') : 'unknown'}
          >
            <small>Resultado de esta revisión</small>
            <strong>
              {lastOutcome
                ? lastOutcome.correct
                  ? 'Pudiste escribir una deducción en un caso nuevo.'
                  : 'Ya sabemos qué conviene practicar de nuevo.'
                : 'La revisión quedó guardada.'}
            </strong>
          </div>
          <button className={styles.secondaryAction} type="button" onClick={() => window.location.assign('/')}>
            Volver al inicio
            <ArrowLeft size={17} />
          </button>
        </section>
      </main>
    );
  }

  if (retestLocked) {
    const dueDate = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(study.retestDueAt);
    return (
      <main
        className={styles.pageShell}
        data-scene="closure"
        data-gate="retest"
        data-celestea-create="true"
        lang="es-MX"
      >
        <AmbientField paused={Boolean(prefersReducedMotion) || liteMode || pageHidden} />
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
            <div className={styles.retestDate}>
              <Clock3 size={18} />
              <span>
                <small>Disponible</small>
                <strong>{dueDate}</strong>
              </span>
            </div>
          </div>
          <button className={styles.gatePrimaryAction} type="button" onClick={() => window.location.assign('/')}>
            Listo, cerrar
          </button>
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
  const compactVoice = true;
  const hideMapSceneCopy = Boolean(
    mode === 'match'
      && currentStep.crear?.certaintyMap
      && certaintyPhase === 'produce'
  );
  const sceneTransition = prefersReducedMotion
    ? { duration: 0.12 }
    : { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const };
  const answerElement = currentStep.crear?.precheck ? (
    <CinematicPrecheck
      key={getStepId(currentStep)}
      config={currentStep.crear.precheck}
      pending={pending}
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
      choices={getChoices(currentStep)}
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

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={styles.pageShell}
        data-scene={currentScene}
        data-stage={currentStage}
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
        <AmbientField paused={Boolean(prefersReducedMotion) || liteMode || pageHidden} />
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

          <motion.article
            className={styles.scene}
            key={getStepId(currentStep)}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={sceneTransition}
          >
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
                && currentScene !== 'arrival'
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
          </motion.article>
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
            <h2 id="guide-title">Tres formas de decir qué tan seguro estás</h2>
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
