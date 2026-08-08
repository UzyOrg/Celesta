"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { seededShuffle } from '@/lib/crear/shuffle';
import type {
  CrearPrecheck,
  CrearPrecheckAttempt,
  CrearPrecheckItem,
  CrearResponseCategory,
} from '@/lib/crear/types';
import styles from './CinematicPrecheck.module.css';

export type CinematicPrecheckPreviewState =
  | 'default'
  | 'hover'
  | 'focus'
  | 'active'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'success';

interface CinematicPrecheckProps {
  config: CrearPrecheck;
  pending: boolean;
  /** Seeds the per-learner item order; stable for the life of a study. */
  orderSeed?: string;
  initialAnswers?: Record<string, CrearResponseCategory>;
  onAttempt: (attempt: CrearPrecheckAttempt) => void;
  onComplete: () => void;
  /** Development-only prop used by the adjacent Hallmark state preview. */
  previewState?: CinematicPrecheckPreviewState;
}

function firstUnansweredIndex(
  items: readonly CrearPrecheckItem[],
  answers: Record<string, CrearResponseCategory>
): number {
  const index = items.findIndex((item) => !answers[item.id]);
  return index === -1 ? items.length : index;
}

export function CinematicPrecheck({
  config,
  pending,
  orderSeed = '',
  initialAnswers = {},
  onAttempt,
  onComplete,
  previewState,
}: CinematicPrecheckProps) {
  const prefersReducedMotion = useReducedMotion();
  /**
   * Items rotate per learner; the three certainty options never do. The
   * options are a scale — casi seguro, podría ser, no puede ser — and
   * scrambling a scale costs more in reading effort than it buys in
   * counterbalancing. The diagonal lived in the item order, so that is what
   * moves.
   */
  const items = useMemo(
    () => seededShuffle(config.items, `${orderSeed}:precheck`),
    [config.items, orderSeed]
  );
  const shownOrder = useMemo(() => items.map((item) => item.id), [items]);
  const [answers, setAnswers] = useState<Record<string, CrearResponseCategory>>(initialAnswers);
  const [activeIndex, setActiveIndex] = useState(() => firstUnansweredIndex(items, initialAnswers));
  const activeStartedAtRef = useRef<number | null>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const shouldFocusQuestionRef = useRef(false);
  const advanceLockRef = useRef(false);

  const activeItem = items[activeIndex];
  const selectedCategory = activeItem ? answers[activeItem.id] : undefined;
  const completedCount = Math.min(activeIndex, items.length);
  const isComplete = !activeItem;
  const isPreviewError = previewState === 'error';
  const isPreviewSuccess = previewState === 'success';
  const isDisabled = pending || previewState === 'disabled' || previewState === 'loading';
  const visualState = pending ? 'loading' : previewState;
  const actionLabel = isComplete
    ? (config.completeLabel ?? 'Ver la comparación')
    : activeIndex === items.length - 1
      ? (config.completeLabel ?? 'Ver la comparación')
      : 'Siguiente';

  const activeQuestionId = useMemo(
    () => activeItem ? `precheck-question-${activeItem.id}` : 'precheck-complete',
    [activeItem]
  );

  useEffect(() => {
    if (activeItem) activeStartedAtRef.current = Date.now();
  }, [activeItem?.id]);

  useEffect(() => {
    if (!shouldFocusQuestionRef.current) return;
    shouldFocusQuestionRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      questionRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex]);

  function continuePrecheck(): void {
    if (advanceLockRef.current || isDisabled) return;

    if (isComplete) {
      onComplete();
      return;
    }
    if (!activeItem || !selectedCategory) return;

    advanceLockRef.current = true;
    const correct = selectedCategory === activeItem.correctCategory;
    onAttempt({
      itemId: activeItem.id,
      category: selectedCategory,
      correct,
      ...(activeItem.cueFrame ? { cueFrame: activeItem.cueFrame } : {}),
      shownOrder,
      latencyMs: activeStartedAtRef.current === null
        ? undefined
        : Math.max(0, Date.now() - activeStartedAtRef.current),
    });

    if (activeIndex === items.length - 1) {
      onComplete();
      return;
    }

    shouldFocusQuestionRef.current = true;
    setActiveIndex((index) => index + 1);
    window.requestAnimationFrame(() => {
      advanceLockRef.current = false;
    });
  }

  return (
    <section
      className={styles.precheck}
      data-preview-state={visualState}
      aria-busy={pending}
      aria-label="Decisiones iniciales sobre las pistas"
    >
      <div className={styles.precheckTop}>
        <div className={styles.progressRow} aria-live="polite">
          <p>
            {isComplete
              ? `${items.length} de ${items.length}`
              : `${activeIndex + 1} de ${items.length}`}
          </p>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          {items.map((item, index) => (
            <span
              data-state={index < completedCount ? 'complete' : index === activeIndex ? 'active' : 'upcoming'}
              key={item.id}
            />
          ))}
        </div>

        <div className={styles.questionViewport}>
          <AnimatePresence initial={false} mode="wait">
            {activeItem ? (
              <motion.div
                className={styles.question}
                data-testid="precheck-item"
                data-item-id={activeItem.id}
                key={activeItem.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className={styles.clue}>{activeItem.clue}</p>
                <p className={styles.prompt} id={activeQuestionId} ref={questionRef} tabIndex={-1}>
                  {activeItem.prompt}
                </p>
              </motion.div>
            ) : (
              <motion.p
                className={styles.completeNote}
                id={activeQuestionId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.1 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                Tus decisiones ya están guardadas. Ahora mira cómo se expresa esa diferencia en inglés.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {activeItem ? (
        <div className={styles.choiceStack} role="radiogroup" aria-labelledby={activeQuestionId}>
          {config.options.map((option) => {
            const selected = selectedCategory === option.id;
            return (
              <label
                className={styles.choice}
                data-selected={selected ? 'true' : 'false'}
                key={option.id}
              >
                <input
                  checked={selected}
                  className={styles.choiceNative}
                  disabled={isDisabled}
                  name={`celestea-precheck-${activeItem.id}`}
                  onChange={() => setAnswers((current) => ({ ...current, [activeItem.id]: option.id }))}
                  type="radio"
                  value={option.id}
                />
                <span className={styles.choiceIndicator} aria-hidden="true">
                  {selected ? <Check size={15} strokeWidth={2.7} /> : null}
                </span>
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {isPreviewError ? (
        <p className={styles.statusMessage} role="alert">
          No se pudo guardar esta decisión. Inténtalo de nuevo.
        </p>
      ) : null}
      {isPreviewSuccess ? (
        <p className={styles.statusMessage} data-tone="success">
          La decisión quedó guardada.
        </p>
      ) : null}

      <button
        className={styles.primaryAction}
        disabled={Boolean(activeItem && !selectedCategory) || isDisabled}
        type="button"
        onClick={continuePrecheck}
      >
        {pending || previewState === 'loading' ? (
          <>
            <Loader2 className={styles.thinkingIcon} size={18} />
            <span>Guardando…</span>
          </>
        ) : (
          <>
            <span>{actionLabel}</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </section>
  );
}
