"use client";
import React, { useState, useCallback } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import { SocraticChat } from '@/components/cognitive-tools/SocraticChat';
import type { SocraticMessage, TelemetryEvent } from '@/components/cognitive-tools/SocraticChat';
import { trackEvent } from '@/lib/track';

type Props = {
  step: Extract<Paso, { tipo_paso: 'socratico_chat' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  disabledInputs?: boolean;
  classToken?: string;
  tallerId?: string;
};

const MOCK_REPLY_DELAY_MS = 900;

export default function PasoSocraticoCht({
  step,
  onComplete,
  pistasUsadas,
  disabledInputs,
  classToken,
  tallerId,
}: Props) {
  const cfg = step.socratico_chat;
  const minTurns = typeof cfg.min_turnos === 'number' ? cfg.min_turnos : 2;

  const [messages, setMessages] = useState<SocraticMessage[]>([
    { role: 'ai', content: cfg.mensaje_inicial },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentTurns, setStudentTurns] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleTelemetry = useCallback(
    (event: TelemetryEvent) => {
      trackEvent('telemetria_crisol', {
        tallerId: tallerId ?? step.ref_id ?? 'unknown',
        pasoId: String(step.paso_numero),
        classToken,
        result: { tipo: event.event, duration: event.duration },
      });
    },
    [tallerId, step, classToken]
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      if (isLoading || disabledInputs) return;

      const newStudentTurns = studentTurns + 1;

      setMessages((prev) => [...prev, { role: 'student', content: text }]);
      setStudentTurns(newStudentTurns);
      setIsLoading(true);

      setTimeout(() => {
        const scriptIdx = (newStudentTurns - 1) % cfg.script.length;
        const aiReply = cfg.script[scriptIdx] ?? '...';

        setMessages((prev) => [...prev, { role: 'ai', content: aiReply }]);
        setIsLoading(false);

        if (newStudentTurns >= minTurns && !completed) {
          setCompleted(true);
          onComplete({
            success: true,
            score: step.puntaje ?? 2,
            pistasUsadas,
            raw: { turnos: newStudentTurns },
          });
        }
      }, MOCK_REPLY_DELAY_MS);
    },
    [isLoading, disabledInputs, studentTurns, cfg.script, minTurns, completed, onComplete, step, pistasUsadas]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{step.titulo_paso}</h2>
      <p className="text-neutral-400 text-sm">{cfg.instruccion}</p>

      <SocraticChat
        messages={messages}
        onSendMessage={handleSendMessage}
        onTelemetryUpdate={handleTelemetry}
        isLoading={isLoading}
      />

      {!completed && (
        <p className="text-xs text-neutral-500 font-mono">
          {studentTurns} / {minTurns} intercambios para completar
        </p>
      )}
      {completed && (
        <p className="text-xs text-lime font-mono">
          Defensa socrática completada ✓
        </p>
      )}
    </div>
  );
}
