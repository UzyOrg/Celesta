"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { getOrCreateSessionId } from '@/lib/session';
import {
  loadWorkshopProgress,
  markWorkshopCompleted,
  saveWorkshopProgress,
} from '@/lib/workshopState';
import { loadCrearLesson } from '@/lib/crear/loadLesson';
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
  trackCrearAnswer,
  trackCrearComplete,
  trackCrearHint,
  trackCrearStart,
  trackCrearStepComplete,
} from '@/lib/crear/telemetry';
import type {
  ClassifyResponse,
  CrearLessonId,
  CrearPaso,
  CrearWorkshop,
} from '@/lib/crear/types';
import { isCrearLessonId } from '@/lib/crear/types';
import { AnswerComposer } from './AnswerComposer';
import { MysteryPicker } from './MysteryPicker';
import { VerdictCard } from './VerdictCard';
import { VoiceLine } from './VoiceLine';
import styles from './CrearLessonPlayer.module.css';

export function CrearLessonPlayer() {
  const [lessonId, setLessonId] = useState<CrearLessonId | null>(null);
  const [lesson, setLesson] = useState<CrearWorkshop | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<string | undefined>();

  const currentStep = lesson?.pasos[currentIndex] ?? null;

  async function persistProgress(nextIndex: number, isComplete: boolean) {
    if (!lesson || !sessionId) return;
    saveWorkshopProgress(makeProgress(lesson, sessionId, nextIndex, isComplete));
  }

  async function handleSelect(id: CrearLessonId) {
    setLoading(true);
    setError(null);
    setCompleted(false);
    setLastVerdict(undefined);

    try {
      const loaded = await loadCrearLesson(id);
      const sid = getOrCreateSessionId();
      const saved = loadWorkshopProgress(sid, loaded.id_taller);
      const savedIndex =
        saved && !saved.completado && saved.paso_actual >= 0 && saved.paso_actual < loaded.pasos.length
          ? saved.paso_actual
          : 0;
      const firstStep = loaded.pasos[savedIndex];

      setLessonId(id);
      setLesson(loaded);
      setSessionId(sid);
      setCurrentIndex(savedIndex);

      if (firstStep) {
        await trackCrearStart({
          tallerId: loaded.id_taller,
          pasoId: getStepId(firstStep),
          checksum: loaded.checksum,
        });
      }
    } catch (selectError) {
      setError((selectError as Error).message || 'No se pudo cargar la lección.');
    } finally {
      setLoading(false);
    }
  }

  function resetToPicker() {
    setLessonId(null);
    setLesson(null);
    setCurrentIndex(0);
    setCompleted(false);
    setError(null);
    setLastVerdict(undefined);
  }

  async function completeLesson(step: CrearPaso) {
    if (!lesson || !sessionId) return;

    setCompleted(true);
    markWorkshopCompleted(sessionId, lesson.id_taller);
    await persistProgress(currentIndex, true);
    await trackCrearComplete({
      tallerId: lesson.id_taller,
      pasoId: getStepId(step),
      checksum: lesson.checksum,
    });
  }

  async function advance(step: CrearPaso, nextRefId: string | null) {
    if (!lesson) return;

    await trackCrearStepComplete({
      tallerId: lesson.id_taller,
      pasoId: getStepId(step),
      checksum: lesson.checksum,
    });

    const nextIndex =
      nextRefId != null ? lesson.pasos.findIndex((candidate) => candidate.ref_id === nextRefId) : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= lesson.pasos.length) {
      await completeLesson(step);
      return;
    }

    setCurrentIndex(nextIndex);
    await persistProgress(nextIndex, false);
  }

  async function handleContinue() {
    if (!currentStep) return;
    setPending(true);
    try {
      await advance(currentStep, currentStep.crear?.nextRefId ?? null);
    } finally {
      setPending(false);
    }
  }

  async function classifyText(step: CrearPaso, texto: string): Promise<ClassifyResponse> {
    const classifier = step.crear?.classifier;
    if (!lessonId || !classifier) {
      return { rama: 'respuesta', confianza: 1 };
    }

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tallerId: lessonId,
          pasoRefId: getStepId(step),
          texto,
        }),
      });

      if (!res.ok) throw new Error(`classifier_${res.status}`);
      return (await res.json()) as ClassifyResponse;
    } catch {
      return { rama: classifier.fallbackRama, confianza: 0 };
    }
  }

  async function handleSubmitText(text: string) {
    if (!lesson || !currentStep) return;
    setPending(true);

    try {
      const trimmed = text.trim();
      const classification = await classifyText(currentStep, trimmed);
      const branch = findBranch(currentStep, classification.rama);
      const fase = currentStep.crear?.fase ?? 'practica';
      const correcto = branch?.correcto ?? false;
      const score = branch?.score ?? (correcto ? 1 : 0);

      await trackCrearAnswer({
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        fase,
        correcto,
        rama: classification.rama,
        texto: trimmed,
        score,
        checksum: lesson.checksum,
      });

      if (branch?.pista === true) {
        await trackCrearHint({
          tallerId: lesson.id_taller,
          pasoId: getStepId(currentStep),
          rama: classification.rama,
          checksum: lesson.checksum,
        });
      }

      await advance(currentStep, resolveNextRef(currentStep, classification));
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitChoice(choiceId: string) {
    if (!lesson || !currentStep) return;
    setPending(true);

    try {
      const correctId = getCorrectChoiceId(currentStep);
      const selected = getChoices(currentStep).find((choice) => choice.id === choiceId);
      const correcto = correctId === choiceId;

      await trackCrearAnswer({
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        fase: currentStep.crear?.fase ?? 'practica',
        correcto,
        rama: correcto ? 'correcto' : 'incorrecto',
        texto: selected?.texto ?? choiceId,
        score: correcto ? 1 : 0,
        checksum: lesson.checksum,
      });

      await advance(currentStep, resolveNextRef(currentStep, { rama: correcto ? 'correcto' : 'incorrecto', confianza: 1 }));
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitVerdict(verdictId: string, reason: string) {
    if (!lesson || !currentStep) return;
    setPending(true);

    try {
      const option = currentStep.crear?.verdictOptions?.find((candidate) => candidate.id === verdictId);
      const label = option?.label ?? verdictId;
      const text = `${label}: ${reason.trim()}`;
      setLastVerdict(text);

      await trackCrearAnswer({
        tallerId: lesson.id_taller,
        pasoId: getStepId(currentStep),
        fase: currentStep.crear?.fase ?? 'post',
        correcto: true,
        rama: verdictId,
        texto: text,
        score: 1,
        checksum: lesson.checksum,
      });

      await advance(currentStep, currentStep.crear?.nextRefId ?? null);
    } finally {
      setPending(false);
    }
  }

  if (!lessonId || !lesson || !currentStep) {
    return (
      <main className={styles.pageShell}>
        <MysteryPicker disabled={loading} onSelect={handleSelect} />
        {loading ? (
          <div className={styles.statusLine} role="status">
            <Loader2 size={18} />
            Cargando lección…
          </div>
        ) : null}
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </main>
    );
  }

  if (!isCrearLessonId(lesson.id_taller)) {
    return (
      <main className={styles.pageShell}>
        <p className={styles.errorText}>Esta lección no pertenece al flujo CREAR.</p>
      </main>
    );
  }

  if (completed) {
    return (
      <main className={styles.pageShell}>
        <VerdictCard lessonTitle={lesson.titulo} verdict={lastVerdict} onRestart={resetToPicker} />
      </main>
    );
  }

  const mode = getInputMode(currentStep);
  const prompt = getPrompt(currentStep);
  const audio = currentStep.crear?.audio;
  const hideComposerPrompt = Boolean(audio);
  const isHypothesisStep = getStepId(currentStep) === 'hipotesis';
  const pageClassName = `${styles.pageShell} ${isHypothesisStep ? styles.hypothesisPage : ''}`;
  const stepPanelClassName = `${styles.stepPanel} ${isHypothesisStep ? styles.hypothesisStepPanel : ''}`;
  const contentPaneClassName = `${styles.contentPane} ${isHypothesisStep ? styles.hypothesisContentPane : ''}`;
  const responsePaneClassName = `${styles.responsePane} ${isHypothesisStep ? styles.hypothesisResponsePane : ''}`;

  return (
    <main className={pageClassName}>
      <section className={styles.lessonShell} aria-live="polite">
        <header className={styles.screenBar}>
          <button className={styles.closeButton} type="button" onClick={resetToPicker} aria-label="Volver a misterios">
            <X size={22} />
          </button>
          <p className={styles.screenTitle}>{isHypothesisStep ? 'Celestea' : currentStep.titulo_paso}</p>
          {isHypothesisStep ? (
            <span className={styles.screenProgress} aria-label={`Paso ${currentIndex + 1} de ${lesson.pasos.length}`}>
              {currentIndex + 1} / {lesson.pasos.length}
            </span>
          ) : (
            <span className={styles.screenBarSlot} aria-hidden="true" />
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={stepPanelClassName}
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            key={getStepId(currentStep)}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className={contentPaneClassName}>
              <p className={styles.stepEyebrow}>{currentStep.titulo_paso}</p>
              <h1>{lesson.titulo}</h1>
              {audio ? (
                <VoiceLine audio={audio} autoplayKey={getStepId(currentStep)} variant={isHypothesisStep ? 'card' : 'orb'} />
              ) : null}
              {!audio && mode === 'none' ? <p className={styles.fallbackCopy}>{prompt}</p> : null}
            </div>

            <div className={responsePaneClassName}>
              <AnswerComposer
                mode={mode}
                prompt={prompt}
                placeholder={getPlaceholder(currentStep, 'Escribe el caso nuevo con tus palabras.')}
                choices={getChoices(currentStep)}
                verdictOptions={currentStep.crear?.verdictOptions}
                hidePrompt={hideComposerPrompt}
                variant={isHypothesisStep ? 'hypothesis' : 'default'}
                pending={pending}
                onContinue={handleContinue}
                onSubmitText={handleSubmitText}
                onSubmitChoice={handleSubmitChoice}
                onSubmitVerdict={handleSubmitVerdict}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}
