/**
 * useFrictionDetector — Detecta señales de fricción en el flujo del alumno
 * y permite al InteractivePlayer ofrecer pistas de forma proactiva, sin costo.
 *
 * Reemplaza el sistema de estrellas-costo previo. La ayuda se OFRECE cuando
 * el sistema detecta que el alumno lo necesita, no cuando el alumno "paga"
 * por ella.
 *
 * Señales que detecta:
 *   - multiple_failed_attempts: ≥2 intentos fallidos consecutivos
 *   - inactive_pause:           ≥30s sin actividad del alumno
 *   - overtime:                 ≥1.5x el tiempo mediano esperado por tipo de paso
 *   - paste_attempts_high:      ≥3 intentos de pegado en terminal/textarea
 *   - massive_deletion:         borrado ≥50% del texto en <5s (emitido por la paso)
 */

"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

export type FrictionSignalType =
  | 'multiple_failed_attempts'
  | 'inactive_pause'
  | 'overtime'
  | 'paste_attempts_high'
  | 'massive_deletion';

export interface FrictionSignal {
  type: FrictionSignalType;
  detectedAt: number;
  /**
   * Valor numérico asociado a la señal:
   *   - multiple_failed_attempts: número de intentos fallidos
   *   - inactive_pause: milisegundos sin actividad
   *   - overtime: ratio tiempo actual / mediana (ej. 1.7)
   *   - paste_attempts_high: número de intentos de paste
   *   - massive_deletion: porcentaje borrado (0-100)
   */
  value: number;
}

export interface FrictionDetectorInput {
  stepType: string;
  /** Clave única por paso para reiniciar estado al navegar */
  stepKey: string;
  /** Intentos fallidos acumulados en este paso */
  failedAttempts: number;
  /** Timestamp (ms) en que el paso se volvió activo */
  startedAt?: number;
  /** Número acumulado de intentos de pegado en este paso */
  pasteAttempts?: number;
  /** Tiempo mediano esperado (segundos) — override del default por tipo */
  expectedMedianTimeSec?: number;
}

export interface FrictionDetectorOutput {
  signals: FrictionSignal[];
  latestSignal: FrictionSignal | null;
  /** El paso component llama a esto cuando detecta actividad del alumno (typing, click) */
  recordActivity: () => void;
  /** El paso component llama a esto al detectar borrado masivo (≥50% en <5s) */
  recordDeletionEpisode: (percentDeleted: number) => void;
  /** Limpia todas las señales (p.ej. al navegar a otro paso manualmente) */
  reset: () => void;
}

/**
 * Tiempos medianos esperados por tipo de paso (segundos).
 * Basados en estimación; se pueden ajustar con telemetría agregada real.
 */
const DEFAULT_MEDIAN_BY_TYPE: Record<string, number> = {
  terminal_canvas: 180,
  logic_scaffold: 120,
  socratico_chat: 240,
  pregunta_abierta_validada: 90,
  opcion_multiple: 30,
  caza_errores: 90,
  ordenar_pasos: 60,
  observacion: 60,
  prediccion: 60,
  comparacion_experto: 90,
  reexplicacion: 120,
  transferencia: 120,
  confianza_reflexion: 30,
  instruccion: 30,
};

const THRESHOLDS = {
  multipleFailedAttempts: 2,
  inactivePauseMs: 30_000,
  overtimeRatio: 1.5,
  pasteAttemptsHigh: 3,
  massiveDeletionPct: 50,
} as const;

