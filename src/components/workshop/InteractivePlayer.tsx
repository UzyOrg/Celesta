"use client";
import React, { useEffect, useMemo, useState } from 'react';
import type { Workshop, Paso } from '@/lib/workshops/schema';
import MissionProgress from './MissionProgress';
import { type StepComplete } from './PasoInstruccion';
import PasoObservacion from './PasoObservacion';
import PasoCazaErrores from './PasoCazaErrores';
import PasoOrdenarPasos from './PasoOrdenarPasos';
import PasoConfianzaReflexion from './PasoConfianzaReflexion';
import PasoOpcionMultiple from './PasoOpcionMultiple';
import PasoPrediccion from './PasoPrediccion';
import PasoPreguntaAbierta from './PasoPreguntaAbierta';
import { trackEvent } from '@/lib/track';
import { AnimatePresence, motion } from 'framer-motion';
import PasoComparacionExperto from './PasoComparacionExperto';
import PasoReexplicacion from './PasoReexplicacion';
import PasoTransferencia from './PasoTransferencia';
import type { StepController } from './types';

type Props = {
  workshop: Workshop;
  classToken?: string;
};

export default function InteractivePlayer({ workshop, classToken }: Props) {
  const steps = workshop.pasos ?? [];
  const [idx, setIdx] = useState(0);
  const [starsLeft, setStarsLeft] = useState<number>(3);
  const [pistasUsadas, setPistasUsadas] = useState<Record<number, number>>({});
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [lastAttemptOk, setLastAttemptOk] = useState<Record<number, boolean | null>>({});
  const [ctrl, setCtrl] = useState<StepController | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'info' | 'error' } | null>(null);

  const tallerId = workshop.id_taller;
  const checksum = workshop.checksum;

  useEffect(() => {
    // Inicio del taller
    trackEvent('inicio_taller', {
      tallerId,
      pasoId: `paso-${steps[0]?.paso_numero ?? 1}`,
      classToken,
      result: { totalSteps: steps.length },
      checksum,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autocierre de toasts sutiles
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const totalSteps = steps.length;
  const current = steps[idx];
  const completedCount = useMemo(() => Object.values(completed).filter(Boolean).length, [completed]);

  function goNext() {
    const next = Math.min(idx + 1, totalSteps - 1);
    setIdx(next);
  }

  function goPrev() {
    const prev = Math.max(idx - 1, 0);
    setIdx(prev);
  }

  function handleHint(cost: number) {
    // Guard rails
    if (cost <= 0) return;
    if (starsLeft <= 0) return;
    if (starsLeft < cost) return;
    setStarsLeft((s) => Math.max(0, s - cost));
    setPistasUsadas((m) => ({ ...m, [idx]: (m[idx] ?? 0) + 1 }));
    void trackEvent('solicito_pista', {
      tallerId,
      pasoId: current ? String(current.paso_numero ?? idx + 1) : String(idx + 1),
      classToken,
      result: { costo: cost },
      checksum,
    });
  }

  async function onStepComplete(res: StepComplete) {
    const pasoId = current ? String(current.paso_numero ?? idx + 1) : String(idx + 1);

    // Always record envio_respuesta
    await trackEvent('envio_respuesta', {
      tallerId,
      pasoId,
      classToken,
      result: { ...res, pasoId },
      checksum,
    });

    const success = !!res.success;
    if (success) {
      setCompleted((m) => ({ ...m, [idx]: true }));
      setLastAttemptOk((m) => ({ ...m, [idx]: true }));
      await trackEvent('completo_paso', {
        tallerId,
        pasoId,
        classToken,
        result: { score: res.score ?? 0, pistasUsadas: res.pistasUsadas ?? 0 },
        checksum,
      });
      // Avanzar automáticamente solo en pasos de instrucción para evitar doble CTA
      if (current?.tipo_paso === 'instruccion' && idx < totalSteps - 1) {
        goNext();
      }
      return;
    }

    // No auto-advance on failure: permitir leer feedback y reintentar
    setLastAttemptOk((m) => ({ ...m, [idx]: false }));
  }

  const content = useMemo(() => {
    if (!current) return null;
    const commonProps = {
      onComplete: onStepComplete,
      pistasUsadas: pistasUsadas[idx] ?? 0,
      disabledInputs: completed[idx] ?? false,
      starsLeft,
    } as const;

    switch (current.tipo_paso) {
      case 'instruccion':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Comienza la misión</h2>
            <p className="text-neutral-300">Lee el contexto a la izquierda y cuando estés listo, presiona Comenzar.</p>
          </div>
        );
      case 'observacion':
        return (
          <PasoObservacion
            step={current}
            {...commonProps}
            onHint={handleHint}
            immersive
            exposeController={(c: StepController) => setCtrl(c)}
            onUiFeedback={(text: string, kind: 'success' | 'info' | 'error') => setToast({ text, kind })}
          />
        );
      case 'caza_errores':
        return <PasoCazaErrores step={current} {...commonProps} onHint={handleHint} />;
      case 'ordenar_pasos':
        return <PasoOrdenarPasos step={current} {...commonProps} onHint={handleHint} />;
      case 'confianza_reflexion':
        return <PasoConfianzaReflexion step={current} {...commonProps} />;
      case 'opcion_multiple':
        return (
          <PasoOpcionMultiple
            step={current}
            {...commonProps}
            onHint={handleHint}
            immersive
            exposeController={(c: StepController) => setCtrl(c)}
            onUiFeedback={(text: string, kind: 'success' | 'info' | 'error') => setToast({ text, kind })}
          />
        );
      case 'prediccion':
        return (
          <PasoPrediccion
            step={current}
            {...commonProps}
            onHint={handleHint}
            immersive
            exposeController={(c: StepController) => setCtrl(c)}
            onUiFeedback={(text: string, kind: 'success' | 'info' | 'error') => setToast({ text, kind })}
          />
        );
      case 'comparacion_experto':
        return <PasoComparacionExperto step={current} {...commonProps} onHint={handleHint} />;
      case 'reexplicacion':
        return <PasoReexplicacion step={current} {...commonProps} onHint={handleHint} />;
      case 'transferencia':
        return (
          <PasoTransferencia
            step={current}
            {...commonProps}
            onHint={handleHint}
            immersive
            exposeController={(c: StepController) => setCtrl(c)}
            onUiFeedback={(text: string, kind: 'success' | 'info' | 'error') => setToast({ text, kind })}
          />
        );
      case 'pregunta_abierta_validada':
        return (
          <PasoPreguntaAbierta
            step={current}
            {...commonProps}
            onHint={handleHint}
            immersive
            exposeController={(c: StepController) => setCtrl(c)}
            onUiFeedback={(text: string, kind: 'success' | 'info' | 'error') => setToast({ text, kind })}
          />
        );
      default:
        {
          const c: any = current; // avoid 'never' narrowing on exhaustive switch
          return (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">{c?.titulo_paso ?? 'Paso'}</h2>
              <div className="p-3 rounded bg-black/20 border border-neutral-800">
                Tipo de paso no soportado aún: <code>{String(c?.tipo_paso ?? 'desconocido')}</code>
              </div>
              <button
                className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90"
                onClick={() => onStepComplete({ success: true, score: Number(c?.puntaje ?? 0) || 0, pistasUsadas: pistasUsadas[idx] ?? 0 })}
              >
                Continuar
              </button>
            </div>
          );
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, current, pistasUsadas, starsLeft, completed]);

  // Panel izquierdo persistente y panel derecho dinámico (layout inmersivo)
  const firstInstruction = steps.find((p) => p.tipo_paso === 'instruccion') as Extract<Paso, { tipo_paso: 'instruccion' }> | undefined;

  // CTA principal del bucle socrático
  const isInstruction = current?.tipo_paso === 'instruccion';
  const isCompleted = !!completed[idx];
  const lastOk = lastAttemptOk[idx] ?? null;
  const supportsGlobalCTA =
    isInstruction ||
    current?.tipo_paso === 'opcion_multiple' ||
    current?.tipo_paso === 'pregunta_abierta_validada' ||
    current?.tipo_paso === 'observacion' ||
    current?.tipo_paso === 'prediccion' ||
    current?.tipo_paso === 'transferencia';
  const primaryLabel = isInstruction
    ? (isCompleted ? 'Continuar' : 'Comenzar')
    : isCompleted
      ? (idx < totalSteps - 1 ? 'Continuar' : 'Finalizar')
      : lastOk === false
        ? 'Reintentar'
        : 'Probar';

  const canSubmit = isInstruction ? true : (ctrl?.canSubmit?.() ?? false);
  const primaryDisabled = isCompleted ? (idx >= totalSteps - 1 && !isInstruction) : !canSubmit;

  function onPrimaryClick() {
    if (isInstruction) {
      if (!isCompleted) {
        onStepComplete({ success: true, score: Number(current?.puntaje ?? 0) || 0, pistasUsadas: pistasUsadas[idx] ?? 0 });
      } else if (idx < totalSteps - 1) {
        goNext();
      }
      return;
    }
    if (!isCompleted) {
      ctrl?.submit?.();
      return;
    }
    if (idx < totalSteps - 1) goNext();
  }

  const used = pistasUsadas[idx] ?? 0;
  const nextPista = (current as any)?.pistas?.[Math.min(used, (((current as any)?.pistas?.length ?? 1) - 1))];
  const nextCost = nextPista?.costo ?? 1;
  const canAskHint = supportsGlobalCTA && !isInstruction && !isCompleted && (ctrl?.canAskHint?.() ?? false);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Panel de contexto (izquierda) */}
        <aside className="md:col-span-1 space-y-4">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">{workshop.titulo}</h1>
            {workshop.metadata && (
              <div className="flex flex-wrap gap-2 text-sm text-neutral-300">
                {workshop.metadata.grado && (
                  <span className="px-2 py-0.5 rounded bg-black/30 border border-neutral-800">Grado: {workshop.metadata.grado}</span>
                )}
                {workshop.metadata.materia && (
                  <span className="px-2 py-0.5 rounded bg-black/30 border border-neutral-800">Materia: {workshop.metadata.materia}</span>
                )}
                {typeof workshop.metadata.duracion_estimada_min === 'number' && (
                  <span className="px-2 py-0.5 rounded bg-black/30 border border-neutral-800">Duración ~{workshop.metadata.duracion_estimada_min} min</span>
                )}
              </div>
            )}
            <p className="text-neutral-400 text-xs">
              {classToken ? (
                <>
                  Grupo: {classToken}
                  {' '}
                  <a
                    className="underline decoration-neutral-600 hover:decoration-neutral-300"
                    href={`/join?t=${encodeURIComponent(classToken)}`}
                  >
                    Cambiar alias
                  </a>
                </>
              ) : (
                'Sesión local'
              )}
              {workshop.content_version ? ` · Contenido: ${workshop.content_version}` : ''}
            </p>
          </header>

          <MissionProgress totalSteps={totalSteps} completedSteps={completedCount} starsLeft={starsLeft} />

          {firstInstruction && (
            <div className="space-y-2 p-3 rounded bg-black/20 border border-neutral-800">
              <h3 className="text-lg font-semibold">{firstInstruction.titulo_paso}</h3>
              {firstInstruction.instruccion?.texto && (
                <div className="text-neutral-200 whitespace-pre-wrap">{firstInstruction.instruccion.texto}</div>
              )}
            </div>
          )}
        </aside>

        {/* Panel de interacción (derecha) */}
        <section className="md:col-span-2 space-y-4">
          <div className="space-y-1">
            <div className="text-neutral-400 text-sm">Paso {idx + 1} de {totalSteps}</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Fallback de navegación para pasos no integrados al CTA global */}
          {!supportsGlobalCTA && isCompleted && (
            <div className="pt-2">
              <button
                className="px-4 py-2 bg-neutral-800 text-white rounded disabled:opacity-50"
                onClick={() => idx < totalSteps - 1 ? goNext() : undefined}
                disabled={idx >= totalSteps - 1}
              >
                {idx < totalSteps - 1 ? 'Continuar →' : 'Último paso'}
              </button>
            </div>
          )}

          {/* Barra de acciones: solo si el paso soporta CTA global */}
          {supportsGlobalCTA && (
            <div className="flex gap-2 items-center pt-2 border-t border-neutral-800">
              <button
                className="px-4 py-2 bg-turquoise text-black rounded hover:opacity-90 disabled:opacity-50"
                onClick={onPrimaryClick}
                disabled={primaryDisabled}
              >
                {primaryLabel}
              </button>

              {canAskHint && (
                <button
                  type="button"
                  className="px-4 py-2 bg-neutral-800 text-white rounded hover:opacity-90 disabled:opacity-50"
                  onClick={() => ctrl?.askHint?.()}
                >
                  {`Pedir pista (-${nextCost}⭐)`}
                </button>
              )}

              <div className="ml-auto text-sm text-neutral-400">Autonomía: {starsLeft}/3</div>
            </div>
          )}

          {toast && (
            <div
              className={`mt-2 inline-block px-3 py-2 rounded border text-sm ${toast.kind === 'success' ? 'bg-green-900/20 border-green-600/40 text-green-200' : toast.kind === 'error' ? 'bg-red-900/20 border-red-600/40 text-red-200' : 'bg-neutral-900/40 border-neutral-700 text-neutral-200'}`}
              role="status"
            >
              {toast.text}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
