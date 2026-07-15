"use client";

import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CREAR_MAX_ANSWER_LENGTH, type CrearInputMode } from '@/lib/crear/types';
import type { ChoiceOption } from '../AnswerComposer';
import styles from './CinematicEnglishPlayer.module.css';

interface CinematicAnswerProps {
  mode: CrearInputMode;
  prompt: string;
  placeholder?: string;
  choices?: ChoiceOption[];
  pending: boolean;
  minChars?: number;
  continueLabel?: string;
  submitLabel?: string;
  onContinue: () => void;
  onSubmitText: (text: string) => void;
  onSubmitChoice: (choiceId: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

export function CinematicAnswer({
  mode,
  prompt,
  placeholder,
  choices = [],
  pending,
  minChars = 2,
  continueLabel = 'Continuar',
  submitLabel = 'Enviar idea',
  onContinue,
  onSubmitText,
  onSubmitChoice,
  onFocusChange,
}: CinematicAnswerProps) {
  const [text, setText] = useState('');
  const [choiceId, setChoiceId] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const choiceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setText('');
    setChoiceId('');
  }, [prompt, mode]);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 136), 260)}px`;
  }

  function handleChoiceKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if ((!forward && !backward) || choices.length === 0) return;

    event.preventDefault();
    const nextIndex = (index + (forward ? 1 : -1) + choices.length) % choices.length;
    const nextChoice = choices[nextIndex];
    if (!nextChoice) return;
    setChoiceId(nextChoice.id);
    choiceRefs.current[nextChoice.id]?.focus();
  }

  if (mode === 'none') {
    return (
      <div className={styles.actionDock}>
        <button className={styles.primaryAction} disabled={pending} type="button" onClick={onContinue}>
          <span>{continueLabel}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  if (mode === 'choice') {
    return (
      <div className={styles.responseDock} aria-busy={pending}>
        <p className={styles.responsePrompt} lang="en-US">{prompt}</p>
        <div className={styles.choiceStack} role="radiogroup" aria-label={prompt}>
          {choices.map((choice, index) => {
            const selected = choice.id === choiceId;
            return (
              <label
                className={styles.choiceAction}
                data-selected={selected ? 'true' : 'false'}
                key={choice.id}
                lang="en-US"
              >
                <input
                  ref={(element) => {
                    choiceRefs.current[choice.id] = element;
                  }}
                  className={styles.choiceNative}
                  type="radio"
                  name="celestea-cinematic-choice"
                  value={choice.id}
                  checked={selected}
                  disabled={pending}
                  onChange={() => setChoiceId(choice.id)}
                  onKeyDown={(event) => handleChoiceKeyDown(event, index)}
                />
                <span className={styles.choiceIndicator} aria-hidden="true">
                  {selected ? <Check size={15} strokeWidth={2.7} /> : null}
                </span>
                <span>{choice.texto}</span>
              </label>
            );
          })}
        </div>
        <button
          className={styles.primaryAction}
          disabled={!choiceId || pending}
          type="button"
          onClick={() => onSubmitChoice(choiceId)}
        >
          {pending ? (
            <>
              <Sparkles className={styles.thinkingIcon} size={18} />
              <span>Calibrando…</span>
            </>
          ) : (
            <>
              <span>Comprobar</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.responseDock} aria-busy={pending}>
      <label className={styles.responsePrompt} htmlFor="celestea-cinematic-answer" lang="en-US">
        {prompt}
      </label>
      <div className={styles.textareaFrame}>
        <textarea
          ref={textareaRef}
          id="celestea-cinematic-answer"
          className={styles.cinematicTextarea}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            resizeTextarea();
          }}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={placeholder ?? 'Write your answer in English…'}
          rows={4}
          maxLength={CREAR_MAX_ANSWER_LENGTH}
          lang="en-US"
          spellCheck
        />
        <span className={styles.inputHint}>
          English · tu primer intento queda guardado · {text.length}/{CREAR_MAX_ANSWER_LENGTH}
        </span>
      </div>
      <button
        className={styles.primaryAction}
        disabled={text.trim().length < minChars || pending}
        type="button"
        onClick={() => onSubmitText(text.trim())}
      >
        {pending ? (
          <>
            <Sparkles className={styles.thinkingIcon} size={18} />
            <span>Leyendo tu idea…</span>
          </>
        ) : (
          <>
            <span>{submitLabel}</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}
