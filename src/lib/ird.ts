/**
 * Índice de Retención Durable (IRD)
 *
 * Métrica core del producto. Reemplaza al CGI antiguo (que era reactivo y
 * punitivo) por una visión constructiva: ¿qué tanto del aprendizaje del
 * alumno es DURABLE? Es decir, sobrevive 21 días sin re-exposición.
 *
 * Componentes (escala 0-100):
 *   - retention_strength (40%): puntaje en transfer-test a 21 días
 *   - autonomy (30%):           1 − (pistas_aceptadas / max_pistas_disponibles)
 *   - process_quality (30%):    inverse de friction signals + paste attempts
 *
 * IRD se calcula POR TALLER y se agrega POR ALUMNO/COHORTE para reportes
 * institucionales (EvidenceReport).
 */

import type { Workshop } from './workshops/schema';
import type { WorkshopProgress } from './workshopState';

// ============================================
// TIPOS
// ============================================

export interface IRDComponents {
  /** 0-100. Puntaje en transfer-test a 21 días. */
  retention_strength: number;
  /** 0-100. Independencia: 100 = sin pistas; 0 = pistas en todos los pasos. */
  autonomy: number;
  /** 0-100. Calidad del proceso: alta = pocas señales de fricción extrema, sin paste-attempts. */
  process_quality: number;
}

export interface IRDInput {
  workshop: Pick<Workshop, 'pasos'>;
  progress: Pick<WorkshopProgress, 'paso_states'>;
  /**
   * Resultado del transfer-test a 21 días (0-100). Si todavía no se ha aplicado
   * el test, pasa `undefined` y el IRD se calcula como "preliminar" sin ese factor.
   */
  transferTestScore?: number;
  /** Total de intentos de paste detectados durante el taller (de telemetría). */
  totalPasteAttempts?: number;
  /** Total de señales de fricción severa detectadas (multiple_failed + overtime). */
  totalSevereFrictionSignals?: number;
}

export interface IRDResult {
  /** 0-100. Métrica principal. */
  score: number;
  components: IRDComponents;
  /** Si transferTestScore es undefined, este flag es true e indica un IRD provisional. */
  is_preliminary: boolean;
  /** Cohorte/clasificación cualitativa del IRD. */
  band: 'durable' | 'fragile' | 'shallow' | 'incomplete';
  /** Pasos completados / total. */
  completion: { completed: number; total: number };
}

// ============================================
// PESOS Y UMBRALES
// ============================================

const WEIGHTS = {
  retention_strength: 0.4,
  autonomy: 0.3,
  process_quality: 0.3,
} as const;

const BANDS = {
  durable: 80, // ≥80
  fragile: 60, // 60-79
  shallow: 40, // 40-59
  // <40 = incomplete
} as const;

// ============================================
// CÁLCULO PRINCIPAL
// ============================================

/**
 * Calcula el IRD de un alumno en un taller específico.
 */
export function computeIRD(input: IRDInput): IRDResult {
  const { workshop, progress, transferTestScore, totalPasteAttempts, totalSevereFrictionSignals } = input;

  const pasos = workshop.pasos ?? [];
  const totalSteps = pasos.length;
  const stepStates = Object.values(progress.paso_states ?? {});
  const completedSteps = stepStates.filter((s) => s?.completado).length;

  // 1. Retention strength (transfer-test a 21 días)
  const retention_strength = transferTestScore ?? 50; // default neutro si no hay test

  // 2. Autonomy: 1 − (pistas_aceptadas / max_pistas_disponibles)
  const totalAvailableHints = pasos.reduce((sum, p) => sum + (p.pistas?.length ?? 0), 0);
  const totalUsedHints = stepStates.reduce((sum, s) => sum + (s?.pistas_usadas ?? 0), 0);
  const autonomy =
    totalAvailableHints > 0
      ? Math.max(0, Math.min(100, (1 - totalUsedHints / totalAvailableHints) * 100))
      : 100;

  // 3. Process quality: penalty by paste attempts + severe friction signals
  const pasteAttempts = totalPasteAttempts ?? 0;
  const severeSignals = totalSevereFrictionSignals ?? 0;
  // 100 base, − 5 por cada paste, − 8 por cada señal severa, con piso de 0
  const process_quality = Math.max(0, 100 - pasteAttempts * 5 - severeSignals * 8);

  // Score ponderado
  const score = Math.round(
    retention_strength * WEIGHTS.retention_strength +
      autonomy * WEIGHTS.autonomy +
      process_quality * WEIGHTS.process_quality,
  );

  // Banding
  let band: IRDResult['band'];
  if (score >= BANDS.durable) band = 'durable';
  else if (score >= BANDS.fragile) band = 'fragile';
  else if (score >= BANDS.shallow) band = 'shallow';
  else band = 'incomplete';

  return {
    score,
    components: {
      retention_strength: Math.round(retention_strength),
      autonomy: Math.round(autonomy),
      process_quality: Math.round(process_quality),
    },
    is_preliminary: transferTestScore === undefined,
    band,
    completion: { completed: completedSteps, total: totalSteps },
  };
}

// ============================================
// HELPERS DE PRESENTACIÓN
// ============================================

/**
 * Texto narrativo para presentar al alumno/profe sin números fríos.
 */
export function bandToNarrative(band: IRDResult['band']): {
  title: string;
  message: string;
  color: 'green' | 'amber' | 'red' | 'gray';
} {
  switch (band) {
    case 'durable':
      return {
        title: 'Aprendizaje durable',
        message: 'El conocimiento se ha consolidado bien. Es probable que recuerdes esto en 3 semanas.',
        color: 'green',
      };
    case 'fragile':
      return {
        title: 'Aprendizaje frágil',
        message:
          'Sabes lo suficiente para responder hoy, pero hay riesgo de olvido. Repasa con un transfer-test en 21 días.',
        color: 'amber',
      };
    case 'shallow':
      return {
        title: 'Aprendizaje superficial',
        message:
          'Pasaste el taller pero el conocimiento no está consolidado. Recomendamos un taller de nivelación.',
        color: 'red',
      };
    case 'incomplete':
    default:
      return {
        title: 'Aprendizaje incompleto',
        message:
          'No hay suficiente evidencia de aprendizaje. Es importante volver a explorar el material con apoyo.',
        color: 'gray',
      };
  }
}

/**
 * Helper para CSV-export: aplana los componentes en columnas.
 */
export function irdToCsvRow(
  studentAlias: string,
  workshopId: string,
  result: IRDResult,
): Record<string, string | number> {
  return {
    student_alias: studentAlias,
    workshop_id: workshopId,
    ird_score: result.score,
    band: result.band,
    retention_strength: result.components.retention_strength,
    autonomy: result.components.autonomy,
    process_quality: result.components.process_quality,
    is_preliminary: result.is_preliminary ? '1' : '0',
    completed_steps: result.completion.completed,
    total_steps: result.completion.total,
  };
}
