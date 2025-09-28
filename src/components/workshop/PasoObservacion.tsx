"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';

type Props = {
  step: Extract<Paso, { tipo_paso: 'observacion' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

function validate(text: string, step: Props['step']): boolean {
  const v = step.validacion;
  // Normalize accents and decimals: 2,4 === 2.4
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, '.');

  const txt = norm(text);
  const rawTokens = v.criterio.map((kw) => norm(String(kw)));
  // Either/or: proporcional vs lineal
  const hasPropGroup = rawTokens.includes('proporc') || rawTokens.includes('proporcional') || rawTokens.includes('lineal');

  // Group: "razón unitaria" concept — accept any synonym
  const wantsRazon = rawTokens.includes('razon') || rawTokens.includes('unitaria') || rawTokens.includes('unitario');

  const required = Array.from(
    new Set(
      rawTokens.filter((t) =>
        t !== 'proporc' && t !== 'proporcional' && t !== 'lineal' && t !== 'razon' && t !== 'unitaria' && t !== 'unitario'
      )
    )
  );

  // All other tokens must appear
  for (let i = 0; i < required.length; i++) {
    if (!txt.includes(required[i]!)) return false;
  }

  // If the schema asked for proporcional/lineal concept, accept either
  if (hasPropGroup) {
    const okProp = txt.includes('proporc') || txt.includes('lineal');
    if (!okProp) return false;
  }

  // If schema asked for "razón unitaria" concept, accept synonyms
  if (wantsRazon) {
    const okRazon =
      txt.includes('razon') ||
      txt.includes('unitari') || // unitario/a
      txt.includes('precio por 1') ||
      txt.includes('precio por uno') ||
      txt.includes('por 1') ||
      txt.includes('precio unitario') ||
      txt.includes('por unidad');
    if (!okRazon) return false;
  }

  return true;
}

export default function PasoObservacion({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const onSubmit = () => {
    const ok = validate(answer, step);
    setFeedback(ok ? '¡Bien! Has identificado la evidencia esperada.' : 'Revisa la evidencia y vuelve a intentarlo.');
    setLastWasCorrect(ok);
    const payload = { success: ok, score: ok ? (step.puntaje ?? 1) : 0, pistasUsadas, explicacionLongitud: answer.length, raw: { answer } } as const;
    onComplete(payload as any);
    if (onUiFeedback) onUiFeedback(ok ? '¡Bien! Has identificado la evidencia esperada.' : 'Revisa la evidencia y vuelve a intentarlo.', ok ? 'success' : 'info');
    if (!ok) setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const askHint = () => {
    const pista = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint?.(costo);
  };

  const nextHintCost = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1;
  const canAskHint = !!step.pistas && (step.pistas.length > pistasUsadas) && !disabledInputs && (nextHintCost <= (starsLeft ?? 0));

  // Expose controller for immersive CTA
  useEffect(() => {
    if (!exposeController) return;
    exposeController({
      submit: onSubmit,
      canSubmit: () => !disabledInputs && answer.trim().length > 0,
      canAskHint: () => canAskHint,
      askHint: () => askHint(),
    });
  }, [exposeController, onSubmit, disabledInputs, answer, canAskHint]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <div className="p-3 rounded bg-black/20 border border-neutral-800 whitespace-pre-wrap">{step.evidencia_texto}</div>
      <p className="text-neutral-200">{step.pregunta}</p>

      <textarea
        className="w-full p-2 rounded bg-black/20 border border-neutral-800"
        placeholder={'Escribe tus observaciones'}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!!disabledInputs}
        ref={textareaRef}
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
      {lastWasCorrect === false && !disabledInputs && (
        <p className="text-sm text-neutral-300">Ajusta y vuelve a Probar</p>
      )}

      {!immersive && (
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90"
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
