"use client";
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { Workshop, Paso, Recurso } from '@/lib/workshops/schema';
import MissionProgress from './MissionProgress';
import { type StepComplete } from './PasoInstruccion';
import PasoObservacion from './PasoObservacion';
import PasoCazaErrores from './PasoCazaErrores';
import PasoOrdenarPasos from './PasoOrdenarPasos';
import PasoConfianzaReflexion from './PasoConfianzaReflexion';
import PasoInstruccion from './PasoInstruccion';
import PasoPrediccion from './PasoPrediccion';
import PasoOpcionMultiple from './PasoOpcionMultiple';
import PasoPreguntaAbierta from './PasoPreguntaAbierta';
import { trackEvent } from '@/lib/track';
import { AnimatePresence, motion } from 'framer-motion';
import PasoComparacionExperto from './PasoComparacionExperto';
import PasoReexplicacion from './PasoReexplicacion';
import PasoTransferencia from './PasoTransferencia';
import PasoTerminalCanvas from './PasoTerminalCanvas';
import PasoLogicScaffold from './PasoLogicScaffold';
import PasoSocraticoCht from './PasoSocraticoCht';
import type { StepController } from './types';
import { getOrCreateSessionId } from '@/lib/session';
import { useCanonicalAlias } from '@/lib/alias';
import { BookOpen, GraduationCap, Clock, Target, Sparkles, Lightbulb, Briefcase, Flag, X as XIcon } from 'lucide-react';
import { useFrictionDetector, frictionSignalToCopy } from '@/hooks/useFrictionDetector';
import KnowledgeSanctuary from './KnowledgeSanctuary';
import MissionComplete from './MissionComplete';
import MissionLocked from './MissionLocked';
import { 
  loadWorkshopProgress, 
  saveWorkshopProgress, 
  createStepState, 
  updateStepState,
  markWorkshopCompleted,
  isWorkshopCompleted,
  type WorkshopProgress,
  type StepState
} from '@/lib/workshopState';

type Props = {
  workshop: Workshop;
  classToken?: string;
};

