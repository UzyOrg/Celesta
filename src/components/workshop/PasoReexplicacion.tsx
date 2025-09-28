"use client";
import React, { useRef, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';

type Props = {
  step: Extract<Paso, { tipo_paso: 'reexplicacion' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function PasoReexplicacion({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft }: Props) {
  const cfg = step.reexplicacion;
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const minWords = typeof cfg.min_palabras === 'number' ? Math.max(0, cfg.min_palabras) : 0;

  const handleSubmit = () => {
    if (minWords > 0 && wordCount(text) < minWords) {
      setFeedback(`Escribe al menos ${minWords} palabra(s).`);
      setTimeout(() => textareaRef.current?.focus(), 0);
      return;
    }
    setFeedback('Respuesta registrada.');
    onComplete({
      success: true,
      score: step.puntaje ?? 1,
      pistasUsadas,
      explicacionLongitud: text.trim().length,
      raw: { text },
    });
  };

  const askHint = () => {
    const pista = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint?.(costo);
  };

  const nextHintCost = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1;
  const canAskHint =
    !!step.pistas &&
    step.pistas.length > 0 &&
    !disabledInputs &&
    (step.pistas.length > pistasUsadas) &&
    (nextHintCost <= (starsLeft ?? 0));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <div className="p-3 rounded bg-black/20 border border-neutral-800 whitespace-pre-wrap">
        {cfg.consigna}
      </div>

      <textarea
        ref={textareaRef}
        className="w-full p-2 rounded bg-black/20 border border-neutral-800"
        placeholder={cfg.placeholder ?? 'Reexplica con tus palabras...'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!disabledInputs}
      />

      {feedback && <div className="p-2 rounded bg-black/30 border border-neutral-800">{feedback}</div>}

      {step.pistas && pistasUsadas > 0 && (
        <div className="p-2 rounded bg-black/30 border border-neutral-800 space-y-1">
          {step.pistas.slice(0, pistasUsadas).map((p, i) => (
            <div key={i} className="text-sm">
              <strong>Pista {i + 1}:</strong> {p.texto}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!!disabledInputs}
        >
          Enviar
        </button>
        {step.pistas && step.pistas.length > 0 && (
          <button
            type="button"
            className="px-4 py-2 bg-neutral-800 text-white rounded hover:opacity-90 disabled:opacity-50"
            onClick={askHint}
            disabled={!canAskHint}
          >
            {`Pedir pista (-${nextHintCost}⭐)`}
          </button>
        )}
      </div>
    </div>
  );
}