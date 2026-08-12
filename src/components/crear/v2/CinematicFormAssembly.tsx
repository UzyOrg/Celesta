"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  evaluateCrearFormAssembly,
} from '@/lib/crear/formAssembly';
import { seededShuffle } from '@/lib/crear/shuffle';
import type {
  CrearFormAssembly,
  CrearFormAssemblyAttempt,
} from '@/lib/crear/types';
import shellStyles from './CinematicEnglishPlayer.hallmark.module.css';
import styles from './CinematicFormAssembly.module.css';

interface CinematicFormAssemblyProps {
  config: CrearFormAssembly;
  pending: boolean;
  orderSeed: string;
  initialAttempt: number;
  initialCompleted: boolean;
  onAttempt: (attempt: CrearFormAssemblyAttempt) => void;
  onComplete: () => void;
}

function filledTokenIds(selected: readonly (string | null)[]): string[] | null {
  if (selected.some((tokenId) => tokenId === null)) return null;
  return selected.filter((tokenId): tokenId is string => tokenId !== null);
}

export function CinematicFormAssembly({
  config,
  pending,
  orderSeed,
  initialAttempt,
  initialCompleted,
  onAttempt,
  onComplete,
}: CinematicFormAssemblyProps) {
  const prefersReducedMotion = useReducedMotion();
  const [selected, setSelected] = useState<Array<string | null>>(() =>
    initialCompleted
      ? [...config.correctSequence]
      : Array.from({ length: config.slotCount }, () => null)
  );
  const [feedback, setFeedback] = useState(() =>
    initialCompleted ? config.success : null
  );
  const [completed, setCompleted] = useState(initialCompleted);
  const attemptCountRef = useRef(initialAttempt);
  const attemptStartedAtRef = useRef(Date.now());
  const shownTokens = useMemo(
    () => seededShuffle(config.tokens, `${orderSeed}:${config.tokens.map((token) => token.id).join('-')}`),
    [config.tokens, orderSeed]
  );
  const selectedIds = filledTokenIds(selected);

  function addToken(tokenId: string): void {
    if (pending || completed || selected.includes(tokenId)) return;
    const emptyIndex = selected.findIndex((candidate) => candidate === null);
    if (emptyIndex === -1) return;
    setSelected((current) => current.map((candidate, index) =>
      index === emptyIndex ? tokenId : candidate
    ));
    setFeedback(null);
  }

  function removeToken(slotIndex: number): void {
    if (pending || completed || selected[slotIndex] === null) return;
    setSelected((current) => current.map((candidate, index) =>
      index === slotIndex ? null : candidate
    ));
    setFeedback(null);
  }

  function handlePrimaryAction(): void {
    if (pending) return;
    if (completed) {
      onComplete();
      return;
    }
    if (!selectedIds) return;

    const evaluation = evaluateCrearFormAssembly(config, selectedIds);
    const attemptNumber = attemptCountRef.current + 1;
    const latencyMs = Math.max(0, Date.now() - attemptStartedAtRef.current);
    attemptCountRef.current = attemptNumber;
    setFeedback(evaluation.feedback);
    setCompleted(evaluation.correct);
    onAttempt({
      selectedTokenIds: selectedIds,
      shownOrder: shownTokens.map((token) => token.id),
      branch: evaluation.branch,
      correct: evaluation.correct,
      text: evaluation.text,
      attempt: attemptNumber,
      latencyMs,
    });
    if (!evaluation.correct) attemptStartedAtRef.current = Date.now();
  }

  return (
    <section
      className={styles.assembly}
      aria-busy={pending}
      aria-label="Construcción guiada de la frase"
    >
      <div className={styles.task}>
        <p className={styles.instruction} id="form-assembly-instruction">
          {config.instruction}
        </p>

        <div
          className={styles.sentence}
          aria-labelledby="form-assembly-instruction"
          data-correct={completed ? 'true' : 'false'}
          lang="en-US"
          role="group"
        >
          <span className={styles.sentenceFixed}>{config.sentenceStart}</span>
          <div className={styles.slotRow}>
            {selected.map((tokenId, slotIndex) => {
              const token = config.tokens.find((candidate) => candidate.id === tokenId);
              return (
                <button
                  className={styles.slot}
                  data-filled={token ? 'true' : 'false'}
                  disabled={pending || completed || !token}
                  key={slotIndex}
                  type="button"
                  onClick={() => removeToken(slotIndex)}
                  aria-label={token
                    ? `Hueco ${slotIndex + 1} completado con ${token.label}. Toca para devolver la pieza`
                    : `Hueco ${slotIndex + 1} vacío`}
                >
                  <AnimatePresence initial={false} mode="wait">
                    {token ? (
                      <motion.span
                        key={token.id}
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0.1 : 0.18 }}
                      >
                        {token.label}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          <span className={styles.sentenceFixed}>{config.sentenceEnd}</span>
        </div>

        <div className={styles.bank}>
          <p>Piezas disponibles</p>
          <div className={styles.tokenGrid} role="group" aria-label="Piezas para completar la oración">
            {shownTokens.map((token) => {
              const used = selected.includes(token.id);
              return (
                <div className={styles.tokenSlot} key={token.id}>
                  <motion.button
                    className={styles.token}
                    data-used={used ? 'true' : 'false'}
                    disabled={pending || completed || used || selectedIds !== null}
                    aria-hidden={used ? true : undefined}
                    tabIndex={used ? -1 : undefined}
                    type="button"
                    onClick={() => addToken(token.id)}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    aria-label={`Colocar ${token.label} en el siguiente hueco`}
                  >
                    {token.label}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.feedbackRegion} aria-live="polite" role={feedback ? 'status' : undefined}>
        {feedback ? (
          <motion.div
            className={styles.feedback}
            data-correct={completed ? 'true' : 'false'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.2 }}
          >
            <span aria-hidden="true">
              {completed ? <Check size={18} /> : <RotateCcw size={18} />}
            </span>
            <span>
              <strong>{feedback.title}</strong>
              <small>{feedback.body}</small>
            </span>
          </motion.div>
        ) : null}
      </div>

      <button
        className={`${shellStyles.primaryAction} ${styles.primaryAction}`}
        disabled={pending || (!completed && selectedIds === null)}
        type="button"
        onClick={handlePrimaryAction}
      >
        {pending ? (
          <>
            <Loader2 className={shellStyles.thinkingIcon} size={18} />
            <span>Guardando…</span>
          </>
        ) : (
          <>
            <span>{completed ? config.continueLabel : config.actionLabel}</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </section>
  );
}
