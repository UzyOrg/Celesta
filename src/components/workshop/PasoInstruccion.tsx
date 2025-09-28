"use client";
import React from 'react';
import type { Paso } from '@/lib/workshops/schema';

export type StepComplete = {
  success: boolean;
  score: number;
  pistasUsadas: number;
  explicacionLongitud?: number;
  raw?: any;
};

type Props = {
  step: Extract<Paso, { tipo_paso: 'instruccion' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  disabledInputs?: boolean;
  starsLeft?: number;
  compact?: boolean; // when true, hides long instruction text (used in immersive layout)
  hideAction?: boolean; // when true, hides the internal Continuar button (external CTA handles it)
};

export default function PasoInstruccion({ step, onComplete, pistasUsadas, disabledInputs, compact, hideAction }: Props) {
  const handleContinue = () => {
    onComplete({
      success: true,
      score: step.puntaje ?? 0,
      pistasUsadas,
      explicacionLongitud: 0,
      raw: { action: 'continue' },
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      {step.instruccion?.texto && !compact && (
        <div className="p-3 rounded bg-black/20 border border-neutral-800 whitespace-pre-wrap">
          {step.instruccion.texto}
        </div>
      )}
      {!hideAction && (
        <button
          className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
          onClick={handleContinue}
          disabled={!!disabledInputs}
        >
          Continuar
        </button>
      )}
    </div>
  );
}