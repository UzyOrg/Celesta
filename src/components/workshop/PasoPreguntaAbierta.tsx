"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';

type Props = {
  step: Extract<Paso, { tipo_paso: 'pregunta_abierta_validada' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

function validateAnswer(text: string, criterios: string[]): boolean {
  const lower = text.toLowerCase();
  for (let i = 0; i < criterios.length; i++) {
    const kw = criterios[i]!.toLowerCase();
    if (!lower.includes(kw)) return false;
  }
  return true;
}

// Más tolerante: normaliza acentos y decimales, acepta 'proporcional' o 'lineal' como equivalentes,
// y permite coincidencias numéricas con coma o distintos redondeos (2,4 ~ 2.4 ~ 2.40)
function validateAnswerFlex(text: string, criterios: string[]): boolean {
  const norm = (s: string) =>
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, '.');

  const t = norm(text);
  const tokens = Array.from(new Set(criterios.map((c) => norm(c))));

  const isNumeric = (x: string) => /^\d+(?:\.\d+)?$/.test(x);
  const numeric = tokens.filter(isNumeric);
  const words = tokens.filter((x) => !isNumeric(x));

  // grupos: proporcional/lineal (basta con uno) y razon unitaria (sinonimos)
  const wantsProp = words.some((w) => w === 'proporc' || w === 'proporcional' || w === 'lineal');
  const wantsRazon = words.some((w) => w === 'razon' || w === 'unitaria' || w === 'unitario');
  const wordRequired = words.filter(
    (w) => w !== 'proporc' && w !== 'proporcional' && w !== 'lineal' && w !== 'razon' && w !== 'unitaria' && w !== 'unitario'
  );

  // comprobar palabras
  for (let i = 0; i < wordRequired.length; i++) {
    const w = wordRequired[i]!;
    // tolerancia para 'multiplicar' -> cualquier forma 'multiplic*' o expresion con x/×
    if (w === 'multiplicar') {
      const hasMulRoot = t.includes('multiplic');
      const hasMulSymbol = /\b\d+\s*(?:x|×)\s*\d+(?:\.\d+)?\b/.test(t);
      if (!(hasMulRoot || hasMulSymbol)) return false;
      continue;
    }
    if (!t.includes(w)) return false;
  }
  if (wantsProp) {
    const okProp = t.includes('proporc') || t.includes('lineal');
    if (!okProp) return false;
  }

  if (wantsRazon) {
    const okRazon =
      t.includes('razon') ||
      t.includes('unitari') ||
      t.includes('precio por 1') ||
      t.includes('precio por uno') ||
      t.includes('por 1') ||
      t.includes('precio unitario') ||
      t.includes('por unidad');
    if (!okRazon) return false;
  }

  // comprobar números con tolerancia simple de formato (2.4 / 2.40)
  const hasAllNumbers = numeric.every((n) => {
    if (t.includes(n)) return true;
    const num = Number(n);
    const candidates = [num.toFixed(0), num.toFixed(1), num.toFixed(2), num.toFixed(3)];
    return candidates.some((c) => t.includes(c));
  });

  return hasAllNumbers;
}

export default function PasoPreguntaAbierta({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const cfg = step.pregunta_abierta_validada;
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [rescueShown, setRescueShown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const onSubmit = () => {
    const ok = validateAnswerFlex(answer, cfg.validacion.criterio);
    setLastWasCorrect(ok);
    if (ok) {
      setFeedback(cfg.validacion.feedback_correcto ?? '¡Bien! Respuesta válida.');
      if (onUiFeedback) onUiFeedback(cfg.validacion.feedback_correcto ?? '¡Bien! Respuesta válida.', 'success');
      onComplete({
        success: true,
        score: step.puntaje ?? 1,
        pistasUsadas,
        explicacionLongitud: answer.trim().length,
        raw: { answer },
      });
      return;
    }
    // fallo
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setFeedback(cfg.validacion.feedback_incorrecto ?? 'Revisa tu respuesta y vuelve a intentar.');
    if (onUiFeedback) onUiFeedback(cfg.validacion.feedback_incorrecto ?? 'Revisa tu respuesta y vuelve a intentar.', 'info');
    onComplete({
      success: false,
      score: 0,
      pistasUsadas,
      explicacionLongitud: answer.trim().length,
      raw: { answer, attempts: nextAttempts },
    });
    setTimeout(() => textareaRef.current?.focus(), 0);
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

  // Expose imperative controller for immersive layout
  useEffect(() => {
    if (!exposeController) return;
    exposeController({
      submit: onSubmit,
      canSubmit: () => !disabledInputs && answer.trim().length > 0,
      canAskHint: () => canAskHint,
      askHint: () => askHint(),
    });
  }, [exposeController, onSubmit, disabledInputs, answer, canAskHint]);

  const rescate = cfg.rescate;
  const rescueEligible =
    !!rescate &&
    (
      (typeof rescate.desde_intento === 'number' && attempts >= rescate.desde_intento) ||
      (typeof rescate.desde_pistas === 'number' && pistasUsadas >= rescate.desde_pistas)
    );

  const onAcceptRescue = () => {
    if (!rescate) return;
    if ((starsLeft ?? 0) < (rescate.costo ?? 1)) return;
    onHint?.(rescate.costo ?? 1);
    setRescueShown(true);
    onComplete({
      success: true,
      score: 0, // rescate: no puntaje
      pistasUsadas,
      explicacionLongitud: answer.trim().length,
      raw: { rescue: true, answer, explicacion_rescate: rescate.explicacion },
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <p className="text-neutral-200">{cfg.pregunta}</p>

      <textarea
        ref={textareaRef}
        className="w-full p-2 rounded bg-black/20 border border-neutral-800"
        placeholder="Escribe tu respuesta"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!!disabledInputs}
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
        <p className="text-sm text-neutral-300">Ajusta y vuelve a intentar.</p>
      )}

      {!immersive && (
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
              className="px-4 py-2 bg-neutral-800 text-white rounded hover:opacity-90 disabled:opacity-50"
              onClick={askHint}
              disabled={!canAskHint}
            >
              {`Pedir pista (-${nextHintCost}⭐)`}
            </button>
          )}

          {rescate && rescueEligible && !rescueShown && (
            <button
              type="button"
              className="ml-auto px-4 py-2 bg-amber-400 text-black rounded hover:opacity-90 disabled:opacity-50"
              onClick={onAcceptRescue}
              disabled={!!disabledInputs || ((rescate.costo ?? 1) > (starsLeft ?? 0))}
              title={rescate.explicacion}
            >
              {rescate.titulo ? `${rescate.titulo} (-${rescate.costo ?? 1}⭐)` : `Rescate (-${rescate.costo ?? 1}⭐)`}
            </button>
          )}
        </div>
      )}

      {rescate && rescueEligible && !rescueShown && (
        <div className="p-2 rounded bg-black/30 border border-neutral-800 text-sm text-neutral-200">
          {rescate.explicacion}
        </div>
      )}
    </div>
  );
}