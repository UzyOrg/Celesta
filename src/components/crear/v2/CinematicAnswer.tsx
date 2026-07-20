"use client";

import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  CREAR_MAX_ANSWER_LENGTH,
  CREAR_MAX_RESPONSE_PART_LENGTH,
  type CrearInputMode,
  type CrearResponsePart,
  type CrearResponsePartAnswer,
} from '@/lib/crear/types';
import type { ChoiceOption } from '../AnswerComposer';
import styles from './CinematicEnglishPlayer.module.css';

interface CinematicAnswerProps {
  mode: CrearInputMode;
  prompt: string;
  placeholder?: string;
  choices?: ChoiceOption[];
  pending: boolean;
  minChars?: number;
  responseParts?: CrearResponsePart[];
  choiceLanguage?: 'es-MX' | 'en-US';
  continueLabel?: string;
  submitLabel?: string;
  onContinue: () => void;
  onSubmitText: (text: string, parts?: CrearResponsePartAnswer[]) => void;
  onSubmitChoice: (choiceId: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

function SentencePrompt({ prompt }: { prompt: string }) {
  const blankMarker = '___';
  const markerIndex = prompt.indexOf(blankMarker);
  if (markerIndex === -1) return <>{prompt}</>;

  const before = prompt.slice(0, markerIndex).trimEnd();
  const after = prompt.slice(markerIndex + blankMarker.length).trimStart();
  return (
    <>
      {before}{' '}
      <span className={styles.sentenceBlank} aria-label="espacio en blanco" role="img" />
      {' '}{after}
    </>
  );
}

export function CinematicAnswer({
  mode,
  prompt,
  placeholder,
  choices = [],
  pending,
  minChars = 2,
  responseParts = [],
  choiceLanguage = 'es-MX',
  continueLabel = 'Continuar',
  submitLabel = 'Enviar respuesta',
  onContinue,
  onSubmitText,
  onSubmitChoice,
  onFocusChange,
}: CinematicAnswerProps) {
  const [text, setText] = useState('');
  const [choiceId, setChoiceId] = useState('');
  const [partIndex, setPartIndex] = useState(0);
  const [partAnswers, setPartAnswers] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const choiceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setText('');
    setChoiceId('');
    setPartIndex(0);
    setPartAnswers({});
  }, [prompt, mode]);

  useEffect(() => {
    resizeTextarea();
  }, [partIndex, responseParts.length]);

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
    const accessiblePrompt = prompt.replace('___', 'espacio en blanco');
    return (
      <div className={styles.responseDock} aria-busy={pending}>
        <p className={styles.responsePrompt} lang="es-MX"><SentencePrompt prompt={prompt} /></p>
        <div className={styles.choiceStack} role="radiogroup" aria-label={accessiblePrompt}>
          {choices.map((choice, index) => {
            const selected = choice.id === choiceId;
            return (
              <label
                className={styles.choiceAction}
                data-selected={selected ? 'true' : 'false'}
                key={choice.id}
                lang={choiceLanguage}
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
              <span>Revisando…</span>
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

  if (mode === 'text' && responseParts.length > 0) {
    const activePart = responseParts[partIndex] ?? responseParts[0];
    const activeText = partAnswers[activePart.id] ?? '';
    const isLastPart = partIndex === responseParts.length - 1;
    const activeMinimum = activePart.minChars ?? minChars;

    const saveActivePart = (value: string): Record<string, string> => {
      const nextAnswers = { ...partAnswers, [activePart.id]: value };
      setPartAnswers(nextAnswers);
      return nextAnswers;
    };

    const moveToPart = (nextIndex: number): void => {
      saveActivePart(activeText);
      setPartIndex(nextIndex);
      window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
    };

    const handleStructuredAction = (): void => {
      const nextAnswers = saveActivePart(activeText.trim());
      if (!isLastPart) {
        setPartIndex(partIndex + 1);
        window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
        return;
      }

      const parts = responseParts.map((part) => ({
        categoria: part.categoria,
        texto: (nextAnswers[part.id] ?? '').trim(),
      }));
      onSubmitText(parts.map((part) => part.texto).join('\n'), parts);
    };

    return (
      <div className={styles.responseDock} aria-busy={pending}>
        <div className={styles.structuredHeader}>
          <div>
            <small>{partIndex + 1} de {responseParts.length}</small>
            <strong>{activePart.label}</strong>
          </div>
        </div>

        <div className={styles.partProgress} aria-hidden="true">
          {responseParts.map((part, index) => (
            <span
              data-state={index === partIndex ? 'active' : index < partIndex ? 'complete' : 'upcoming'}
              key={part.id}
            />
          ))}
        </div>

        <label className={styles.responsePrompt} htmlFor="celestea-cinematic-answer">
          {activePart.prompt}
        </label>
        <div className={styles.textareaFrame}>
          <textarea
            ref={textareaRef}
            id="celestea-cinematic-answer"
            className={styles.cinematicTextarea}
            value={activeText}
            onChange={(event) => {
              saveActivePart(event.target.value);
              resizeTextarea();
            }}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={activePart.placeholder || 'Escribe tu conclusión en inglés…'}
            rows={3}
            maxLength={CREAR_MAX_RESPONSE_PART_LENGTH}
            lang="en-US"
            spellCheck
          />
        </div>

        <div className={styles.structuredActions}>
          {partIndex > 0 ? (
            <button
              className={styles.backPartAction}
              disabled={pending}
              type="button"
              onClick={() => moveToPart(partIndex - 1)}
            >
              <ArrowLeft size={16} />
              Anterior
            </button>
          ) : <span />}
          <button
            className={styles.primaryAction}
            disabled={activeText.trim().length < activeMinimum || pending}
            type="button"
            onClick={handleStructuredAction}
          >
            {pending ? (
              <>
                <Sparkles className={styles.thinkingIcon} size={18} />
                <span>Leyendo tus ideas…</span>
              </>
            ) : (
              <>
                <span>{isLastPart ? submitLabel : 'Siguiente conclusión'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.responseDock} aria-busy={pending}>
      <label className={styles.responsePrompt} htmlFor="celestea-cinematic-answer" lang="es-MX">
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
          placeholder={placeholder ?? 'Escribe una oración breve en inglés…'}
          rows={4}
          maxLength={CREAR_MAX_ANSWER_LENGTH}
          lang="en-US"
          spellCheck
        />
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
