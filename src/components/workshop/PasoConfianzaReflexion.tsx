"use client";
import React, { useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';

type Props = {
  step: Extract<Paso, { tipo_paso: 'confianza_reflexion' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
};

export default function PasoConfianzaReflexion({ step, onComplete, pistasUsadas }: Props) {
  const [nivel, setNivel] = useState<number>(Math.ceil(step.escala / 2));
  const [reflexion, setReflexion] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = () => {
    setSent(true);
    // Paso diagnóstico: no auto-aprueba. Permite continuar por gating (no bloquea)
    onComplete({ success: false, score: 0, pistasUsadas, explicacionLongitud: reflexion.length, raw: { nivel, reflexion } });
  };

  const marks = Array.from({ length: step.escala }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <p className="text-neutral-200">{step.pregunta}</p>

      <div className="flex flex-wrap gap-2 items-center">
        {marks.map((m) => (
          <button
            key={m}
            type="button"
            className={`w-10 h-10 rounded-full border ${nivel === m ? 'bg-lime text-black border-lime' : 'bg-neutral-900 border-neutral-700 text-white'}`}
            onClick={() => setNivel(m)}
            aria-label={`Nivel ${m}`}
          >{m}</button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-neutral-300">{step.pregunta_reflexion}</label>
        <textarea
          className="w-full p-2 rounded bg-black/20 border border-neutral-800"
          placeholder={'Escribe tu reflexión (opcional)'}
          value={reflexion}
          onChange={(e) => setReflexion(e.target.value)}
        />
      </div>

      <button
        className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
        onClick={onSubmit}
        disabled={sent}
      >
        Enviar
      </button>
    </div>
  );
}
