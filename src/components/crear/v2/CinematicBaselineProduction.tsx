"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  CREAR_MAX_ANSWER_LENGTH,
  type CrearBaselineGate,
  type CrearBaselineProduction,
} from '@/lib/crear/types';
import styles from './CinematicBaselineProduction.module.css';

interface CinematicBaselineProductionProps {
  config: CrearBaselineProduction;
  pending: boolean;
  placeholder?: string;
  onGate: (answer: CrearBaselineGate) => void;
  onSubmit: (text: string, gate: CrearBaselineGate, skipped: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
}

/**
 * Two measurements on one screen: what the learner believes they can write,
 * and what they actually write, before any instruction.
 *
 * The gate never blocks the field. Declaring "todavía no" softens the frame of
 * a blank English box on the third screen, but a pre-instruction attempt is
 * exactly what makes the later comparison interpretable — and an attempted,
 * failed retrieval improves what follows. Answering the gate is therefore a
 * reframe, not a door.
 *
 * Nothing below the gate exists until the gate is answered. A second negative
 * label ("todavía no sé cómo decirlo") sitting under the gate's own "todavía
 * no" made the belief measure and the behaviour measure read as the same
 * question asked twice, so the skip button was folded into the primary action.
 *
 * After "sí" the primary action requires text. Offering "continuar sin
 * escribir" to a learner who just declared they can write the sentence prices
 * the declaration at zero and collapses the two measures back into one: the
 * belief stops predicting anything because nothing follows from it. The dead
 * affordance this creates is bounded, because the escape is the gate itself —
 * both gate buttons stay live, and moving to "todavía no" is a real answer to
 * a real question, recorded as a second gate event. So the learner is never
 * trapped; they are asked to be consistent, or to change their mind on the
 * record. After "todavía no" the field stays open and empty submission remains
 * a measured behaviour, because a pre-instruction attempt is what makes the
 * final comparison interpretable and an attempted, failed retrieval improves
 * what follows.
 */
export function CinematicBaselineProduction({
  config,
  pending,
  placeholder,
  onGate,
  onSubmit,
  onFocusChange,
}: CinematicBaselineProductionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [gate, setGate] = useState<CrearBaselineGate | null>(null);
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusAttemptRef = useRef(false);

  useEffect(() => {
    if (gate === null || !shouldFocusAttemptRef.current) return;
    shouldFocusAttemptRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [gate]);

  function answerGate(answer: CrearBaselineGate): void {
    if (pending) return;
    /**
     * A change of mind is a real second answer and is reported. Pressing the
     * button you already chose is not: on a phone that is a double tap, and it
     * used to emit a duplicate gate event and restart the attempt clock.
     */
    if (gate === answer) return;
    shouldFocusAttemptRef.current = gate === null;
    setGate(answer);
    onGate(answer);
  }

  const trimmed = text.trim();
  const wroteSomething = trimmed.length > 0;
  // "Sí" is a commitment; the primary action holds it. "Todavía no" leaves the
  // field open and empty submission stays a measured behaviour.
  const requiresText = gate === 'yes';
  const blocked = requiresText && !wroteSomething;

  function submit(): void {
    if (pending || gate === null || blocked) return;
    onSubmit(trimmed, gate, !wroteSomething);
  }

  return (
    <section
      className={styles.baseline}
      aria-busy={pending}
      aria-label="Intento inicial en inglés"
    >
      <div className={styles.gateBlock}>
        <p className={styles.gatePrompt} id="baseline-gate-prompt">
          {config.gatePrompt}
        </p>
        <div className={styles.gateOptions} aria-labelledby="baseline-gate-prompt" role="group">
          {([
            ['yes', config.gateYesLabel],
            ['no', config.gateNoLabel],
          ] as const).map(([answer, label]) => (
            <button
              aria-pressed={gate === answer}
              className={styles.gateOption}
              data-selected={gate === answer ? 'true' : 'false'}
              disabled={pending}
              key={answer}
              type="button"
              onClick={() => answerGate(answer)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {gate === null ? null : (
          <motion.div
            className={styles.attemptStage}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            key="baseline-attempt"
          >
            <div className={styles.attemptBlock}>
              <label className={styles.attemptPrompt} htmlFor="celestea-baseline-attempt">
                {gate === 'no' ? config.attemptPromptNo ?? config.attemptPrompt : config.attemptPrompt}
              </label>
              <textarea
                className={styles.attemptField}
                disabled={pending}
                id="celestea-baseline-attempt"
                lang="en-US"
                maxLength={CREAR_MAX_ANSWER_LENGTH}
                onBlur={() => onFocusChange?.(false)}
                onChange={(event) => setText(event.target.value)}
                onFocus={() => onFocusChange?.(true)}
                placeholder={placeholder}
                ref={textareaRef}
                rows={3}
                spellCheck
                value={text}
              />
            </div>

            <div className={styles.actions}>
              {blocked && !pending ? (
                <p className={styles.actionHint} id="celestea-baseline-hint">
                  {config.blockedHint ?? `${config.gateNoLabel}, también es una respuesta.`}
                </p>
              ) : null}
              <button
                aria-describedby={blocked && !pending ? 'celestea-baseline-hint' : undefined}
                className={styles.primaryAction}
                disabled={pending || blocked}
                type="button"
                onClick={submit}
              >
                {pending ? (
                  <>
                    <Loader2 className={styles.thinkingIcon} size={18} />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <>
                    <span>
                      {requiresText || wroteSomething
                        ? config.submitLabel
                        : config.emptySubmitLabel}
                    </span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
