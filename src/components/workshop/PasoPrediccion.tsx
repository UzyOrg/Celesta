"use client";
import React, { useEffect, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

type Props = {
  step: Extract<Paso, { tipo_paso: 'prediccion' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

export default function PasoPrediccion({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const [choice, setChoice] = useState<string>('');
  const [exp, setExp] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!choice) {
      setMsg('Selecciona una opción.');
      return;
    }
    if (step.requiere_explicacion && exp.trim().length < 1) {
      setMsg('Añade una breve explicación.');
      return;
    }
    setMsg('Predicción registrada.');
    if (onUiFeedback) onUiFeedback('Predicción registrada.', 'success');
    onComplete({
      success: true, // diagnóstico: nunca marca incorrecto
      score: 0,
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
  const canAskHint =
    !!step.pistas &&
    step.pistas.length > 0 &&
    !disabledInputs &&
    (step.pistas.length > pistasUsadas) &&
    (nextHintCost <= (starsLeft ?? 0));

  // Expose controller for immersive CTA
  useEffect(() => {
    if (!exposeController) return;
    exposeController({
      submit: handleSubmit,
      canSubmit: () => !disabledInputs && (!!choice) && (!step.requiere_explicacion || exp.trim().length > 0),
      canAskHint: () => canAskHint,
      askHint: () => askHint(),
    });
  }, [exposeController, handleSubmit, disabledInputs, choice, exp, canAskHint]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-neutral-100">{step.titulo_paso}</h2>
        <p className="text-lg text-neutral-300 leading-relaxed">{step.pregunta}</p>
      </div>

      <div className="space-y-3">
        {step.opciones.map((op, idx) => {
          const isSelected = choice === op.id;

          return (
            <motion.label
              key={op.id}
              className={`
                relative block p-4 rounded-xl border-2 cursor-pointer transition-all
                backdrop-blur-sm overflow-hidden group
                ${isSelected
                  ? 'border-lime bg-lime/10 shadow-lg shadow-lime/20'
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
                  name="prediccion"
                  value={op.id}
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => !disabledInputs && setChoice(op.id)}
                  disabled={!!disabledInputs}
                />
                
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                  transition-all
                  ${isSelected
                    ? 'border-lime bg-lime'
                    : 'border-neutral-600 group-hover:border-neutral-500'
                  }
                `}>
                  {isSelected && (
                    <motion.div
                      className="w-2 h-2 bg-black rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </div>

                <span className={`flex-1 text-base ${
                  isSelected ? 'text-white font-medium' : 'text-neutral-200'
                }`}>
                  {op.texto}
                </span>
              </div>

              {!disabledInputs && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              )}
            </motion.label>
          );
        })}
      </div>

      {step.requiere_explicacion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <textarea
            className="w-full p-4 rounded-xl bg-neutral-800/40 border-2 border-neutral-700/50 focus:border-lime/50 focus:outline-none focus:ring-2 focus:ring-lime/20 text-neutral-200 placeholder:text-neutral-500 transition-all min-h-[100px] backdrop-blur-sm"
            placeholder={step.placeholder_explicacion ?? 'Explica brevemente tu predicción aquí...'}
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            disabled={!!disabledInputs}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {msg && (
          <motion.div 
            className="flex items-start gap-2 p-4 rounded-xl border-2 bg-blue-900/20 border-blue-600/50 backdrop-blur-sm shadow-lg"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, type: 'spring' }}
          >
            <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-blue-100 leading-relaxed">{msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {step.pistas && pistasUsadas > 0 && (
        <motion.div 
          className="p-4 rounded-xl bg-amber-900/10 border-2 border-amber-700/30 backdrop-blur-sm space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
            <Lightbulb className="w-4 h-4" />
            <span>Pistas utilizadas:</span>
          </div>
          <div className="space-y-2 pl-6">
            {step.pistas.slice(0, pistasUsadas).map((p, i) => (
              <motion.div
                key={i}
                className="text-sm text-amber-100"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="font-semibold text-amber-200">Pista {i + 1}:</span> {p.texto}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {!immersive && (
        <div className="flex gap-3 pt-4">
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-lime to-turquoise text-black font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
            onClick={handleSubmit}
            disabled={!!disabledInputs}
            whileHover={!disabledInputs ? { scale: 1.02, y: -1 } : {}}
            whileTap={!disabledInputs ? { scale: 0.98 } : {}}
          >
            Enviar Predicción
          </motion.button>
          {step.pistas && step.pistas.length > 0 && (
            <motion.button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-800/80 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700/50 backdrop-blur-sm transition-all"
              onClick={askHint}
              disabled={!canAskHint}
              whileHover={canAskHint ? { scale: 1.02, y: -1 } : {}}
              whileTap={canAskHint ? { scale: 0.98 } : {}}
            >
              <Lightbulb className="w-4 h-4" />
              <span>{`Pedir pista (-${nextHintCost}⭐)`}</span>
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}