export default function InteractivePlayer({ workshop, classToken }: Props) {
  const steps = workshop.pasos ?? [];
  const tallerId = workshop.id_taller;
  const checksum = workshop.checksum;
  const [sessionId] = useState<string>(() => getOrCreateSessionId(classToken));
  const { alias: canonicalAlias, loading: aliasLoading } = useCanonicalAlias(classToken, sessionId);

  // Estado local-first: Rehidratar desde localStorage o inicializar
  const [progress, setProgress] = useState<WorkshopProgress>(() => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return {
        taller_id: tallerId,
        student_session_id: sessionId,
        paso_actual: 0,
        paso_states: {},
        ultima_actualizacion: Date.now(),
        completado: false,
      };
    }

    const saved = loadWorkshopProgress(sessionId, tallerId);
    if (saved) {
      return saved;
    }

    // Nuevo progreso
    return {
      taller_id: tallerId,
      student_session_id: sessionId,
      paso_actual: 0,
      paso_states: {},
      ultima_actualizacion: Date.now(),
      completado: false,
    };
  });
  
  // Estados derivados del progreso
  const [idx, setIdx] = useState(progress.paso_actual);
  const [pistasUsadas, setPistasUsadas] = useState<Record<number, number>>(
    () => {
      const map: Record<number, number> = {};
      Object.entries(progress.paso_states).forEach(([stepIdx, state]) => {
        map[Number(stepIdx)] = state.pistas_usadas;
      });
      return map;
    }
  );
  const [completed, setCompleted] = useState<Record<number, boolean>>(
    () => {
      const map: Record<number, boolean> = {};
      Object.entries(progress.paso_states).forEach(([stepIdx, state]) => {
        map[Number(stepIdx)] = state.completado;
      });
      return map;
    }
  );
  const [lastAttemptOk, setLastAttemptOk] = useState<Record<number, boolean | null>>({});
  const [ctrl, setCtrl] = useState<StepController | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'info' | 'error' } | null>(null);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  
  // Estado del Santuario del Conocimiento
  const [sanctuaryOpen, setSanctuaryOpen] = useState(false);
  const [sanctuaryRecursos, setSanctuaryRecursos] = useState<Recurso[]>([]);
  const [mobileTab, setMobileTab] = useState<'trabajo' | 'mision'>('trabajo'); // Por defecto en la tarea
  
  // Estado de misión completada y bloqueada
  const [showMissionComplete, setShowMissionComplete] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedData, setLockedData] = useState<{ completedAt?: string; stars?: number }>({});

  // Exponer función global para agregar recursos dinámicamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addSanctuaryResource = (recurso: Recurso) => {
        setSanctuaryRecursos(prev => [...prev, recurso]);
        setSanctuaryOpen(true); // Auto-abrir cuando se agrega un recurso
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addSanctuaryResource;
      }
    };
  }, []);

  // FASE 2: Verificar si la misión está bloqueada (ya completada)
  // ÚNICA FUENTE DE VERDAD: Supabase
  useEffect(() => {
    async function checkIfLocked() {
      if (typeof window === 'undefined') return;
      if (classToken && aliasLoading) return;
      if (!canonicalAlias) return; // Necesitamos el alias para verificar
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) return;
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Query directa: verificar si existe evento de taller_completado
      const { data, error } = await supabase
        .from('eventos_de_aprendizaje')
        .select('ts, result')
        .eq('taller_id', tallerId)
        .eq('verbo', 'taller_completado')
        .eq('result->>alias', canonicalAlias)
        .order('ts', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setLockedData({
          completedAt: data.ts,
          stars: data.result?.estrellas_finales,
        });
        setIsLocked(true);
      }
    }
    
    checkIfLocked();
  }, [sessionId, tallerId, canonicalAlias, aliasLoading, classToken]);

  // Persistencia automática: Guardar progreso en localStorage en cada cambio
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLocked) {
      const updatedProgress: WorkshopProgress = {
        ...progress,
        paso_actual: idx,
        ultima_actualizacion: Date.now(),
      };
      saveWorkshopProgress(updatedProgress);
    }
  }, [idx, progress, tallerId, sessionId, isLocked]);

  useEffect(() => {
    if (hasTrackedStart) return;
    if (classToken && aliasLoading) return;
    trackEvent('inicio_taller', {
      tallerId,
      pasoId: `paso-${steps[0]?.paso_numero ?? 1}`,
      classToken,
      result: { totalSteps: steps.length },
      checksum,
      sid: sessionId,
    });
    setHasTrackedStart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, aliasLoading, hasTrackedStart]);

  // Autocierre de toasts sutiles
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Inicializar estado del paso cuando se navega a uno nuevo
  useEffect(() => {
    const stepState = progress.paso_states[idx];
    if (!stepState) {
      // Crear nuevo estado para este paso
      setProgress((prev) => updateStepState(prev, idx, createStepState()));
    }
  }, [idx, progress.paso_states]);

  const totalSteps = steps.length;
  const current = steps[idx];
  const completedCount = useMemo(() => Object.values(completed).filter(Boolean).length, [completed]);

  // Actualizar recursos del Santuario cuando cambia el paso
  useEffect(() => {
    if (current?.recursos_del_paso) {
      const recursos = current.recursos_del_paso;
      setSanctuaryRecursos(recursos);
    }
  }, [idx, steps]);

  // Friction detector: observa intentos fallidos, tiempo y emite señales
  // que disparan un offer de pista en la UI (sin costo de estrellas).
  const currentStepState = progress.paso_states[idx];
  const frictionDetector = useFrictionDetector({
    stepType: current?.tipo_paso ?? 'instruccion',
    stepKey: `${tallerId}:${idx}`,
    failedAttempts: currentStepState?.intentos_fallidos ?? 0,
    startedAt: currentStepState?.tiempo_inicio,
  });

  function goNext() {
    const next = Math.min(idx + 1, totalSteps - 1);
    setIdx(next);
  }

  function goPrev() {
    const prev = Math.max(idx - 1, 0);
    setIdx(prev);
  }

  // REFACTORED: Sin sistema de costo. Solo registramos que se aceptaron pistas
  // (la fricción se detecta automáticamente y se ofrece la pista; el alumno decide).
  // El argumento `cost` se ignora; se mantiene en la firma por backward-compat con
  // los Paso* que aún lo pasan.
  const handleHint = useCallback((_cost?: number) => {
    setPistasUsadas((m) => ({ ...m, [idx]: (m[idx] ?? 0) + 1 }));

    // Actualizar estado local del paso
    setProgress((prev) => {
      const stepState = prev.paso_states[idx] || createStepState();
      return updateStepState(prev, idx, {
        ...stepState,
        pistas_usadas: stepState.pistas_usadas + 1,
      });
    });

    // NO enviar evento 'solicito_pista' - se incluirá en el evento agregado al completar
  }, [idx]);

  async function onStepComplete(res: StepComplete) {
    const pasoId = current ? String(current.paso_numero ?? idx + 1) : String(idx + 1);
    const success = !!res.success;

    // Actualizar estado local del paso
    const stepState = progress.paso_states[idx] || createStepState();
    
    if (!success) {
      // Intento fallido: solo actualizar estado local
      setLastAttemptOk((m) => ({ ...m, [idx]: false }));
      
      setProgress((prev) => updateStepState(prev, idx, {
        ...stepState,
        intentos_fallidos: stepState.intentos_fallidos + 1,
        respuestas_incorrectas: [...stepState.respuestas_incorrectas, res],
      }));
      
      // NO enviar evento - se acumula localmente
      return;
    }

    // ✅ ÉXITO: Completar paso y enviar evento AGREGADO
    setCompleted((m) => ({ ...m, [idx]: true }));
    setLastAttemptOk((m) => ({ ...m, [idx]: true }));
    
    // Calcular tiempo total del paso
    const tiempoTotal = stepState.tiempo_inicio 
      ? (Date.now() - stepState.tiempo_inicio) / 1000 
      : 0;
    
    // Actualizar estado local con paso completado
    const updatedStepState: StepState = {
      ...stepState,
      completado: true,
      tiempo_total: tiempoTotal,
    };
    
    setProgress((prev) => updateStepState(prev, idx, updatedStepState));
    
    // 🚀 ENVIAR EVENTO AGREGADO (único evento por paso)
    await trackEvent('completo_paso', {
      tallerId,
      pasoId,
      classToken,
      result: {
        success: true,
        score: res.score ?? 0,
        // Datos agregados del paso completo
        intentos_totales: updatedStepState.intentos_fallidos + 1, // +1 por el intento exitoso
        intentos_fallidos: updatedStepState.intentos_fallidos,
        pistas_usadas: updatedStepState.pistas_usadas,
        tiempo_segundos: tiempoTotal,
        respuestas_incorrectas: updatedStepState.respuestas_incorrectas,
      },
      checksum,
      sid: sessionId,
    });
    
    // Si es el último paso, completar taller
    if (idx === totalSteps - 1) {
      // Calcular pistas totales aceptadas a lo largo del taller (autonomía inversa)
      const pistasTotalesAceptadas = Object.values(
        // mezcla de estado actual + el paso recién completado
        { ...progress.paso_states, [idx]: updatedStepState },
      ).reduce((sum, s) => sum + (s?.pistas_usadas ?? 0), 0);

      await trackEvent('taller_completado', {
        tallerId,
        pasoId,
        classToken,
        result: {
          pistas_aceptadas_total: pistasTotalesAceptadas,
          pasos_completados: totalSteps,
        },
        checksum,
        sid: sessionId,
      });
      
      // Marcar como completado en localStorage
      markWorkshopCompleted(sessionId, tallerId);
      setShowMissionComplete(true);
      return;
    }
    
    // Avanzar automáticamente solo en pasos de instrucción
    if (current?.tipo_paso === 'instruccion' && idx < totalSteps - 1) {
      goNext();
    }
  }

  const content = useMemo(() => {
    if (!current) return null;
    const commonProps = {
      onComplete: onStepComplete,
      pistasUsadas: pistasUsadas[idx] ?? 0,
      disabledInputs: completed[idx] ?? false,
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
      case 'terminal_canvas':
        return (
          <PasoTerminalCanvas
            step={current}
            {...commonProps}
            onHint={handleHint}
            classToken={classToken}
            tallerId={tallerId}
          />
        );
      case 'logic_scaffold':
        return (
          <PasoLogicScaffold
            step={current}
            {...commonProps}
            onHint={handleHint}
            classToken={classToken}
            tallerId={tallerId}
          />
        );
      case 'socratico_chat':
        return (
          <PasoSocraticoCht
            step={current}
            {...commonProps}
            classToken={classToken}
            tallerId={tallerId}
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
  }, [idx, current, pistasUsadas, completed]);

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

  const canAskHint = supportsGlobalCTA && !isInstruction && !isCompleted && (ctrl?.canAskHint?.() ?? false);

  // FASE 2: Si la misión está bloqueada (ya completada anteriormente), mostrar pantalla de bloqueo
  if (isLocked) {
    return (
      <MissionLocked
        workshopTitle={workshop.titulo || 'Taller'}
        workshopId={workshop.id_taller}
        completedAt={lockedData.completedAt}
        finalStars={lockedData.stars}
      />
    );
  }

  // Si la misión acaba de completarse, mostrar pantalla de felicitación
  if (showMissionComplete) {
    const totalHintsAccepted = Object.values(progress.paso_states).reduce(
      (sum, s) => sum + (s?.pistas_usadas ?? 0),
      0,
    );
    return (
      <MissionComplete
        workshopTitle={workshop.titulo || 'Taller'}
        workshopId={workshop.id_taller}
        totalSteps={totalSteps}
        completedSteps={totalSteps}
        totalHintsAccepted={totalHintsAccepted}
        autoRedirect={true}
        redirectDelay={4000}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto md:p-6 p-0">
      <div className="bg-neutral-900/60 backdrop-blur-sm md:rounded-2xl shadow-2xl border-t md:border border-neutral-800/50 overflow-hidden">
        {/* Pestañas móviles - Solo visible en pantallas pequeñas */}
        <div className="md:hidden bg-neutral-900/95 border-b border-neutral-800/50 sticky top-0 z-30">
          <div className="grid grid-cols-2">
            <button
              onClick={() => setMobileTab('trabajo')}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all ${
                mobileTab === 'trabajo'
                  ? 'text-turquoise border-b-2 border-turquoise bg-turquoise/5'
                  : 'text-neutral-400 border-b-2 border-transparent'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Tu Trabajo</span>
            </button>
            <button
              onClick={() => setMobileTab('mision')}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all ${
                mobileTab === 'mision'
                  ? 'text-lime border-b-2 border-lime bg-lime/5'
                  : 'text-neutral-400 border-b-2 border-transparent'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>La Misión</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0">
          {/* Panel de contexto (izquierda) - Tarjeta de Misión */}
          <aside className={`
            md:col-span-1 bg-gradient-to-b from-neutral-900/80 to-neutral-900/40 
            md:border-r border-neutral-800/50 p-4 md:p-6 space-y-4 md:space-y-6
            ${mobileTab === 'mision' ? 'block' : 'hidden md:block'}
          `}>
              <header className="space-y-4">
                <div className="space-y-2">
                  <motion.h1 
                    className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent leading-tight"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {workshop.titulo}
                  </motion.h1>
                </div>

                {workshop.metadata && (
                  <div className="flex flex-wrap gap-2">
                    {workshop.metadata.grado && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 border border-neutral-700/50 text-sm text-neutral-200 backdrop-blur-sm">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {workshop.metadata.grado}
                      </span>
                    )}
                    {workshop.metadata.materia && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 border border-neutral-700/50 text-sm text-neutral-200 backdrop-blur-sm">
                        <BookOpen className="w-3.5 h-3.5" />
                        {workshop.metadata.materia}
                      </span>
                    )}
                    {typeof workshop.metadata.duracion_estimada_min === 'number' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 border border-neutral-700/50 text-sm text-neutral-200 backdrop-blur-sm">
                        <Clock className="w-3.5 h-3.5" />
                        ~{workshop.metadata.duracion_estimada_min} min
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 space-y-1 text-xs text-neutral-400 border-t border-neutral-800/50">
                  {classToken ? (
                    <>
                      <p>Grupo: <span className="text-neutral-300 font-medium">{classToken}</span></p>
                      {canonicalAlias && (
                        <p>Estudiante: <span className="text-turquoise font-medium">{canonicalAlias}</span></p>
                      )}
                      <a
                        className="inline-block mt-1 text-neutral-400 hover:text-neutral-200 underline decoration-neutral-700 hover:decoration-neutral-400 transition-colors"
                        href={`/join?t=${encodeURIComponent(classToken)}`}
                      >
                        Cambiar alias
                      </a>
                    </>
                  ) : (
                    <p>Sesión local</p>
                  )}
                  {workshop.content_version && (
                    <p className="text-neutral-500">v{workshop.content_version}</p>
                  )}
                </div>
              </header>

              <MissionProgress totalSteps={totalSteps} completedSteps={completedCount} />

              {firstInstruction && (
                <motion.div 
                  className="relative space-y-3 p-4 rounded-xl bg-gradient-to-br from-neutral-800/60 to-neutral-800/30 border border-neutral-700/50 backdrop-blur-sm shadow-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="absolute top-3 right-3 text-lime/20">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex items-start gap-2">
                    <Target className="w-5 h-5 text-lime mt-0.5 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-neutral-100 leading-tight">{firstInstruction.titulo_paso}</h3>
                  </div>
                  {firstInstruction.instruccion?.texto && (
                    <div className="text-neutral-300 whitespace-pre-wrap leading-relaxed text-sm pl-7">
                      {firstInstruction.instruccion.texto}
                    </div>
                  )}
                </motion.div>
              )}
          </aside>

          {/* Panel de interacción (derecha) - El Espacio de Trabajo */}
          <section className={`
            md:col-span-2 p-4 md:p-6 space-y-4 md:space-y-6
            ${mobileTab === 'trabajo' ? 'block' : 'hidden md:block'}
          `}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Sparkles className="w-4 h-4" />
                <span>Paso {idx + 1} de {totalSteps}</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`step-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Fallback de navegación para pasos no integrados al CTA global */}
            {!supportsGlobalCTA && isCompleted && (
              <div className="pt-2">
                <motion.button
                  className="px-4 py-2 bg-neutral-800 text-white rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition-colors"
                  onClick={() => idx < totalSteps - 1 ? goNext() : undefined}
                  disabled={idx >= totalSteps - 1}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {idx < totalSteps - 1 ? 'Continuar →' : 'Último paso'}
                </motion.button>
              </div>
            )}

            {/* Barra de acciones: solo si el paso soporta CTA global */}
            {supportsGlobalCTA && (
              <div className="flex flex-wrap gap-3 items-center pt-4 border-neutral-800/50">
                <motion.button
                  className="relative px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-xl shadow-lg shadow-turquoise/20 hover:shadow-turquoise/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group"
                  onClick={onPrimaryClick}
                  disabled={primaryDisabled}
                  whileHover={!primaryDisabled ? { scale: 1.02, y: -1 } : {}}
                  whileTap={!primaryDisabled ? { scale: 0.98 } : {}}
                >
                  <span className="relative z-10">{primaryLabel}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-lime to-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>

                {canAskHint && (
                  <motion.button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-800/80 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700/50 backdrop-blur-sm transition-all shadow-sm"
                    onClick={() => {
                      ctrl?.askHint?.();
                      frictionDetector.reset();
                    }}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>Pedir pista</span>
                  </motion.button>
                )}
              </div>
            )}

            {/* Friction detector: ofrece pista proactivamente cuando hay señal de fricción */}
            <AnimatePresence>
              {frictionDetector.latestSignal && canAskHint && supportsGlobalCTA && (
                <motion.div
                  key={`friction-${frictionDetector.latestSignal.detectedAt}`}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 shadow-sm"
                  role="status"
                  aria-live="polite"
                >
                  <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm space-y-2">
                    <p className="leading-relaxed">
                      {frictionSignalToCopy(frictionDetector.latestSignal)}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          ctrl?.askHint?.();
                          frictionDetector.reset();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 font-medium text-xs transition-all"
                      >
                        Sí, dame una pista
                      </button>
                      <button
                        type="button"
                        onClick={() => frictionDetector.reset()}
                        className="text-xs text-amber-200/70 hover:text-amber-100 underline-offset-2 hover:underline transition-colors"
                      >
                        Sigo intentando
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => frictionDetector.reset()}
                    className="text-amber-200/60 hover:text-amber-100 transition-colors"
                    aria-label="Cerrar"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {toast && (
              <motion.div
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
                  toast.kind === 'success'
                    ? 'bg-green-900/30 border-green-600/50 text-green-200 shadow-green-900/20'
                    : toast.kind === 'error'
                      ? 'bg-red-900/30 border-red-600/50 text-red-200 shadow-red-900/20'
                      : 'bg-neutral-800/60 border-neutral-700/50 text-neutral-200'
                }`}
                role="status"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {toast.text}
              </motion.div>
            )}
          </section>
        </div>
      </div>

      {/* Botón flotante del Santuario */}
      {sanctuaryRecursos.length > 0 && (
        <motion.button
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-br from-turquoise to-lime text-black shadow-2xl hover:shadow-turquoise/50 hover:scale-110 transition-all"
          onClick={() => setSanctuaryOpen(!sanctuaryOpen)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          aria-label={sanctuaryOpen ? "Cerrar Santuario" : "Abrir Santuario"}
        >
          <BookOpen className="w-6 h-6" />
          {sanctuaryRecursos.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {sanctuaryRecursos.length}
            </span>
          )}
        </motion.button>
      )}

      {/* Santuario del Conocimiento */}
      <KnowledgeSanctuary
        isOpen={sanctuaryOpen}
        onClose={() => setSanctuaryOpen(false)}
        recursos={sanctuaryRecursos}
      />
    </div>
  );
}
