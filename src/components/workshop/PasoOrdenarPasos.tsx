"use client";
import React, { useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';

type Props = {
  step: Extract<Paso, { tipo_paso: 'ordenar_pasos' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
};

export default function PasoOrdenarPasos({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft }: Props) {
  // Represent order as indices into step.items
  const [order, setOrder] = useState<number[]>(step.items.map((_, i) => i));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);

  const move = (idx: number, dir: -1 | 1) => {
    if (disabledInputs) return;
    setOrder((arr) => {
      const i2 = idx + dir;
      if (i2 < 0 || i2 >= arr.length) return arr;
      const next = arr.slice();
      const tmp = next[idx];
      next[idx] = next[i2]!;
      next[i2] = tmp!;
      return next;
    });
  };

  function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  const onSubmit = () => {
    const ok = arraysEqual(order, step.respuesta_correcta);
    setFeedback(ok ? '¡Orden correcto!' : 'El orden no coincide. Intenta reorganizar.');
    setLastWasCorrect(ok);
    const res: StepComplete = {
      success: ok,
      score: ok ? (step.puntaje ?? 2) : 0,
      pistasUsadas,
      explicacionLongitud: 0,
      raw: { order, items: order.map((i) => step.items[i]!) },
    };
    onComplete(res);
  };

  const askHint = () => {
    const pista = (step as any).pistas?.[Math.min(pistasUsadas, ((step as any).pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint(costo);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <div className="space-y-2">
        {order.map((idx, pos) => (
          <div key={idx} className="flex items-center gap-2 border border-neutral-800 rounded p-2">
            <span className="w-6 text-center text-neutral-400">{pos + 1}.</span>
            <div className="flex-1">{step.items[idx]}</div>
            <div className="flex gap-1">
              <button
                className="px-2 py-1 bg-neutral-800 rounded disabled:opacity-50"
                onClick={() => move(pos, -1)}
                disabled={pos === 0 || !!disabledInputs}
                aria-label="Subir"
              >↑</button>
              <button
                className="px-2 py-1 bg-neutral-800 rounded disabled:opacity-50"
                onClick={() => move(pos, 1)}
                disabled={pos === order.length - 1 || !!disabledInputs}
                aria-label="Bajar"
              >↓</button>
            </div>
          </div>
        ))}
      </div>

      {feedback && <div className="p-2 rounded bg-black/30 border border-neutral-800">{feedback}</div>}
      {(step as any).pistas && pistasUsadas > 0 && (
        <div className="p-2 rounded bg-black/30 border border-neutral-800 space-y-1">
          {(step as any).pistas.slice(0, pistasUsadas).map((p: any, i: number) => (
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
        {(step as any).pistas && (step as any).pistas.length > 0 && (
          <button
            type="button"
            className="px-4 py-2 bg-neutral-800 text-white rounded hover:opacity-90"
            onClick={askHint}
            disabled={!!disabledInputs || ((((step as any).pistas?.[Math.min(pistasUsadas, (((step as any).pistas?.length ?? 1) - 1))]?.costo ?? 1) > (starsLeft ?? 0)) || (((step as any).pistas?.length ?? 0) <= pistasUsadas))}
          >
            {(() => {
              const costo = (step as any).pistas?.[Math.min(pistasUsadas, (((step as any).pistas?.length ?? 1) - 1))]?.costo ?? 1;
              return `Pedir pista (-${costo}⭐)`;
            })()}
          </button>
        )}
      </div>
    </div>
  );
}
