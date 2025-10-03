/**
 * Local-first workshop state management
 * Estado canónico en localStorage para offline-first resilience
 */

export type StepState = {
  intentos_fallidos: number;
  pistas_usadas: number;
  tiempo_inicio: number; // timestamp
  tiempo_total?: number; // segundos
  respuestas_incorrectas: any[];
  completado: boolean;
};

export type WorkshopProgress = {
  taller_id: string;
  student_session_id: string;
  paso_actual: number; // índice (0-based)
  estrellas_actuales: number;
  estrellas_iniciales: number;
  paso_states: Record<number, StepState>; // por índice de paso
  ultima_actualizacion: number; // timestamp
  completado: boolean;
};

const STORAGE_PREFIX = 'celesta:workshop_progress';

/**
 * Obtiene la clave de localStorage para un workshop específico
 */
function getStorageKey(sessionId: string, tallerId: string): string {
  return `${STORAGE_PREFIX}:${sessionId}:${tallerId}`;
}

/**
 * Guarda el progreso completo del workshop en localStorage
 */
export function saveWorkshopProgress(progress: WorkshopProgress): void {
  try {
    const key = getStorageKey(progress.student_session_id, progress.taller_id);
    const data = {
      ...progress,
      ultima_actualizacion: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('[workshopState] Error guardando progreso:', error);
  }
}

/**
 * Lee el progreso guardado de un workshop
 */
export function loadWorkshopProgress(
  sessionId: string,
  tallerId: string
): WorkshopProgress | null {
  try {
    const key = getStorageKey(sessionId, tallerId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const progress = JSON.parse(raw) as WorkshopProgress;
    
    // Validación básica
    if (progress.taller_id !== tallerId) return null;
    if (progress.student_session_id !== sessionId) return null;
    
    return progress;
  } catch (error) {
    console.error('[workshopState] Error cargando progreso:', error);
    return null;
  }
}

/**
 * Limpia el progreso de un workshop (útil después de completarlo)
 */
export function clearWorkshopProgress(sessionId: string, tallerId: string): void {
  try {
    const key = getStorageKey(sessionId, tallerId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[workshopState] Error limpiando progreso:', error);
  }
}

/**
 * Verifica si un workshop ya fue completado
 * PRIMARIO: Supabase (source of truth)
 * FALLBACK: localStorage (offline)
 */
export async function isWorkshopCompletedAsync(
  sessionId: string, 
  tallerId: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<boolean> {
  try {
    // 1. PRIMARIO: Verificar en Supabase
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('eventos_de_aprendizaje')
        .select('id')
        .eq('student_session_id', sessionId)
        .eq('taller_id', tallerId)
        .eq('verbo', 'taller_completado')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log('[workshopState] Workshop completado (verificado en Supabase)');
        return true;
      }
    }
  } catch (error) {
    console.log('[workshopState] Supabase no disponible, usando localStorage');
  }
  
  // 2. FALLBACK: localStorage (offline)
  try {
    const localCompleted = localStorage.getItem(`workshop_${tallerId}_completed`);
    if (localCompleted === 'true') {
      console.log('[workshopState] Workshop completado (verificado en localStorage)');
      return true;
    }
    
    const progress = loadWorkshopProgress(sessionId, tallerId);
    if (progress?.completado) {
      console.log('[workshopState] Workshop completado (verificado en progreso local)');
      return true;
    }
  } catch (error) {
    console.error('[workshopState] Error verificando localStorage:', error);
  }
  
  return false;
}

/**
 * Versión síncrona (solo localStorage) - DEPRECADA, usar isWorkshopCompletedAsync
 */
export function isWorkshopCompleted(sessionId: string, tallerId: string): boolean {
  try {
    const localCompleted = localStorage.getItem(`workshop_${tallerId}_completed`);
    if (localCompleted === 'true') return true;
    
    const progress = loadWorkshopProgress(sessionId, tallerId);
    if (progress?.completado) return true;
    
    return false;
  } catch (error) {
    console.error('[workshopState] Error verificando completado:', error);
    return false;
  }
}

/**
 * Marca un workshop como completado
 */
export function markWorkshopCompleted(sessionId: string, tallerId: string): void {
  try {
    // Marcar en el sistema legacy (compatibilidad)
    localStorage.setItem(`workshop_${tallerId}_completed`, 'true');
    
    // Actualizar el progreso
    const progress = loadWorkshopProgress(sessionId, tallerId);
    if (progress) {
      progress.completado = true;
      saveWorkshopProgress(progress);
    }
  } catch (error) {
    console.error('[workshopState] Error marcando completado:', error);
  }
}

/**
 * Inicializa el estado de un nuevo paso
 */
export function createStepState(): StepState {
  return {
    intentos_fallidos: 0,
    pistas_usadas: 0,
    tiempo_inicio: Date.now(),
    respuestas_incorrectas: [],
    completado: false,
  };
}

/**
 * Actualiza el estado de un paso específico
 */
export function updateStepState(
  progress: WorkshopProgress,
  stepIndex: number,
  updates: Partial<StepState>
): WorkshopProgress {
  const currentState = progress.paso_states[stepIndex] || createStepState();
  
  return {
    ...progress,
    paso_states: {
      ...progress.paso_states,
      [stepIndex]: {
        ...currentState,
        ...updates,
      },
    },
  };
}
