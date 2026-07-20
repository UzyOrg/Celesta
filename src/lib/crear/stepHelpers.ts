import { loadWorkshopProgress, type WorkshopProgress } from '@/lib/workshopState';
import { evalRule } from '@/lib/workshops/branch';
import type {
  CrearClassifierBranch,
  CrearInputMode,
  CrearPaso,
  CrearWorkshop,
} from './types';

export interface CrearBranchContext {
  rama: string;
  confianza: number;
}

export interface CrearChoiceOption {
  id: string;
  texto: string;
}

export function getStepId(step: CrearPaso): string {
  return step.ref_id ?? String(step.paso_numero);
}

export function getInputMode(step: CrearPaso): CrearInputMode {
  return step.crear?.input ?? 'none';
}

export function getPrompt(step: CrearPaso): string {
  if (step.tipo_paso === 'instruccion') return step.instruccion.texto;
  if (step.tipo_paso === 'pregunta_abierta_validada') return step.pregunta_abierta_validada.pregunta;
  if (step.tipo_paso === 'opcion_multiple') return step.opcion_multiple.pregunta;
  if (step.tipo_paso === 'transferencia') {
    return `${step.transferencia.escenario} ${step.transferencia.pregunta}`.trim();
  }
  return step.titulo_paso;
}

export function getPlaceholder(
  step: CrearPaso,
  transferPlaceholder: string
): string | undefined {
  if (step.tipo_paso === 'pregunta_abierta_validada') return step.pregunta_abierta_validada.placeholder;
  if (step.tipo_paso === 'transferencia') return transferPlaceholder;
  return undefined;
}

export function getChoices(step: CrearPaso): CrearChoiceOption[] {
  return step.tipo_paso === 'opcion_multiple' ? step.opcion_multiple.opciones : [];
}

export function getCorrectChoiceId(step: CrearPaso): string | null {
  return step.tipo_paso === 'opcion_multiple' ? step.opcion_multiple.respuesta_correcta : null;
}

export function findBranch(step: CrearPaso, branchId: string): CrearClassifierBranch | null {
  return step.crear?.classifier?.ramas.find((branch) => branch.rama === branchId) ?? null;
}

export function resolveNextRef(step: CrearPaso, ctx: CrearBranchContext): string | null {
  for (const branchRule of step.crear?.branchRules ?? []) {
    if (evalRule(branchRule.rule, ctx)) return branchRule.nextRefId;
  }
  return step.crear?.nextRefId ?? null;
}

export function makeProgress(
  lesson: CrearWorkshop,
  sessionId: string,
  stepIndex: number,
  completed: boolean
): WorkshopProgress {
  const existing = loadWorkshopProgress(sessionId, lesson.id_taller);
  return {
    taller_id: lesson.id_taller,
    student_session_id: sessionId,
    paso_actual: stepIndex,
    paso_states: existing?.paso_states ?? {},
    ultima_actualizacion: Date.now(),
    completado: completed,
  };
}
