"use client";
import React, { useEffect, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';

type Props = {
  step: Extract<Paso, { tipo_paso: 'prediccion' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

export default function PasoPrediccion({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const [choice, setChoice] = useState<string>('');
  const [exp, setExp] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!choice) {
      setMsg('Selecciona una opción.');
      return;
    }
    if (step.requiere_explicacion && exp.trim().length < 1) {
      setMsg('Añade una breve explicación.');
      return;
    }
    setMsg('Predicción registrada.');
    if (onUiFeedback) onUiFeedback('Predicción registrada.', 'success');
    onComplete({
      success: true, // diagnóstico: nunca marca incorrecto
      score: 0,
      pistasUsadas,
      explicacionLongitud: exp.trim().length,
      raw: { choice, explicacion: exp },
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

  // Expose controller for immersive CTA
  useEffect(() => {
    if (!exposeController) return;
    exposeController({
      submit: handleSubmit,
      canSubmit: () => !disabledInputs && (!!choice) && (!step.requiere_explicacion || exp.trim().length > 0),
      canAskHint: () => canAskHint,
      askHint: () => askHint(),
    });
  }, [exposeController, handleSubmit, disabledInputs, choice, exp, canAskHint]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <p className="text-neutral-200">{step.pregunta}</p>

      <div className="space-y-2">
        {step.opciones.map((op) => (
          <label key={op.id} className="flex items-center gap-2 p-2 border border-neutral-800 rounded cursor-pointer">
            <input
              type="radio"
              name="prediccion"
              value={op.id}
              checked={choice === op.id}
              onChange={() => setChoice(op.id)}
              disabled={!!disabledInputs}
            />
            <span>{op.texto}</span>
          </label>
        ))}
      </div>

      {step.requiere_explicacion && (
        <textarea
          className="w-full p-2 rounded bg-black/20 border border-neutral-800"
          placeholder={step.placeholder_explicacion ?? 'Explica brevemente tu predicción'}
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          disabled={!!disabledInputs}
        />
      )}

      {msg && <div className="p-2 rounded bg-black/30 border border-neutral-800">{msg}</div>}

      {step.pistas && pistasUsadas > 0 && (
        <div className="p-2 rounded bg-black/30 border border-neutral-800 space-y-1">
          {step.pistas.slice(0, pistasUsadas).map((p, i) => (
            <div key={i} className="text-sm">
              <strong>Pista {i + 1}:</strong> {p.texto}
            </div>
          ))}
        </div>
      )}

      {!immersive && (
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
      )}
    </div>
  );
}