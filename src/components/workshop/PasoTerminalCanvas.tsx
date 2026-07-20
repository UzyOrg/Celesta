"use client";
import React, { useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import { TerminalCanvas } from '@/components/cognitive-tools/TerminalCanvas';

type Props = {
  step: Extract<Paso, { tipo_paso: 'terminal_canvas' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  classToken?: string;
  tallerId?: string;
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function PasoTerminalCanvas({
  step,
  onComplete,
  pistasUsadas,
  onHint,
  disabledInputs,
}: Props) {
  const cfg = step.terminal_canvas;
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const minWords = typeof cfg.min_palabras === 'number' ? Math.max(0, cfg.min_palabras) : 0;
  const wc = wordCount(text);
  const meetsMinimum = minWords === 0 || wc >= minWords;

  const handleSubmit = () => {
    if (!meetsMinimum) {
      setFeedback(`Escribe al menos ${minWords} palabra(s). Llevas ${wc}.`);
      return;
    }

    let keywords_hit = 0;
    if (cfg.criterio_palabras_clave && cfg.criterio_palabras_clave.length > 0) {
      const lower = text.toLowerCase();
      keywords_hit = cfg.criterio_palabras_clave.filter((k) =>
        lower.includes(k.toLowerCase())
      ).length;
    }

    setFeedback('Respuesta registrada.');
    onComplete({
      success: true,
      score: step.puntaje ?? 1,
      pistasUsadas,
      explicacionLongitud: text.trim().length,
      raw: { text, wc, keywords_hit },
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
      <p className="text-neutral-300 text-sm leading-relaxed">{cfg.instruccion}</p>

      <TerminalCanvas
        value={text}
        onChange={disabledInputs ? () => {} : setText}
        onTelemetryUpdate={() => undefined}
        placeholder={cfg.placeholder ?? 'Escribe tu respuesta aquí...'}
      />

      {minWords > 0 && (
        <p className={`text-xs font-mono ${meetsMinimum ? 'text-lime' : 'text-neutral-500'}`}>
          {wc} / {minWords} palabras mínimas
        </p>
      )}

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
          disabled={!!disabledInputs || !meetsMinimum}
        >
          Enviar
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