export function useFrictionDetector(input: FrictionDetectorInput): FrictionDetectorOutput {
  const [signals, setSignals] = useState<FrictionSignal[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const stepKeyRef = useRef<string>(input.stepKey);
  const firedDedupeRef = useRef<Set<string>>(new Set());

  // Reset cuando el paso cambia (nueva stepKey)
  useEffect(() => {
    if (stepKeyRef.current !== input.stepKey) {
      stepKeyRef.current = input.stepKey;
      setSignals([]);
      firedDedupeRef.current = new Set();
      lastActivityRef.current = Date.now();
    }
  }, [input.stepKey]);

  // Detección: intentos fallidos
  useEffect(() => {
    if (input.failedAttempts >= THRESHOLDS.multipleFailedAttempts) {
      const dedupeKey = `multiple_failed_attempts_${input.failedAttempts}`;
      if (!firedDedupeRef.current.has(dedupeKey)) {
        firedDedupeRef.current.add(dedupeKey);
        setSignals((prev) => [
          ...prev,
          {
            type: 'multiple_failed_attempts',
            detectedAt: Date.now(),
            value: input.failedAttempts,
          },
        ]);
      }
    }
  }, [input.failedAttempts]);

  // Detección: paste attempts
  useEffect(() => {
    const count = input.pasteAttempts ?? 0;
    if (count >= THRESHOLDS.pasteAttemptsHigh) {
      const dedupeKey = `paste_attempts_high_${count}`;
      if (!firedDedupeRef.current.has(dedupeKey)) {
        firedDedupeRef.current.add(dedupeKey);
        setSignals((prev) => [
          ...prev,
          {
            type: 'paste_attempts_high',
            detectedAt: Date.now(),
            value: count,
          },
        ]);
      }
    }
  }, [input.pasteAttempts]);

  // Detección: inactividad + overtime (tick cada 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const sinceActivity = now - lastActivityRef.current;

      // Pausa por inactividad — dedupe por "episodio" (cada bloque de 30s)
      if (sinceActivity >= THRESHOLDS.inactivePauseMs) {
        const episode = Math.floor(sinceActivity / THRESHOLDS.inactivePauseMs);
        const dedupeKey = `inactive_pause_${episode}`;
        if (!firedDedupeRef.current.has(dedupeKey)) {
          firedDedupeRef.current.add(dedupeKey);
          setSignals((prev) => [
            ...prev,
            {
              type: 'inactive_pause',
              detectedAt: now,
              value: sinceActivity,
            },
          ]);
        }
      }

      // Overtime — fira una sola vez por paso
      if (input.startedAt && !firedDedupeRef.current.has('overtime')) {
        const elapsedSec = (now - input.startedAt) / 1000;
        const median =
          input.expectedMedianTimeSec ?? DEFAULT_MEDIAN_BY_TYPE[input.stepType] ?? 120;
        const ratio = elapsedSec / median;
        if (ratio >= THRESHOLDS.overtimeRatio) {
          firedDedupeRef.current.add('overtime');
          setSignals((prev) => [
            ...prev,
            {
              type: 'overtime',
              detectedAt: now,
              value: Math.round(ratio * 100) / 100,
            },
          ]);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [input.startedAt, input.stepType, input.expectedMedianTimeSec]);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const recordDeletionEpisode = useCallback((percentDeleted: number) => {
    if (percentDeleted >= THRESHOLDS.massiveDeletionPct) {
      const dedupeKey = `massive_deletion_${Math.floor(percentDeleted)}`;
      if (!firedDedupeRef.current.has(dedupeKey)) {
        firedDedupeRef.current.add(dedupeKey);
        setSignals((prev) => [
          ...prev,
          {
            type: 'massive_deletion',
            detectedAt: Date.now(),
            value: Math.round(percentDeleted),
          },
        ]);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setSignals([]);
    firedDedupeRef.current = new Set();
    lastActivityRef.current = Date.now();
  }, []);

  const latestSignal = signals.length > 0 ? signals[signals.length - 1]! : null;

  return {
    signals,
    latestSignal,
    recordActivity,
    recordDeletionEpisode,
    reset,
  };
}

/**
 * Helper: devuelve un copy amable para mostrar al alumno según el tipo de señal.
 */
export function frictionSignalToCopy(signal: FrictionSignal): string {
  switch (signal.type) {
    case 'multiple_failed_attempts':
      return 'Veo que esto te está costando trabajo. ¿Quieres una pista?';
    case 'inactive_pause':
      return 'Tómate tu tiempo. Si necesitas un empujón, puedo ayudarte.';
    case 'overtime':
      return 'Has pensado bastante en esto. ¿Prefieres que te dé una pista?';
    case 'paste_attempts_high':
      return 'El proceso importa más que la velocidad. Si te atoras, pide una pista.';
    case 'massive_deletion':
      return 'Parece que estás reformulando mucho. ¿Quieres una pista para empezar?';
    default:
      return '¿Necesitas una pista?';
  }
}
