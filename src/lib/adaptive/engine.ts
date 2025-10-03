/**
 * Motor de adaptación - El cerebro del foso estratégico
 * Toma el perfil del estudiante y genera ajustes personalizados
 */

import type {
  StudentProfile,
  AdaptiveWorkshopConfig,
  AdaptationResult,
  AdaptationRule,
  AdaptationCondition,
} from './schema';

// ============================================
// EVALUADOR DE CONDICIONES
// ============================================

function evaluarCondicion(perfil: StudentProfile, condicion: AdaptationCondition): boolean {
  const valor = perfil[condicion.campo];

  switch (condicion.operador) {
    case 'mayor_que':
      return typeof valor === 'number' && valor > (condicion.valor as number);
    
    case 'menor_que':
      return typeof valor === 'number' && valor < (condicion.valor as number);
    
    case 'igual_a':
      return valor === condicion.valor;
    
    case 'contiene':
      return Array.isArray(valor) && valor.includes(condicion.valor as string);
    
    case 'entre':
      if (typeof valor === 'number' && Array.isArray(condicion.valor)) {
        const [min, max] = condicion.valor;
        return valor >= min && valor <= max;
      }
      return false;
    
    default:
      return false;
  }
}

// ============================================
// APLICADOR DE REGLAS
// ============================================

function aplicarRegla(
  perfil: StudentProfile,
  regla: AdaptationRule,
  ajustesActuales: AdaptationResult['ajustes']
): AdaptationResult['ajustes'] {
  const { tipo, parametros } = regla.accion;
  const nuevosAjustes = { ...ajustesActuales };

  switch (tipo) {
    case 'ajustar_pistas':
      // DEPRECATED: Ya no se permite ajustar estrellas vía diagnóstico
      // Todos los estudiantes inician con 3 estrellas (mentalidad de crecimiento)
      // Esta acción se mantiene solo para compatibilidad retroactiva pero no tiene efecto
      console.warn('[adaptive] La acción "ajustar_pistas" está deprecada y será ignorada');
      break;

    case 'modificar_pasos':
      if (Array.isArray(parametros.omitir)) {
        nuevosAjustes.pasosOpcionales = [
          ...nuevosAjustes.pasosOpcionales,
          ...parametros.omitir,
        ];
      }
      break;

    case 'cambiar_feedback':
      if (parametros.nivel) {
        nuevosAjustes.tipoFeedback = parametros.nivel;
      }
      break;

    case 'personalizar_instrucciones':
      if (parametros.mensaje) {
        nuevosAjustes.contextoPersonalizado = parametros.mensaje;
      }
      break;
  }

  return nuevosAjustes;
}

// ============================================
// MOTOR PRINCIPAL
// ============================================

export function adaptarTaller(
  perfil: StudentProfile,
  config: AdaptiveWorkshopConfig
): AdaptationResult {
  // Inicializar ajustes base
  let ajustes: AdaptationResult['ajustes'] = {
    pistasIniciales: 3,  // Default: máxima autonomía
    complejidadSugerida: 'intermedio',
    tipoFeedback: 'moderado',
    pasosOpcionales: [],
    contextoPersonalizado: generarMensajeBienvenida(perfil),
  };

  const reglasAplicadas: string[] = [];

  // Ordenar reglas por prioridad (menor número = mayor prioridad)
  const reglasOrdenadas = [...config.reglasAdaptacion].sort((a, b) => a.prioridad - b.prioridad);

  // Aplicar cada regla si su condición se cumple
  for (const regla of reglasOrdenadas) {
    if (evaluarCondicion(perfil, regla.condicion)) {
      ajustes = aplicarRegla(perfil, regla, ajustes);
      reglasAplicadas.push(regla.id);
    }
  }

  // Aplicar heurísticas generales basadas en umbrales
  ajustes = aplicarHeuristicasGenerales(perfil, config, ajustes);

  return {
    perfil,
    ajustes,
    reglasAplicadas,
  };
}

// ============================================
// HEURÍSTICAS GENERALES
// ============================================

function aplicarHeuristicasGenerales(
  perfil: StudentProfile,
  config: AdaptiveWorkshopConfig,
  ajustesBase: AdaptationResult['ajustes']
): AdaptationResult['ajustes'] {
  const ajustes = { ...ajustesBase };
  const { umbrales } = config;

  // PEDAGOGÍA: Todos los estudiantes inician con 3 estrellas (mentalidad de crecimiento)
  // Las estrellas representan autonomía DEMOSTRADA, no predicha
  // El diagnóstico personaliza la experiencia (feedback, complejidad), pero NO penaliza
  ajustes.pistasIniciales = 3;

  // 1. Ajustar complejidad según conocimiento previo
  if (perfil.conocimientoPrevio >= umbrales.conocimientoAlto) {
    ajustes.complejidadSugerida = 'avanzado';
  } else if (perfil.conocimientoPrevio <= umbrales.conocimientoBajo) {
    ajustes.complejidadSugerida = 'basico';
  } else {
    ajustes.complejidadSugerida = 'intermedio';
  }

  // 3. Ajustar tipo de feedback
  if (perfil.conocimientoPrevio <= umbrales.conocimientoBajo) {
    ajustes.tipoFeedback = 'detallado';  // Más explicación
  } else if (perfil.conocimientoPrevio >= umbrales.conocimientoAlto) {
    ajustes.tipoFeedback = 'minimo';     // Solo lo necesario
  }

  return ajustes;
}

// ============================================
// GENERACIÓN DE MENSAJES PERSONALIZADOS
// ============================================

function generarMensajeBienvenida(perfil: StudentProfile): string {
  const { conocimientoPrevio, nivelAutonomia } = perfil;

  // Personalizar según nivel
  if (conocimientoPrevio >= 70) {
    return 'Veo que ya tienes una base sólida. Te he preparado desafíos que pondrán a prueba tu comprensión.';
  } else if (conocimientoPrevio <= 30) {
    return 'Te acompañaré paso a paso en este viaje de descubrimiento. No te preocupes, iremos a tu ritmo.';
  }

  // Personalizar según autonomía
  if (nivelAutonomia >= 70) {
    return 'Eres autónomo/a. Te daré el espacio para explorar, pero estaré aquí si me necesitas.';
  } else if (nivelAutonomia <= 30) {
    return 'Trabajaremos juntos en esto. Te guiaré en cada paso y te daré pistas cuando las necesites.';
  }

  return 'Bienvenido/a. He personalizado esta experiencia para ti. ¡Comencemos!';
}

// ============================================
// PERSISTENCIA DEL PERFIL
// ============================================

const STORAGE_KEY_PREFIX = 'celesta_profile_';

export function guardarPerfil(perfil: StudentProfile): void {
  if (typeof window === 'undefined') return;
  
  const key = `${STORAGE_KEY_PREFIX}${perfil.sessionId}_${perfil.tallerId}`;
  try {
    localStorage.setItem(key, JSON.stringify(perfil));
  } catch (err) {
    console.error('[adaptive] Error guardando perfil:', err);
  }
}

export function cargarPerfil(sessionId: string, tallerId: string): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  
  const key = `${STORAGE_KEY_PREFIX}${sessionId}_${tallerId}`;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[adaptive] Error cargando perfil:', err);
    return null;
  }
}

export function limpiarPerfil(sessionId: string, tallerId: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `${STORAGE_KEY_PREFIX}${sessionId}_${tallerId}`;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error('[adaptive] Error limpiando perfil:', err);
  }
}
