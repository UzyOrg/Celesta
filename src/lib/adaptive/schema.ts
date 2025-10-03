/**
 * Schema para el sistema de pre-taller adaptativo
 * Este es el "foso estratégico" que personaliza cada experiencia
 */

// ============================================
// 1. TIPOS DE PREGUNTAS DIAGNÓSTICAS
// ============================================

export type DiagnosticQuestionType = 
  | 'conocimiento_previo'      // ¿Qué tanto sabe del tema?
  | 'estilo_aprendizaje'       // ¿Cómo aprende mejor?
  | 'nivel_autonomia'          // ¿Cuánta guía necesita?
  | 'contexto_aplicacion';     // ¿Dónde aplicará esto?

export type DiagnosticQuestion = {
  id: string;
  tipo: DiagnosticQuestionType;
  pregunta: string;
  opciones: DiagnosticOption[];
  obligatoria?: boolean;
};

export type DiagnosticOption = {
  id: string;
  texto: string;
  peso: number;  // 0-100: bajo conocimiento = 0, alto = 100
  tags?: string[];  // Para clasificación adicional
};

// ============================================
// 2. PERFIL DEL ESTUDIANTE
// ============================================

export type StudentProfile = {
  sessionId: string;
  classToken: string;
  tallerId: string;
  
  // Diagnóstico
  conocimientoPrevio: number;  // 0-100
  estiloAprendizaje: string[];  // ['visual', 'hands-on', 'conceptual']
  nivelAutonomia: number;  // 0-100 (0 = necesita mucha guía, 100 = muy autónomo)
  contextoAplicacion?: string;
  
  // Metadata
  respuestasDiagnostico: Record<string, string>;  // questionId -> optionId
  timestamp: string;
};

// ============================================
// 3. REGLAS DE ADAPTACIÓN
// ============================================

export type AdaptationRule = {
  id: string;
  condicion: AdaptationCondition;
  accion: AdaptationAction;
  prioridad: number;  // Orden de aplicación
};

export type AdaptationCondition = {
  campo: keyof StudentProfile;
  operador: 'mayor_que' | 'menor_que' | 'igual_a' | 'contiene' | 'entre';
  valor: number | string | [number, number];
};

export type AdaptationAction = {
  tipo: 'ajustar_pistas' | 'modificar_pasos' | 'cambiar_feedback' | 'personalizar_instrucciones';
  parametros: Record<string, any>;
};

// ============================================
// 4. CONFIGURACIÓN DE TALLER ADAPTATIVO
// ============================================

export type AdaptiveWorkshopConfig = {
  tallerId: string;
  cuestionarioDiagnostico: DiagnosticQuestion[];
  reglasAdaptacion: AdaptationRule[];
  
  // Umbrales para personalización
  umbrales: {
    conocimientoAlto: number;      // ej: 70
    conocimientoBajo: number;      // ej: 30
    autonomiaAlta: number;         // ej: 70
    autonomiaBaja: number;         // ej: 30
  };
  
  // Estrategias de adaptación
  estrategias: {
    pistasAutomaticas?: boolean;   // ¿Mostrar pistas proactivamente?
    nivelComplejidadInicial?: 'basico' | 'intermedio' | 'avanzado';
    feedbackPersonalizado?: boolean;
    ejemplosContextualizados?: boolean;
  };
};

// ============================================
// 5. RESULTADO DE ADAPTACIÓN
// ============================================

export type AdaptationResult = {
  perfil: StudentProfile;
  ajustes: {
    pistasIniciales: number;           // Estrellas de autonomía iniciales (1-3)
    complejidadSugerida: 'basico' | 'intermedio' | 'avanzado';
    tipoFeedback: 'detallado' | 'moderado' | 'minimo';
    pasosOpcionales: string[];         // IDs de pasos que se pueden omitir
    contextoPersonalizado: string;     // Mensaje de bienvenida personalizado
  };
  reglasAplicadas: string[];  // IDs de reglas que se ejecutaron
};

// ============================================
// 6. HELPERS Y VALIDADORES
// ============================================

export function calcularConocimientoPrevio(
  respuestas: Record<string, string>,
  preguntas: DiagnosticQuestion[]
): number {
  const preguntasConocimiento = preguntas.filter(q => q.tipo === 'conocimiento_previo');
  if (preguntasConocimiento.length === 0) return 50; // Default medio

  let sumaTotal = 0;
  let count = 0;

  for (const pregunta of preguntasConocimiento) {
    const respuestaId = respuestas[pregunta.id];
    if (respuestaId) {
      const opcion = pregunta.opciones.find(o => o.id === respuestaId);
      if (opcion) {
        sumaTotal += opcion.peso;
        count++;
      }
    }
  }

  return count > 0 ? Math.round(sumaTotal / count) : 50;
}

export function calcularNivelAutonomia(
  respuestas: Record<string, string>,
  preguntas: DiagnosticQuestion[]
): number {
  const preguntasAutonomia = preguntas.filter(q => q.tipo === 'nivel_autonomia');
  if (preguntasAutonomia.length === 0) return 50;

  let sumaTotal = 0;
  let count = 0;

  for (const pregunta of preguntasAutonomia) {
    const respuestaId = respuestas[pregunta.id];
    if (respuestaId) {
      const opcion = pregunta.opciones.find(o => o.id === respuestaId);
      if (opcion) {
        sumaTotal += opcion.peso;
        count++;
      }
    }
  }

  return count > 0 ? Math.round(sumaTotal / count) : 50;
}

export function extraerEstiloAprendizaje(
  respuestas: Record<string, string>,
  preguntas: DiagnosticQuestion[]
): string[] {
  const preguntasEstilo = preguntas.filter(q => q.tipo === 'estilo_aprendizaje');
  const estilos = new Set<string>();

  for (const pregunta of preguntasEstilo) {
    const respuestaId = respuestas[pregunta.id];
    if (respuestaId) {
      const opcion = pregunta.opciones.find(o => o.id === respuestaId);
      if (opcion && opcion.tags) {
        opcion.tags.forEach(tag => estilos.add(tag));
      }
    }
  }

  return Array.from(estilos);
}

export function crearPerfilEstudiante(
  sessionId: string,
  classToken: string,
  tallerId: string,
  respuestas: Record<string, string>,
  preguntas: DiagnosticQuestion[]
): StudentProfile {
  return {
    sessionId,
    classToken,
    tallerId,
    conocimientoPrevio: calcularConocimientoPrevio(respuestas, preguntas),
    estiloAprendizaje: extraerEstiloAprendizaje(respuestas, preguntas),
    nivelAutonomia: calcularNivelAutonomia(respuestas, preguntas),
    contextoAplicacion: undefined,
    respuestasDiagnostico: respuestas,
    timestamp: new Date().toISOString(),
  };
}
