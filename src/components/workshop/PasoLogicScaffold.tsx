"use client";
import React, { useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import { LogicScaffold } from '@/components/cognitive-tools/LogicScaffold';
import type { LogicNode } from '@/components/cognitive-tools/LogicScaffold';

type Props = {
  step: Extract<Paso, { tipo_paso: 'logic_scaffold' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  classToken?: string;
  tallerId?: string;
};

export default function PasoLogicScaffold({
  step,
  onComplete,
  pistasUsadas,
  onHint,
  disabledInputs,
}: Props) {
  const cfg = step.logic_scaffold;
  const [nodes, setNodes] = useState<LogicNode[]>(cfg.nodos);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = () => {
    if (disabledInputs) return;

    const currentOrder = nodes.map((n) => n.id);

    if (cfg.orden_correcto && cfg.orden_correcto.length > 0) {
      const isCorrect =
        currentOrder.length === cfg.orden_correcto.length &&
        currentOrder.every((id, idx) => id === cfg.orden_correcto![idx]);

      if (!isCorrect) {
        setFeedback('El orden no es el correcto. Intenta reorganizar las tarjetas.');
        onComplete({
          success: false,
          score: 0,
          pistasUsadas,
          raw: { order: currentOrder },
        });
        return;
      }
      setFeedback('¡Orden correcto!');
    } else {
      setFeedback('Orden confirmado.');
    }

    onComplete({
      success: true,
      score: step.puntaje ?? 2,
      pistasUsadas,
      raw: { order: currentOrder },
    });
  };

  const canAskHint =
    !!step.pistas &&
    step.pistas.length > 0 &&
    !disabledInputs &&
    step.pistas.length > pistasUsadas;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>

      <LogicScaffold
        instruction={cfg.instruccion}
        nodes={nodes}
        onOrderChange={disabledInputs ? () => {} : setNodes}
        onTelemetryUpdate={() => undefined}
      />

      {feedback && (
        <div className="p-2 rounded bg-black/30 border border-neutral-800 text-sm">
          {feedback}
        </div>
      )}

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
          className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50 font-semibold"
          onClick={handleSubmit}
          disabled={!!disabledInputs}
        >
          Confirmar Orden
        </button>
        {step.pistas && step.pistas.length > 0 && (
          <button
            type="button"
            className="px-4 py-2 bg-neutral-800 text-white rounded hover:opacity-90 disabled:opacity-50"
            onClick={() => onHint?.(1)}
            disabled={!canAskHint}
          >
            Pedir pista
          </button>
        )}
      </div>
    </div>
  );
}
