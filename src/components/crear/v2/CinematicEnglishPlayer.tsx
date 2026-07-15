"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock3,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { getOrCreateSessionId } from '@/lib/session';
import {
  loadWorkshopProgress,
  markWorkshopCompleted,
  saveWorkshopProgress,
  type WorkshopProgress,
} from '@/lib/workshopState';
import { evalRule } from '@/lib/workshops/branch';
import { loadCrearLesson } from '@/lib/crear/loadLesson';
import { classifyCrearLocally } from '@/lib/crear/localClassifier';
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
  CrearExperienceStage,
  CrearInputMode,
  CrearPaso,
  CrearWorkshop,
} from '@/lib/crear/types';
import { DEFAULT_CREAR_LESSON_ID } from '@/lib/crear/types';
import type { ChoiceOption } from '../AnswerComposer';
import { CinematicAnswer } from './CinematicAnswer';
import { CinematicVoice, type CinematicVoiceStatus } from './CinematicVoice';
import styles from './CinematicEnglishPlayer.module.css';

interface BranchContext {
  rama: string;
  confianza: number;
}

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

const EXPERIENCE_STAGES: Array<{ id: Exclude<CrearExperienceStage, 'recuerda'>; label: string }> = [
  { id: 'descubre', label: 'Descubre' },
  { id: 'practica', label: 'Practica' },
  { id: 'aplica', label: 'Aplica' },
];

function getStepId(step: CrearPaso): string {
  return step.ref_id ?? String(step.paso_numero);
}

function getInputMode(step: CrearPaso): CrearInputMode {
  return step.crear?.input ?? 'none';
}

function getPrompt(step: CrearPaso): string {
  if (step.tipo_paso === 'instruccion') return step.instruccion.texto;
  if (step.tipo_paso === 'pregunta_abierta_validada') return step.pregunta_abierta_validada.pregunta;
  if (step.tipo_paso === 'opcion_multiple') return step.opcion_multiple.pregunta;
  if (step.tipo_paso === 'transferencia') {
    return `${step.transferencia.escenario} ${step.transferencia.pregunta}`.trim();
  }
  return step.titulo_paso;
}

function getPlaceholder(step: CrearPaso): string | undefined {
  if (step.tipo_paso === 'pregunta_abierta_validada') return step.pregunta_abierta_validada.placeholder;
  if (step.tipo_paso === 'transferencia') return 'Write three short deductions in English…';
  return undefined;
}

function getChoices(step: CrearPaso): ChoiceOption[] {
  return step.tipo_paso === 'opcion_multiple' ? step.opcion_multiple.opciones : [];
}

function getCorrectChoiceId(step: CrearPaso): string | null {
  return step.tipo_paso === 'opcion_multiple' ? step.opcion_multiple.respuesta_correcta : null;
}

function findBranch(step: CrearPaso, branchId: string): CrearClassifierBranch | null {
  return step.crear?.classifier?.ramas.find((branch) => branch.rama === branchId) ?? null;
}

function resolveNextRef(step: CrearPaso, ctx: BranchContext): string | null {
  for (const branchRule of step.crear?.branchRules ?? []) {
    if (evalRule(branchRule.rule, ctx)) return branchRule.nextRefId;
  }
  return step.crear?.nextRefId ?? null;
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
    title: authored?.title ?? (correct ? 'La evidencia y tu certeza coinciden' : 'Hay una pieza por calibrar'),
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
    title: correct ? 'Bien calibrado' : 'Todavía hay margen de duda',
    body,
    actionLabel: retry ? 'Probar otra vez' : 'Continuar',
    retry,
    nextRefId: resolveNextRef(step, { rama: branchId, confianza: 1 }),
    correct,
  };
}

