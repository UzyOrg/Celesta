"use client";
import React, { useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';

type Props = {
  step: Extract<Paso, { tipo_paso: 'caza_errores' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
};

export default function PasoCazaErrores({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  function arraysEqualUnordered(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = a.slice().sort();
    const sb = b.slice().sort();
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
    return true;
  }

  const onSubmit = () => {
    const chosen = Object.keys(selected).filter((k) => selected[k]);
    const ok = arraysEqualUnordered(chosen, step.correctas);
    setFeedback(ok ? (step.feedback_correcto ?? '¡Bien! Encontraste las fallas correctas.') : 'Revisa de nuevo las fallas en la solución propuesta.');
    const res: StepComplete = {
      success: ok,
      score: ok ? (step.puntaje ?? 2) : 0,
      pistasUsadas,
      explicacionLongitud: 0,
      raw: { fallas_marcadas: chosen },
    };
    onComplete(res);
    setLastWasCorrect(ok);
  };

  const askHint = () => {
    const pista = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint(costo);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <div className="p-3 rounded bg-black/20 border border-neutral-800 whitespace-pre-wrap">{step.solucion_propuesta}</div>

      <div className="space-y-2">
        {step.fallas.map((f) => (
          <label key={f.id} className={`flex items-center gap-2 border rounded p-3 cursor-pointer ${selected[f.id] ? 'border-lime' : 'border-neutral-800'}`}>
            <input
              type="checkbox"
              checked={!!selected[f.id]}
              onChange={() => toggle(f.id)}
              disabled={!!disabledInputs}
            />
            {f.texto}
          </label>
        ))}
      </div>

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

      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
          onClick={onSubmit}
          disabled={!!disabledInputs}
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
    </div>
  );
}

