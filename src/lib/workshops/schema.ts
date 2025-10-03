/**
 * Workshop schema types and a minimal runtime validator.
 * Matches fields used by components and example JSON under public/workshops/.
 */

// ============================================
// RECURSOS DEL SANTUARIO DEL CONOCIMIENTO
// ============================================

export type Recurso = {
  tipo: 'imagen' | 'texto' | 'video_embed';
  contenido: string;  // URL para imagen/video, markdown para texto
  descripcion: string;
  titulo?: string;
};

// ============================================
// PISTAS Y METADATA
// ============================================

export type Pista = {
    id: string;
    texto: string;
    costo?: number;
  };
  
  export type WorkshopMetadata = {
    grado?: string;
    materia?: string;
    competencias?: string[];
    duracion_estimada_min?: number;
  };
  
  type PasoBase = {
    paso_numero: number;
    ref_id?: string;
    tipo_paso:
      | 'instruccion'
      | 'observacion'
      | 'caza_errores'
      | 'ordenar_pasos'
      | 'confianza_reflexion'
      | 'prediccion'
      | 'pregunta_abierta_validada'
      | 'comparacion_experto'
      | 'reexplicacion'
      | 'transferencia'
      | 'opcion_multiple';
    titulo_paso: string;
    pistas?: Pista[];
    recursos_del_paso?: Recurso[];  // Nuevo: Santuario del Conocimiento
    bloquea_avance_si_falla?: boolean;
    puntaje?: number;
  };
  
  // Variantes de pasos
  
  export type PasoInstruccion = PasoBase & {
    tipo_paso: 'instruccion';
    instruccion: {
      texto: string;
    };
  };
  
  export type PasoObservacion = PasoBase & {
    tipo_paso: 'observacion';
    evidencia_texto: string;
    pregunta: string;
    validacion: {
      tipo: 'palabras_clave';
      criterio: string[];
      feedback_correcto?: string;
      feedback_incorrecto?: string;
    };
  };
  
  export type PasoCazaErrores = PasoBase & {
    tipo_paso: 'caza_errores';
    solucion_propuesta: string;
    fallas: { id: string; texto: string }[];
    correctas: string[];
    feedback_correcto?: string;
  };
  
  export type PasoOrdenarPasos = PasoBase & {
    tipo_paso: 'ordenar_pasos';
    items: string[];
    respuesta_correcta: number[];
  };
  
  export type PasoConfianzaReflexion = PasoBase & {
    tipo_paso: 'confianza_reflexion';
    pregunta: string;
    escala: number;
    pregunta_reflexion: string;
  };
  
  export type PasoPrediccion = PasoBase & {
    tipo_paso: 'prediccion';
    pregunta: string;
    opciones: { id: string; texto: string }[];
    requiere_explicacion?: boolean;
    placeholder_explicacion?: string;
  };
  
  export type PasoPreguntaAbiertaValidada = PasoBase & {
    tipo_paso: 'pregunta_abierta_validada';
    pregunta_abierta_validada: {
      pregunta: string;
      placeholder?: string;
      validacion: {
        tipo: 'palabras_clave';
        criterio: string[];
        feedback_correcto?: string;
        feedback_incorrecto?: string;
      };
      rescate?: {
        explicacion: string;
        costo: number;
        desde_intento?: number;
        desde_pistas?: number;
        titulo?: string;
        /** 
         * ID del Taller de Nivelación a activar cuando el estudiante falla.
         * Esto redirige al estudiante a un módulo remedial para reforzar conceptos.
         */
        activar_pre_taller?: string;
        /** 
         * DEPRECADO: Usar pregunta_de_aplicacion en su lugar.
         * Pregunta de comprensión para el Ciclo de Andamio Progresivo.
         */
        pregunta_comprension?: string;
        /**
         * Pregunta de aplicación (opción múltiple) para el Ciclo de Andamio Progresivo.
         * Después de mostrar la respuesta modelo, se presenta esta pregunta
         * para verificar que el estudiante puede APLICAR el conocimiento.
         */
        pregunta_de_aplicacion?: {
          pregunta: string;
          opciones: string[];
          respuesta_correcta: string;
        };
      };
    };
  };
  
  export type PasoComparacionExperto = PasoBase & {
    tipo_paso: 'comparacion_experto';
    comparacion_experto: {
      texto_experto: string;
      pregunta: string;
      checklist: { id: string; texto: string }[];
      min_checks?: number;
    };
    requiere_explicacion?: boolean;
  };
  
  export type PasoReexplicacion = PasoBase & {
    tipo_paso: 'reexplicacion';
    reexplicacion: {
      consigna: string;
      placeholder?: string;
      min_palabras?: number;
    };
  };
  
  export type PasoTransferencia = PasoBase & {
    tipo_paso: 'transferencia';
    transferencia: {
      escenario: string;
      pregunta: string;
      opciones: { id: string; texto: string }[];
      respuesta_correcta: string;
      feedback_correcto?: string;
      feedback_incorrecto?: string;
      requiere_explicacion?: boolean;
    };
  };
  
  // Variante usada por PasoOpcionMultiple.tsx (propiedad anidada opcion_multiple)
  export type PasoOpcionMultiple = PasoBase & {
    tipo_paso: 'opcion_multiple';
    opcion_multiple: {
      pregunta: string;
      opciones: { id: string; texto: string }[];
      respuesta_correcta: string;
      feedback_correcto: string;
      feedback_incorrecto: string;
      requiere_explicacion?: boolean;
    };
  };
  
  export type Paso =
    | PasoInstruccion
    | PasoObservacion
    | PasoCazaErrores
    | PasoOrdenarPasos
    | PasoConfianzaReflexion
    | PasoPrediccion
    | PasoPreguntaAbiertaValidada
    | PasoComparacionExperto
    | PasoReexplicacion
    | PasoTransferencia
    | PasoOpcionMultiple;
  
  export type Workshop = {
    id_taller: string;
    version?: string;
    schema_version?: string;
    content_version?: string;
    checksum?: string;
    titulo: string;
    metadata?: WorkshopMetadata;
    pasos: Paso[];
  };
  
  /**
   * Minimal validator: checks broad shape and fills reasonable defaults.
   * Throws if the input is structurally invalid.
   */
  export function validateWorkshopJson(input: unknown): Workshop {
    if (!input || typeof input !== 'object') {
      throw new Error('Workshop JSON: not an object');
    }
    const obj = input as any;
  
    if (typeof obj.id_taller !== 'string' || obj.id_taller.length === 0) {
      throw new Error('Workshop JSON: id_taller must be a non-empty string');
    }
    if (typeof obj.titulo !== 'string' || obj.titulo.length === 0) {
      throw new Error('Workshop JSON: titulo must be a non-empty string');
    }
    if (!Array.isArray(obj.pasos)) {
      throw new Error('Workshop JSON: pasos must be an array');
    }
    for (const p of obj.pasos) {
      if (!p || typeof p !== 'object') {
        throw new Error('Workshop JSON: each paso must be an object');
      }
      if (typeof p.tipo_paso !== 'string') {
        throw new Error('Workshop JSON: each paso must have tipo_paso');
      }
      if (typeof p.titulo_paso !== 'string') {
        throw new Error('Workshop JSON: each paso must have titulo_paso');
      }
    }
  
    // Defaults
    if (typeof obj.content_version !== 'string' || obj.content_version.length === 0) {
      obj.content_version = 'dev';
    }
  
    return obj as Workshop;
  }