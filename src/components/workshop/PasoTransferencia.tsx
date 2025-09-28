"use client";
import React, { useEffect, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';

type Props = {
  step: Extract<Paso, { tipo_paso: 'transferencia' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

export default function PasoTransferencia({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const cfg = step.transferencia;
  const [choice, setChoice] = useState('');
  const [exp, setExp] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!choice) {
      setFeedback('Selecciona una opción.');
      return;
    }
    if (cfg.requiere_explicacion && exp.trim().length === 0) {
      setFeedback('Añade una breve explicación.');
      return;
    }
    const ok = choice === cfg.respuesta_correcta;
    setFeedback(ok ? (cfg.feedback_correcto ?? '¡Correcto!') : (cfg.feedback_incorrecto ?? 'Respuesta incorrecta.'));
    if (onUiFeedback) onUiFeedback(ok ? (cfg.feedback_correcto ?? '¡Correcto!') : (cfg.feedback_incorrecto ?? 'Respuesta incorrecta.'), ok ? 'success' : 'info');
    onComplete({
      success: ok,
      score: ok ? (step.puntaje ?? 1) : 0,
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
  const canAskHint = !!step.pistas && step.pistas.length > 0 && !disabledInputs && (step.pistas.length > pistasUsadas) && (nextHintCost <= (starsLeft ?? 0));

  // Expose controller for immersive CTA
  useEffect(() => {
    if (!exposeController) return;
    exposeController({
      submit: handleSubmit,
      canSubmit: () => !disabledInputs && !!choice && (!cfg.requiere_explicacion || exp.trim().length > 0),
      canAskHint: () => canAskHint,
      askHint: () => askHint(),
    });
  }, [exposeController, handleSubmit, disabledInputs, choice, exp, canAskHint]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>

      <div className="p-3 rounded bg-black/20 border border-neutral-800 whitespace-pre-wrap">
        {cfg.escenario}
      </div>

      <p className="text-neutral-200">{cfg.pregunta}</p>

      <div className="space-y-2">
        {cfg.opciones.map((op) => (
          <label key={op.id} className="flex items-center gap-2 p-2 border border-neutral-800 rounded cursor-pointer">
            <input
              type="radio"
              name="transferencia"
              value={op.id}
              checked={choice === op.id}
              onChange={() => setChoice(op.id)}
              disabled={!!disabledInputs}
            />
            <span>{op.texto}</span>
          </label>
        ))}
      </div>

      {cfg.requiere_explicacion && (
        <textarea
          className="w-full p-2 rounded bg-black/20 border border-neutral-800"
          placeholder="Explica tu selección"
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          disabled={!!disabledInputs}
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