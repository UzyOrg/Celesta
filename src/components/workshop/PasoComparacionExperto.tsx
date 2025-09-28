"use client";
import React, { useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';

type Props = {
  step: Extract<Paso, { tipo_paso: 'comparacion_experto' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
};

export default function PasoComparacionExperto({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft }: Props) {
  const cfg = step.comparacion_experto;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exp, setExp] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const minChecks = typeof cfg.min_checks === 'number' ? Math.max(0, cfg.min_checks) : 1;

  const toggle = (id: string) => {
    if (disabledInputs) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSubmit = () => {
    if (selected.size < minChecks) {
      setFeedback(`Selecciona al menos ${minChecks} elemento(s) del checklist.`);
      return;
    }
    if (step.requiere_explicacion && exp.trim().length === 0) {
      setFeedback('Añade una breve explicación.');
      return;
    }
    setFeedback('Comparación registrada.');
    onComplete({
      success: true,
      score: step.puntaje ?? 1,
      pistasUsadas,
      explicacionLongitud: exp.trim().length,
      raw: { selected: Array.from(selected), explicacion: exp },
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
        {cfg.texto_experto}
      </div>

      <p className="text-neutral-200">{cfg.pregunta}</p>

      <div className="space-y-2">
        {cfg.checklist.map((item) => (
          <label key={item.id} className="flex items-center gap-2 p-2 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              disabled={!!disabledInputs}
            />
            <span>{item.texto}</span>
          </label>
        ))}
      </div>

      {step.requiere_explicacion && (
        <textarea
          className="w-full p-2 rounded bg-black/20 border border-neutral-800"
          placeholder="Explica brevemente tu selección"
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