function makeProgress(
  lesson: CrearWorkshop,
  sessionId: string,
  stepIndex: number,
  completed: boolean
): WorkshopProgress {
  const existing = loadWorkshopProgress(sessionId, lesson.id_taller);
  return {
    taller_id: lesson.id_taller,
    student_session_id: sessionId,
    paso_actual: stepIndex,
    paso_states: existing?.paso_states ?? {},
    ultima_actualizacion: Date.now(),
    completado: completed,
  };
}

function effectiveRetestDelayHours(step: CrearPaso): number | null {
  if (typeof step.crear?.retestDelayHours !== 'number') return null;
  const override = Number(process.env.NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS);
  return Number.isFinite(override) && override >= 0 ? override : step.crear.retestDelayHours;
}

function PhaseRail({ stage }: { stage: CrearExperienceStage }) {
  if (stage === 'recuerda') {
    return (
      <span className={styles.retestPill}>
        <CalendarClock size={14} />
        Día 7
      </span>
    );
  }

  const currentIndex = EXPERIENCE_STAGES.findIndex((item) => item.id === stage);
  return (
    <nav className={styles.phaseRail} aria-label="Fases de la experiencia">
      {EXPERIENCE_STAGES.map((item, index) => (
        <span
          className={styles.phaseItem}
          data-state={index === currentIndex ? 'active' : index < currentIndex ? 'complete' : 'upcoming'}
          key={item.id}
        >
          <span className={styles.phaseDot}>{index < currentIndex ? <Check size={10} /> : null}</span>
          <span>{item.label}</span>
        </span>
      ))}
    </nav>
  );
}

