"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';

type Props = {
  step: Extract<Paso, { tipo_paso: 'opcion_multiple' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

export default function PasoOpcionMultiple({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [explicacion, setExplicacion] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const firstRadioRef = useRef<HTMLInputElement | null>(null);
  const explicacionRef = useRef<HTMLTextAreaElement | null>(null);

  const onSubmit = () => {
    if (!selected) return;
    const isCorrect = selected === step.opcion_multiple.respuesta_correcta;
    setFeedback(
      isCorrect ? step.opcion_multiple.feedback_correcto : step.opcion_multiple.feedback_incorrecto
    );
    setLastWasCorrect(isCorrect);
    if (onUiFeedback) {
      onUiFeedback(isCorrect ? (step.opcion_multiple.feedback_correcto || '¡Correcto!') : (step.opcion_multiple.feedback_incorrecto || 'Inténtalo de nuevo.'), isCorrect ? 'success' : 'info');
    }
    const res = {
      success: isCorrect,
      score: isCorrect ? (step.puntaje ?? 1) : 0,
      pistasUsadas,
      explicacionLongitud: step.opcion_multiple.requiere_explicacion ? explicacion.length : undefined,
      raw: { selected, explicacion, feedbackText: isCorrect ? step.opcion_multiple.feedback_correcto : step.opcion_multiple.feedback_incorrecto },
    } as const;
    onComplete(res as any);
    if (!isCorrect) {
      // Focus to help retry UX
      setTimeout(() => {
        if (step.opcion_multiple.requiere_explicacion && explicacionRef.current) {
          explicacionRef.current.focus();
        } else {
          firstRadioRef.current?.focus();
        }
      }, 0);
    }
  };

  const askHint = () => {
    const pista = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint(costo);
  };

  // Expose imperative controller for immersive layout
  useEffect(() => {
    if (!exposeController) return;
    const nextHintCost = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1;
    const canAsk = !!step.pistas && (step.pistas.length > pistasUsadas) && (nextHintCost <= (starsLeft ?? 0)) && !disabledInputs;
    exposeController({
      submit: onSubmit,
      canSubmit: () => Boolean(selected) && !disabledInputs,
      canAskHint: () => canAsk,
      askHint: () => askHint(),
    });
  }, [exposeController, selected, disabledInputs, pistasUsadas, starsLeft, step]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <p className="text-neutral-200">{step.opcion_multiple.pregunta}</p>

      <div className="space-y-2">
        <div className="grid gap-2">
          {step.opcion_multiple.opciones.map((op, idx) => (
            <label key={op.id} className={`border rounded p-3 cursor-pointer ${selected === op.id ? 'border-lime' : 'border-neutral-800'}`}>
              <input
                type="radio"
                name={`op-${step.paso_numero}`}
                className="mr-2"
                checked={selected === op.id}
                onChange={() => setSelected(op.id)}
                disabled={!!disabledInputs}
                ref={idx === 0 ? firstRadioRef : undefined}
              />
              {op.texto}
            </label>
          ))}
        </div>
      </div>

      {step.opcion_multiple.requiere_explicacion && (
        <textarea
          className="w-full p-2 rounded bg-black/20 border border-neutral-800"
          placeholder="Explica tu razonamiento"
          value={explicacion}
          onChange={(e) => setExplicacion(e.target.value)}
          disabled={!!disabledInputs}
          ref={explicacionRef}
        />
      )}

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
      {lastWasCorrect === false && !disabledInputs && (
        <p className="text-sm text-neutral-300">Ajusta y vuelve a Probar</p>
      )}

      {!immersive && (
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
            onClick={onSubmit}
            disabled={!selected || !!disabledInputs}
          >
            Enviar
          </button>
          {step.pistas && step.pistas.length > 0 && (
            <button
              type="button"
              className="px-4 py-2 bg-neutral-800 text-white rounded hover:opacity-90"
              onClick={askHint}
              disabled={!!disabledInputs || ((step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1) > (starsLeft ?? 0)) || ((step.pistas?.length ?? 0) <= pistasUsadas)}
            >
              {(() => {
                const costo = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1;
                return `Pedir pista (-${costo}⭐)`;
              })()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
