/**
 * STUDENT INSIGHTS - Tipos TypeScript
 * 
 * Define los tipos para el Student Insight Panel que muestra
 * el viaje de aprendizaje detallado de cada estudiante.
 */

/**
 * Evento completo_paso con toda la información de un paso completado
 */
export interface StepCompletionEvent {
  id: number;
  student_session_id: string;
  student_alias: string;
  class_token: string;
  taller_id: string;
  paso_id: string;
  verbo: 'completo_paso';
  result: StepResult;
  ts: string;
  client_ts?: string;
}

/**
 * Estructura del campo `result` en eventos completo_paso
 */
export interface StepResult {
  // Identificación del paso
  paso_id: string;
  paso_titulo?: string;
  
  // Métricas de esfuerzo
  intentos_fallidos: number;
  pistas_usadas: number;
  ayuda_andamio_usada: boolean;
  tiempo_en_paso_segundos: number;
  
  // Respuesta del estudiante
  respuesta_final: string | string[] | number; // Puede ser texto, array de opciones, o número
  es_correcta?: boolean;
  
  // Autonomía (estrellas)
  autonomia_estrellas?: number; // 1-5, solo en algunos pasos
  
  // Reflexión final (solo en paso de reflexión)
  reflexion_texto?: string;
  confianza_auto_evaluada?: number; // 1-5
  
  // Contexto adicional
  tipo_pregunta?: 'multiple_choice' | 'open_ended' | 'reflexion';
  opciones_mostradas?: string[];
}

/**
 * Métricas agregadas del viaje de aprendizaje completo
 */
export interface StudentJourneyMetrics {
  total_time_seconds: number;
  total_failed_attempts: number;
  total_hints_used: number;
  total_scaffolds_used: number;
  autonomy_stars: number;
  completion_date: string | null;
  total_steps: number;
}

/**
 * Respuesta completa del API /api/student/insights
 */
export interface StudentInsightsResponse {
  events: StepCompletionEvent[];
  metrics: StudentJourneyMetrics | null;
  student_alias: string;
  class_token: string;
  message?: string;
}