function EvidenceField({ step }: { step: CrearPaso }) {
  const evidence = step.crear?.evidence ?? [];
  if (evidence.length === 0) return null;

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

function ComparisonField({ step }: { step: CrearPaso }) {
  const comparison = step.crear?.comparison;
  if (!comparison) return null;
  return (
    <div className={styles.comparisonField}>
      <article>
        <small>{comparison.leftLabel ?? 'Sentence A'}</small>
        <p lang="en-US">{comparison.left}</p>
      </article>
      <span className={styles.comparisonBeam} aria-hidden="true" />
      <article>
        <small>{comparison.rightLabel ?? 'Sentence B'}</small>
        <p lang="en-US">{comparison.right}</p>
      </article>
    </div>
  );
}

function ConceptPrism({ step }: { step: CrearPaso }) {
  const concepts = step.crear?.concepts ?? [];
  const formula = step.crear?.formula ?? [];
  if (concepts.length === 0 && formula.length === 0) return null;

  return (
    <div className={styles.prismWrap}>
      {concepts.length > 0 ? (
        <div className={styles.prismGrid}>
          {concepts.map((concept, index) => (
            <motion.article
              className={styles.prismCard}
              data-strength={concept.strength}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.09, duration: 0.45 }}
              key={concept.id}
            >
              <span className={styles.certaintyLine} aria-hidden="true" />
              <strong lang="en-US">{concept.term}</strong>
              <small>{concept.meaning}</small>
              <p lang="en-US">{concept.example}</p>
            </motion.article>
          ))}
        </div>
      ) : null}
      {formula.length > 0 ? (
        <div className={styles.formulaRail} aria-label="Estructura gramatical">
          {formula.map((part, index) => (
            <span key={part}>
              <b lang="en-US">{part}</b>
              {index < formula.length - 1 ? <i aria-hidden="true">+</i> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AmbientField() {
  return (
    <div className={styles.ambientField} aria-hidden="true">
      <span className={styles.dotField} />
      <span className={styles.auroraOne} />
      <span className={styles.auroraTwo} />
      <span className={styles.horizonLine} />
    </div>
  );
}

export function CinematicEnglishPlayer() {
  const prefersReducedMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const feedbackActionRef = useRef<HTMLButtonElement>(null);
  const exitContinueRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const bootedRef = useRef(false);
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
  const [voiceStatus, setVoiceStatus] = useState<CinematicVoiceStatus>('ready');
  const [inputFocused, setInputFocused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [liteMode, setLiteMode] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const currentStep = lesson?.pasos[currentIndex] ?? null;
  const currentStage = currentStep?.crear?.stage ?? 'descubre';
  const currentScene = currentStep?.crear?.scene ?? 'signal';

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
        const outcomeStepId = nextStudy.phase === 'completed'
          ? 'retest'
          : firstStepId === 'close'
            ? 'transfer'
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
    if (!feedback && !exitConfirm) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const targetRef = exitConfirm ? exitContinueRef : feedbackActionRef;
    const frame = window.requestAnimationFrame(() => targetRef.current?.focus());

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && exitConfirm) {
        event.preventDefault();
        setExitConfirm(false);
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
  }, [exitConfirm, feedback]);

  useEffect(() => {
    if (currentStep && !feedback) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.setTimeout(
        () => headingRef.current?.focus({ preventScroll: true }),
        prefersReducedMotion ? 0 : 280
      );
    }
  }, [currentStep, feedback, prefersReducedMotion]);

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
    confidence: number
  ): void {
    const stepId = getStepId(step);
    setStudy((current) => {
      if (!current) return current;
      const outcome = {
        branch,
        correct,
        score,
        text,
        attempt: attemptNumber,
        confidence,
        submittedAt: Date.now(),
      };
      return saveCrearStudyState({
        ...current,
        attempts: { ...current.attempts, [stepId]: attemptNumber },
        firstOutcomes: current.firstOutcomes[stepId]
          ? current.firstOutcomes
          : { ...current.firstOutcomes, [stepId]: outcome },
        latestOutcomes: { ...current.latestOutcomes, [stepId]: outcome },
        awaitingFeedback: {
          ...current.awaitingFeedback,
          [stepId]: step.crear?.revealFeedback !== false,
        },
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
    const delayHours = effectiveRetestDelayHours(nextStep);
    const nextStudy: Partial<CrearStudyState> = { stepIndex: nextIndex };
    if (delayHours != null && study.phase === 'initial') {
      nextStudy.phase = 'waiting_retest';
      nextStudy.retestDueAt = Date.now() + delayHours * 60 * 60 * 1000;
    }

    persistProgress(nextIndex, false);
    persistStudy(nextStudy);
    setFeedback(null);
    setAttempt(0);
    setInputFocused(false);
    setVoiceStatus('ready');
    setCurrentIndex(nextIndex);
  }

  async function classifyText(step: CrearPaso, text: string): Promise<ClassifyResponse> {
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
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`classifier_${response.status}`);
      return (await response.json()) as ClassifyResponse;
    } catch {
      return classifyCrearLocally(text, classifier);
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
    attemptNumber: number
  ) {
    if (!lesson || !study) return;
    void trackCrearAnswer({
      tallerId: lesson.id_taller,
      pasoId: getStepId(step),
      fase: step.crear?.fase ?? 'practica',
      correcto: correct,
      rama: branch,
      texto: text,
      score,
      intento: attemptNumber,
      studyId: study.studyId,
      checksum: lesson.checksum,
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

  async function handleSubmitText(text: string) {
    if (!currentStep || !lesson || !study) return;
    setPending(true);
    const attemptNumber = attempt + 1;
    setAttempt(attemptNumber);

    try {
      const classification = await classifyText(currentStep, text);
      const branch = findBranch(currentStep, classification.rama);
      const correct = branch?.correcto ?? false;
      const score = branch?.score ?? 0;
      persistAttempt(
        currentStep,
        classification.rama,
        correct,
        score,
        text,
        attemptNumber,
        classification.confianza
      );
      queueAnswerTelemetry(currentStep, classification.rama, correct, score, text, attemptNumber);

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
    const correct = getCorrectChoiceId(currentStep) === choiceId;
    const choice = getChoices(currentStep).find((item) => item.id === choiceId);
    const branchId = correct ? 'correcto' : 'incorrecto';
    const score = correct ? 1 : 0;
    const answerText = choice?.texto ?? choiceId;
    persistAttempt(currentStep, branchId, correct, score, answerText, attemptNumber, 1);
    queueAnswerTelemetry(currentStep, branchId, correct, score, answerText, attemptNumber);

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
    setFeedback(buildChoiceFeedback(currentStep, correct, attemptNumber));
  }

  function handleContinue() {
    if (!currentStep) return;
    advance(currentStep, currentStep.crear?.nextRefId ?? null);
  }

  function handleFeedbackAction() {
    if (!currentStep || !feedback) return;
    const stepId = getStepId(currentStep);
    setStudy((current) => {
      if (!current) return current;
      return saveCrearStudyState({
        ...current,
        awaitingFeedback: { ...current.awaitingFeedback, [stepId]: false },
      });
    });
    if (feedback.retry) {
      setFeedback(null);
      return;
    }
    advance(currentStep, feedback.nextRefId);
  }

  function confirmExit() {
    if (lesson && currentStep && study) {
      void trackCrearAbandon({
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
      <main className={styles.pageShell} data-scene="arrival" lang="es-MX">
        <AmbientField />
        <div className={styles.loadingScene} role="status">
          <span className={styles.loadingOrb}><Sparkles size={24} /></span>
          <p>Preparando la señal…</p>
        </div>
      </main>
    );
  }

  if (error || !lesson || !currentStep || !study) {
    return (
      <main className={styles.pageShell} data-scene="arrival" lang="es-MX">
        <AmbientField />
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
      <main className={styles.pageShell} data-scene="closure" lang="es-MX">
        <AmbientField />
        <section className={styles.completionScene}>
          <span className={styles.completionMark}><Check size={28} /></span>
          <p className={styles.sceneEyebrow}>EVIDENCIA D7 REGISTRADA</p>
          <h1>Ahora sí sabemos qué permaneció.</h1>
          <p>
            Tu respuesta quedó vinculada con el primer intento. No es una calificación: es evidencia para mejorar cómo aprendes.
          </p>
          <div
            className={styles.outcomeCard}
            data-correct={lastOutcome ? (lastOutcome.correct ? 'true' : 'false') : 'unknown'}
          >
            <small>Resultado de esta revisión</small>
            <strong>
              {lastOutcome
                ? lastOutcome.correct
                  ? 'El patrón se sostuvo en un caso nuevo.'
                  : 'El patrón todavía necesita otra vuelta.'
                : 'La revisión quedó registrada y vinculada con tu primer intento.'}
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
      <main className={styles.pageShell} data-scene="closure" lang="es-MX">
        <AmbientField />
        <header className={styles.topBar} aria-hidden={exitConfirm ? true : undefined}>
          <button className={styles.iconButton} type="button" onClick={() => setExitConfirm(true)} aria-label="Salir">
            <X size={20} />
          </button>
          <span className={styles.wordmark}>CELESTEA</span>
          <span className={styles.retestPill}><CalendarClock size={14} /> Día 7</span>
        </header>
        <section className={styles.gateScene} aria-hidden={exitConfirm ? true : undefined}>
          <span className={styles.gateIcon}><LockKeyhole size={24} /></span>
          <p className={styles.sceneEyebrow}>PRIMERA SESIÓN COMPLETA</p>
          <h1>La prueba real ocurre después.</h1>
          <p>Hoy aplicaste el patrón en un caso nuevo. Regresa sin repasar para descubrir qué sigue contigo.</p>
          <div className={styles.retestDate}>
            <Clock3 size={19} />
            <span>
              <small>Revisión disponible</small>
              <strong>{dueDate}</strong>
            </span>
          </div>
          <button className={styles.secondaryAction} type="button" onClick={() => window.location.assign('/')}>
            Cerrar por hoy
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
  const audio = currentStep.crear?.audio;
  const compactVoice = inputFocused || mode !== 'none';
  const sceneTransition = prefersReducedMotion
    ? { duration: 0.12 }
    : { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={styles.pageShell}
        data-scene={currentScene}
        data-stage={currentStage}
        data-voice-state={voiceStatus}
        data-input-focused={inputFocused ? 'true' : 'false'}
        data-page-hidden={pageHidden ? 'true' : 'false'}
        data-lite={liteMode ? 'true' : 'false'}
        lang="es-MX"
      >
        <AmbientField />
        <section
          className={styles.experienceShell}
          aria-hidden={feedback || exitConfirm ? true : undefined}
        >
          <header className={styles.topBar}>
            <button className={styles.iconButton} type="button" onClick={() => setExitConfirm(true)} aria-label="Salir de la sesión">
              <X size={20} />
            </button>
            <span className={styles.wordmark}>CELESTEA</span>
            <PhaseRail stage={currentStage} />
          </header>

          <AnimatePresence mode="wait">
            <motion.article
              className={styles.scene}
              key={getStepId(currentStep)}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.992 }}
              transition={sceneTransition}
            >
              <div className={styles.sceneCopy}>
                <p className={styles.sceneEyebrow}>{display?.eyebrow ?? currentStep.titulo_paso}</p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  lang={currentStage === 'recuerda' ? 'es-MX' : 'en-US'}
                >
                  {display?.headline ?? lesson.titulo}
                </h1>
                {display?.body ? <p className={styles.sceneBody}>{display.body}</p> : null}
              </div>

              <EvidenceField step={currentStep} />
              <ComparisonField step={currentStep} />
              <ConceptPrism step={currentStep} />

              {audio ? (
                <CinematicVoice
                  audio={audio}
                  sceneKey={getStepId(currentStep)}
                  compact={compactVoice}
                  onStatusChange={setVoiceStatus}
                />
              ) : null}

              <CinematicAnswer
                key={`${getStepId(currentStep)}-${attempt}`}
                mode={mode}
                prompt={prompt}
                placeholder={getPlaceholder(currentStep)}
                choices={getChoices(currentStep)}
                pending={pending}
                minChars={currentStep.crear?.minChars}
                continueLabel={currentScene === 'closure' ? 'Guardar y cerrar' : currentScene === 'arrival' ? 'Entrar al reto' : 'Continuar'}
                submitLabel={currentStage === 'aplica' || currentStage === 'recuerda' ? 'Guardar evidencia' : 'Enviar idea'}
                onContinue={handleContinue}
                onSubmitText={handleSubmitText}
                onSubmitChoice={handleSubmitChoice}
                onFocusChange={setInputFocused}
              />
            </motion.article>
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {feedback ? (
            <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.section
                className={styles.feedbackSheet}
                data-correct={feedback.correct ? 'true' : 'false'}
                role="dialog"
                aria-modal="true"
                aria-labelledby="feedback-title"
                aria-describedby="feedback-body"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.feedbackSignal}>{feedback.correct ? <Check size={20} /> : <Sparkles size={20} />}</span>
                <div>
                  <p role="status" aria-live="polite">
                    {feedback.correct ? 'EVIDENCIA CALIBRADA' : 'AJUSTE ÚTIL'}
                  </p>
                  <h2 id="feedback-title" lang="en-US">{feedback.title}</h2>
                  <span id="feedback-body" lang="en-US">{feedback.body}</span>
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
          {exitConfirm
            ? renderExitSheet(setExitConfirm, confirmExit, exitContinueRef)
            : null}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}

function renderExitSheet(
  setExitConfirm: (open: boolean) => void,
  confirmExit: () => void,
  continueButtonRef: RefObject<HTMLButtonElement>
) {
  return (
    <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        className={styles.exitSheet}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-title"
      >
        <p className={styles.sceneEyebrow}>TU AVANCE YA QUEDÓ GUARDADO</p>
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
