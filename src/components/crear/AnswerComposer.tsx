"use client";

import { ArrowRight, Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CrearInputMode, CrearVerdictOption } from '@/lib/crear/types';
import styles from './CrearLessonPlayer.module.css';

export interface ChoiceOption {
  id: string;
  texto: string;
}

interface AnswerComposerProps {
  mode: CrearInputMode;
  prompt: string;
  placeholder?: string;
  choices?: ChoiceOption[];
  verdictOptions?: CrearVerdictOption[];
  hidePrompt?: boolean;
  variant?: 'default' | 'hypothesis';
  pending?: boolean;
  onContinue: () => void;
  onSubmitText: (text: string) => void;
  onSubmitChoice: (choiceId: string) => void;
  onSubmitVerdict: (verdictId: string, reason: string) => void;
}

export function AnswerComposer({
  mode,
  prompt,
  placeholder,
  choices = [],
  verdictOptions = [],
  hidePrompt = false,
  variant = 'default',
  pending = false,
  onContinue,
  onSubmitText,
  onSubmitChoice,
  onSubmitVerdict,
}: AnswerComposerProps) {
  const firstVerdictId = verdictOptions[0]?.id ?? '';
  const [text, setText] = useState('');
  const [choiceId, setChoiceId] = useState('');
  const [verdictId, setVerdictId] = useState(firstVerdictId);
  const [reason, setReason] = useState('');
  const answerClassName = `${styles.answerBlock} ${variant === 'hypothesis' ? styles.hypothesisAnswerBlock : ''}`;
  const textareaClassName = `${styles.textarea} ${variant === 'hypothesis' ? styles.hypothesisTextarea : ''}`;
  const actionRowClassName = `${styles.actionRow} ${variant === 'hypothesis' ? styles.hypothesisActionRow : ''}`;
  const primaryButtonClassName = `${styles.primaryButton} ${variant === 'hypothesis' ? styles.hypothesisPrimaryButton : ''}`;

  useEffect(() => {
    setText('');
    setChoiceId('');
    setVerdictId(firstVerdictId);
    setReason('');
  }, [prompt, mode, firstVerdictId]);

  if (mode === 'none') {
    return (
      <div className={styles.actionRow}>
        <button className={styles.primaryButton} disabled={pending} type="button" onClick={onContinue}>
          Continuar
          <Send size={17} />
        </button>
      </div>
    );
  }

  if (mode === 'choice') {
    return (
      <div className={styles.answerBlock}>
        <p className={hidePrompt ? styles.srOnly : styles.prompt}>{prompt}</p>
        <div className={styles.choiceGrid} role="radiogroup" aria-label={prompt}>
          {choices.map((choice) => (
            <button
              className={`${styles.choiceButton} ${choiceId === choice.id ? styles.choiceSelected : ''}`}
              key={choice.id}
              onClick={() => setChoiceId(choice.id)}
              type="button"
              role="radio"
              aria-checked={choiceId === choice.id}
            >
              <span className={styles.choiceMark} aria-hidden="true">
                {choiceId === choice.id ? <Check size={15} /> : null}
              </span>
              <span>{choice.texto}</span>
            </button>
          ))}
        </div>
        <div className={styles.actionRow}>
          <button
            className={styles.primaryButton}
            disabled={!choiceId || pending}
            type="button"
            onClick={() => onSubmitChoice(choiceId)}
          >
            Responder
            <Send size={17} />
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'verdict') {
    return (
      <div className={styles.answerBlock}>
        <p className={hidePrompt ? styles.srOnly : styles.prompt}>{prompt}</p>
        <div className={styles.segmented} role="radiogroup" aria-label="Veredicto">
          {verdictOptions.map((option) => (
            <button
              className={`${styles.segmentButton} ${verdictId === option.id ? styles.segmentSelected : ''}`}
              key={option.id}
              onClick={() => setVerdictId(option.id)}
              type="button"
              role="radio"
              aria-checked={verdictId === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
        <textarea
          className={styles.textarea}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={placeholder ?? 'Escribe tu razón.'}
          rows={4}
          aria-label={`${prompt}. Razón`}
        />
        <div className={styles.actionRow}>
          <button
            className={styles.primaryButton}
            disabled={!verdictId || reason.trim().length < 2 || pending}
            type="button"
            onClick={() => onSubmitVerdict(verdictId, reason)}
          >
            Guardar tarjeta
            <Send size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={answerClassName}>
      <label className={hidePrompt ? styles.srOnly : styles.prompt} htmlFor="crear-answer">
        {prompt}
      </label>
      <textarea
        id="crear-answer"
        className={textareaClassName}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder ?? 'Escribe con tus palabras.'}
        rows={4}
      />
      <div className={actionRowClassName}>
        <button
          className={primaryButtonClassName}
          disabled={text.trim().length < 2 || pending}
          type="button"
          onClick={() => onSubmitText(text)}
        >
          Enviar
          {variant === 'hypothesis' ? <ArrowRight size={20} /> : <Send size={17} />}
        </button>
      </div>
    </div>
  );
}
