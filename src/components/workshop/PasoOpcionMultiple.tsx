"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type Props = {
  step: Extract<Paso, { tipo_paso: 'opcion_multiple' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

export default function PasoOpcionMultiple({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [explicacion, setExplicacion] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const firstRadioRef = useRef<HTMLInputElement | null>(null);
  const explicacionRef = useRef<HTMLTextAreaElement | null>(null);

  const onSubmit = () => {
    if (!selected) return;
    const isCorrect = selected === step.opcion_multiple.respuesta_correcta;
    setFeedback(
      isCorrect ? step.opcion_multiple.feedback_correcto : step.opcion_multiple.feedback_incorrecto
    );
    setLastWasCorrect(isCorrect);
    if (onUiFeedback) {
      onUiFeedback(isCorrect ? (step.opcion_multiple.feedback_correcto || '¡Correcto!') : (step.opcion_multiple.feedback_incorrecto || 'Inténtalo de nuevo.'), isCorrect ? 'success' : 'info');
    }
    const res = {
      success: isCorrect,
      score: isCorrect ? (step.puntaje ?? 1) : 0,
      pistasUsadas,
      explicacionLongitud: step.opcion_multiple.requiere_explicacion ? explicacion.length : undefined,
      raw: { selected, explicacion, feedbackText: isCorrect ? step.opcion_multiple.feedback_correcto : step.opcion_multiple.feedback_incorrecto },
    } as const;
    onComplete(res as any);
    if (!isCorrect) {
      // Focus to help retry UX
      setTimeout(() => {
        if (step.opcion_multiple.requiere_explicacion && explicacionRef.current) {
          explicacionRef.current.focus();
        } else {
          firstRadioRef.current?.focus();
        }
      }, 0);
    }
  };

  const askHint = () => {
    const pista = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint(costo);
  };

  // Expose imperative controller for immersive layout
  useEffect(() => {
    if (!exposeController) return;
    const nextHintCost = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1;
    const canAsk = !!step.pistas && (step.pistas.length > pistasUsadas) && (nextHintCost <= (starsLeft ?? 0)) && !disabledInputs;
    exposeController({
      submit: onSubmit,
      canSubmit: () => Boolean(selected) && !disabledInputs,
      canAskHint: () => canAsk,
      askHint: () => askHint(),
    });
  }, [exposeController, selected, disabledInputs, pistasUsadas, starsLeft, step]);

  const isCorrectAnswer = (optionId: string) => optionId === step.opcion_multiple.respuesta_correcta;
  const showResult = !!disabledInputs && lastWasCorrect !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-neutral-100">{step.titulo_paso}</h2>
        <p className="text-lg text-neutral-300 leading-relaxed">{step.opcion_multiple.pregunta}</p>
      </div>

      <div className="space-y-3">
        {step.opcion_multiple.opciones.map((op, idx) => {
          const isSelected = selected === op.id;
          const isCorrect = isCorrectAnswer(op.id);
          const showCorrect = showResult && isCorrect;
          const showIncorrect = showResult && isSelected && !isCorrect;

          return (
            <motion.label
              key={op.id}
              className={`
                relative block p-4 rounded-xl border-2 cursor-pointer transition-all
                backdrop-blur-sm overflow-hidden group
                ${isSelected && !showResult
                  ? 'border-turquoise bg-turquoise/10 shadow-lg shadow-turquoise/20'
                  : showCorrect
                    ? 'border-green-500 bg-green-900/20 shadow-lg shadow-green-500/20'
                    : showIncorrect
                      ? 'border-red-500 bg-red-900/20 shadow-lg shadow-red-500/20'
                      : 'border-neutral-700/50 bg-neutral-800/30 hover:border-neutral-600 hover:bg-neutral-800/50'
                }
                ${disabledInputs ? 'cursor-not-allowed opacity-90' : ''}
              `}
              whileHover={!disabledInputs ? { scale: 1.01, y: -2 } : {}}
              whileTap={!disabledInputs ? { scale: 0.99 } : {}}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`op-${step.paso_numero}`}
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => !disabledInputs && setSelected(op.id)}
                  disabled={!!disabledInputs}
                  ref={idx === 0 ? firstRadioRef : undefined}
                />
                
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                  transition-all
                  ${isSelected && !showResult
                    ? 'border-turquoise bg-turquoise'
                    : showCorrect
                      ? 'border-green-500 bg-green-500'
                      : showIncorrect
                        ? 'border-red-500 bg-red-500'
                        : 'border-neutral-600 group-hover:border-neutral-500'
                  }
                `}>
                  {isSelected && !showResult && (
                    <motion.div
                      className="w-2 h-2 bg-black rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  {showCorrect && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                  {showIncorrect && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      <XCircle className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </div>

                <span className={`flex-1 text-base ${
                  showCorrect ? 'text-green-100 font-medium' : 
                  showIncorrect ? 'text-red-100 font-medium' : 
                  isSelected ? 'text-white font-medium' : 'text-neutral-200'
                }`}>
                  {op.texto}
                </span>
              </div>

              {/* Efecto de brillo en hover */}
              {!disabledInputs && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              )}
            </motion.label>
          );
        })}
      </div>

      {step.opcion_multiple.requiere_explicacion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <textarea
            className="w-full p-4 rounded-xl bg-neutral-800/40 border-2 border-neutral-700/50 focus:border-turquoise/50 focus:outline-none focus:ring-2 focus:ring-turquoise/20 text-neutral-200 placeholder:text-neutral-500 transition-all min-h-[100px] backdrop-blur-sm"
            placeholder="Explica tu razonamiento aquí..."
            value={explicacion}
            onChange={(e) => setExplicacion(e.target.value)}
            disabled={!!disabledInputs}
            ref={explicacionRef}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div 
            className={`p-4 rounded-xl border-2 backdrop-blur-sm shadow-lg ${
              lastWasCorrect 
                ? 'bg-green-900/20 border-green-600/50 text-green-100' 
                : 'bg-amber-900/20 border-amber-600/50 text-amber-100'
            }`}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, type: 'spring' }}
          >
            <div className="flex items-start gap-2">
              {lastWasCorrect ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <p className="leading-relaxed">{feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {step.pistas && pistasUsadas > 0 && (
        <motion.div 
          className="p-4 rounded-xl bg-blue-900/10 border-2 border-blue-700/30 backdrop-blur-sm space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 text-blue-300 font-medium text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Pistas utilizadas:</span>
          </div>
          <div className="space-y-2 pl-6">
            {step.pistas.slice(0, pistasUsadas).map((p, i) => (
              <motion.div
                key={i}
                className="text-sm text-blue-100"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="font-semibold text-blue-200">Pista {i + 1}:</span> {p.texto}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {lastWasCorrect === false && !disabledInputs && (
        <motion.p 
          className="flex items-center gap-2 text-sm text-amber-300 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AlertCircle className="w-4 h-4" />
          Revisa tu respuesta y vuelve a intentarlo
        </motion.p>
      )}

      {!immersive && (
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
            onClick={onSubmit}
            disabled={!selected || !!disabledInputs}
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
      )}
    </div>
  );
}
